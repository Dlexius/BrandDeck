import path from "node:path";
import JSZip from "jszip";

const PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const SLIDE_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide";
const CLONED_SLIDE_NUMBER_START = 1001;

const FORBIDDEN_PLACEHOLDER_PHRASES = [
  "Agenda item",
  "Click to add",
  "Lorem ipsum",
  "Go to the Chart Master Sheet",
  "This chart is a placeholder"
];

type Relationship = {
  id: string;
  type: string;
  target: string;
  targetMode?: string;
};

export type PptxPackageAudit = {
  schema: "branddeck.pptx-package-audit/v1";
  passed: boolean;
  referencedSlideCount: number;
  expectedClonedSlideCount: number;
  clonedSlideParts: string[];
  missingRelationshipTargetCount: number;
  missingRelationshipTargets: Array<{
    relsPart: string;
    relationshipId: string;
    target: string;
    resolvedTarget: string;
  }>;
  forbiddenPlaceholderHitCount: number;
  forbiddenPlaceholderHits: Array<{
    slidePart: string;
    phrase: string;
    count: number;
  }>;
};

function attr(xml: string, name: string) {
  const match = xml.match(new RegExp(`\\b${name}="([^"]*)"`));
  return match?.[1] ?? "";
}

function parseRelationships(xml?: string): Relationship[] {
  if (!xml || !xml.includes(PACKAGE_REL_NS)) {
    return [];
  }

  return Array.from(xml.matchAll(/<Relationship\b([^>]*)\/>/g)).map((match) => {
    const attrs = match[1] ?? "";

    return {
      id: attr(attrs, "Id"),
      type: attr(attrs, "Type"),
      target: attr(attrs, "Target"),
      targetMode: attr(attrs, "TargetMode")
    };
  });
}

function resolveRelationshipTarget(sourcePart: string, target: string) {
  if (target.startsWith("/")) {
    return target.slice(1);
  }

  return path.posix.normalize(path.posix.join(path.posix.dirname(sourcePart), target));
}

function relsPartToSourcePart(relsPart: string) {
  const fileName = path.posix.basename(relsPart).replace(/\.rels$/, "");
  return path.posix.join(path.posix.dirname(path.posix.dirname(relsPart)), fileName);
}

function countPhrase(text: string, phrase: string) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Array.from(text.matchAll(new RegExp(escaped, "gi"))).length;
}

async function referencedSlideParts(zip: JSZip) {
  const presentationXml = await zip.file("ppt/presentation.xml")?.async("string");
  const presentationRelsXml = await zip
    .file("ppt/_rels/presentation.xml.rels")
    ?.async("string");

  if (!presentationXml || !presentationRelsXml) {
    return [];
  }

  const relationships = parseRelationships(presentationRelsXml).filter(
    (relationship) => relationship.type === SLIDE_REL_TYPE
  );
  const byId = new Map(relationships.map((relationship) => [relationship.id, relationship]));
  const slideRelIds = Array.from(
    presentationXml.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/g)
  ).map((match) => match[1]);

  return slideRelIds
    .map((relId) => byId.get(relId))
    .filter((relationship): relationship is Relationship => Boolean(relationship))
    .map((relationship) =>
      resolveRelationshipTarget("ppt/presentation.xml", relationship.target)
    );
}

export async function auditPptxPackage(
  pptxBuffer: Buffer | Uint8Array,
  expectedClonedSlideCount: number
): Promise<PptxPackageAudit> {
  const zip = await JSZip.loadAsync(pptxBuffer);
  const slideParts = await referencedSlideParts(zip);
  const clonedSlideParts = slideParts.filter((part) =>
    /ppt\/slides\/slide\d+\.xml$/.test(part)
  );
  const expectedClonedParts = Array.from(
    { length: expectedClonedSlideCount },
    (_, index) => `ppt/slides/slide${CLONED_SLIDE_NUMBER_START + index}.xml`
  );
  const partsToCheck =
    clonedSlideParts.length === expectedClonedSlideCount
      ? clonedSlideParts
      : expectedClonedParts;

  const missingRelationshipTargets: PptxPackageAudit["missingRelationshipTargets"] = [];

  for (const slidePart of partsToCheck) {
    const relsPart = slidePart.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
    const relsXml = await zip.file(relsPart)?.async("string");
    const relationships = parseRelationships(relsXml);

    for (const relationship of relationships) {
      if (!relationship.target || relationship.targetMode === "External") {
        continue;
      }

      const resolvedTarget = resolveRelationshipTarget(
        relsPartToSourcePart(relsPart),
        relationship.target
      );

      if (!zip.file(resolvedTarget)) {
        missingRelationshipTargets.push({
          relsPart,
          relationshipId: relationship.id,
          target: relationship.target,
          resolvedTarget
        });
      }
    }
  }

  const forbiddenPlaceholderHits: PptxPackageAudit["forbiddenPlaceholderHits"] = [];

  for (const slidePart of partsToCheck) {
    const slideXml = await zip.file(slidePart)?.async("string");

    if (!slideXml) {
      continue;
    }

    for (const phrase of FORBIDDEN_PLACEHOLDER_PHRASES) {
      const count = countPhrase(slideXml, phrase);

      if (count > 0) {
        forbiddenPlaceholderHits.push({
          slidePart,
          phrase,
          count
        });
      }
    }
  }

  const missingRelationshipTargetCount = missingRelationshipTargets.length;
  const forbiddenPlaceholderHitCount = forbiddenPlaceholderHits.reduce(
    (sum, hit) => sum + hit.count,
    0
  );

  return {
    schema: "branddeck.pptx-package-audit/v1",
    passed:
      slideParts.length === expectedClonedSlideCount &&
      missingRelationshipTargetCount === 0 &&
      forbiddenPlaceholderHitCount === 0,
    referencedSlideCount: slideParts.length,
    expectedClonedSlideCount,
    clonedSlideParts: partsToCheck,
    missingRelationshipTargetCount,
    missingRelationshipTargets,
    forbiddenPlaceholderHitCount,
    forbiddenPlaceholderHits
  };
}
