import JSZip from "jszip";
import fs from "node:fs";
import path from "node:path";

/**
 * Brand-agnostic font embedding for coordinate exports.
 *
 * PptxGenJS cannot embed TrueType fonts, so decks rendered by the coordinate
 * renderer reference brand typefaces (for example "Inter Tight SemiBold")
 * that most client machines do not have installed. PowerPoint silently
 * substitutes another font and the export visually drifts off brand.
 *
 * This module copies the embedded font parts (`ppt/fonts/*.fntdata`) and the
 * `<p:embeddedFontLst>` declarations from an uploaded, approved template
 * package into a generated export package. It works for any brand template
 * that ships embedded fonts - nothing here is specific to one company.
 */

export type EmbeddedFontSlot = "regular" | "bold" | "italic" | "boldItalic";

export type TemplateEmbeddedFont = {
  typeface: string;
  slots: Partial<Record<EmbeddedFontSlot, string>>; // slot -> font part path inside the package
};

export type FontEmbedReport = {
  embedded: boolean;
  embeddedTypefaces: string[];
  skippedTypefaces: string[];
  reason?: string;
};

const FONT_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font";
const FONT_CONTENT_TYPE = "application/x-fontdata";

function relTargetToPackagePath(target: string) {
  // Targets in ppt/_rels/presentation.xml.rels are relative to ppt/
  return target.startsWith("/") ? target.slice(1) : `ppt/${target}`;
}

/**
 * Parse the embedded font declarations from a template package.
 */
export async function readTemplateEmbeddedFonts(
  templateBuffer: Buffer
): Promise<TemplateEmbeddedFont[]> {
  const zip = await JSZip.loadAsync(templateBuffer);
  const presentation = await zip.file("ppt/presentation.xml")?.async("string");
  const rels = await zip
    .file("ppt/_rels/presentation.xml.rels")
    ?.async("string");

  if (!presentation || !rels) {
    return [];
  }

  const relTargets = new Map<string, string>();
  for (const match of rels.matchAll(
    /<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/>/g
  )) {
    relTargets.set(match[1], match[2]);
  }

  const fonts: TemplateEmbeddedFont[] = [];
  const fontBlocks = presentation.match(
    /<p:embeddedFont>[\s\S]*?<\/p:embeddedFont>/g
  );

  for (const block of fontBlocks ?? []) {
    const typeface = block.match(/<p:font[^>]*typeface="([^"]+)"/)?.[1];
    if (!typeface) {
      continue;
    }

    const slots: TemplateEmbeddedFont["slots"] = {};
    for (const slot of ["regular", "bold", "italic", "boldItalic"] as const) {
      const rId = block.match(
        new RegExp(`<p:${slot}\\b[^>]*r:id="([^"]+)"`)
      )?.[1];
      const target = rId ? relTargets.get(rId) : undefined;
      if (target) {
        slots[slot] = relTargetToPackagePath(target);
      }
    }

    if (Object.keys(slots).length > 0) {
      fonts.push({ typeface, slots });
    }
  }

  return fonts;
}

function nextRelationshipId(relsXml: string) {
  let max = 0;
  for (const match of relsXml.matchAll(/Id="rId(\d+)"/g)) {
    max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

function ensureFontContentType(contentTypesXml: string) {
  if (/Extension="fntdata"/i.test(contentTypesXml)) {
    return contentTypesXml;
  }

  return contentTypesXml.replace(
    "</Types>",
    `<Default Extension="fntdata" ContentType="${FONT_CONTENT_TYPE}"/></Types>`
  );
}

function insertEmbeddedFontList(presentationXml: string, fontListXml: string) {
  let xml = presentationXml.replace(
    /<p:embeddedFontLst>[\s\S]*?<\/p:embeddedFontLst>/,
    ""
  );

  // Per ECMA-376, embeddedFontLst follows notesSz inside p:presentation.
  const notesSz = xml.match(/<p:notesSz[^>]*\/>|<p:notesSz[\s\S]*?<\/p:notesSz>/);
  if (notesSz) {
    xml = xml.replace(notesSz[0], `${notesSz[0]}${fontListXml}`);
  } else {
    const sldSz = xml.match(/<p:sldSz[^>]*\/>/);
    if (!sldSz) {
      throw new Error(
        "Export package presentation.xml is missing slide size markup."
      );
    }
    xml = xml.replace(sldSz[0], `${sldSz[0]}${fontListXml}`);
  }

  if (!/<p:presentation[^>]*\bembedTrueTypeFonts=/.test(xml)) {
    xml = xml.replace(/<p:presentation\b/, '<p:presentation embedTrueTypeFonts="1"');
  }

  return xml;
}

/**
 * Copy approved embedded fonts from a template package into an export package.
 *
 * @param exportBuffer   the generated PPTX (coordinate renderer output)
 * @param templateBuffer the uploaded, fingerprinted template package
 * @param approvedTypefaces typefaces allowed by the active brand contract;
 *   only template fonts matching this list are embedded. Pass an empty list
 *   to embed every font the template ships.
 */
export async function embedTemplateFonts(
  exportBuffer: Buffer,
  templateBuffer: Buffer,
  approvedTypefaces: string[]
): Promise<{ buffer: Buffer; report: FontEmbedReport }> {
  const templateFonts = await readTemplateEmbeddedFonts(templateBuffer);

  if (templateFonts.length === 0) {
    return {
      buffer: exportBuffer,
      report: {
        embedded: false,
        embeddedTypefaces: [],
        skippedTypefaces: [],
        reason: "The template package does not contain embedded fonts."
      }
    };
  }

  const approved = new Set(approvedTypefaces.map((name) => name.toLowerCase()));
  const selected =
    approved.size === 0
      ? templateFonts
      : templateFonts.filter((font) => approved.has(font.typeface.toLowerCase()));
  const skipped = templateFonts
    .filter((font) => !selected.includes(font))
    .map((font) => font.typeface);

  if (selected.length === 0) {
    return {
      buffer: exportBuffer,
      report: {
        embedded: false,
        embeddedTypefaces: [],
        skippedTypefaces: skipped,
        reason:
          "None of the template's embedded fonts match the brand contract's approved fonts."
      }
    };
  }

  const templateZip = await JSZip.loadAsync(templateBuffer);
  const exportZip = await JSZip.loadAsync(exportBuffer);

  const relsPath = "ppt/_rels/presentation.xml.rels";
  const presentationPath = "ppt/presentation.xml";
  let relsXml = await exportZip.file(relsPath)?.async("string");
  let presentationXml = await exportZip.file(presentationPath)?.async("string");

  if (!relsXml || !presentationXml) {
    return {
      buffer: exportBuffer,
      report: {
        embedded: false,
        embeddedTypefaces: [],
        skippedTypefaces: skipped,
        reason: "Export package is missing presentation parts."
      }
    };
  }

  let relId = nextRelationshipId(relsXml);
  const newRels: string[] = [];
  const fontEntries: string[] = [];
  const copiedParts = new Set<string>();

  for (const font of selected) {
    const slotXml: string[] = [];

    for (const [slot, partPath] of Object.entries(font.slots)) {
      const part = templateZip.file(partPath);
      if (!part) {
        continue;
      }

      if (!copiedParts.has(partPath)) {
        exportZip.file(partPath, await part.async("nodebuffer"));
        copiedParts.add(partPath);
      }

      const id = `rId${relId++}`;
      const relTarget = partPath.replace(/^ppt\//, "");
      newRels.push(
        `<Relationship Id="${id}" Type="${FONT_REL_TYPE}" Target="${relTarget}"/>`
      );
      slotXml.push(`<p:${slot} r:id="${id}"/>`);
    }

    if (slotXml.length > 0) {
      fontEntries.push(
        `<p:embeddedFont><p:font typeface="${font.typeface}"/>${slotXml.join("")}</p:embeddedFont>`
      );
    }
  }

  if (fontEntries.length === 0) {
    return {
      buffer: exportBuffer,
      report: {
        embedded: false,
        embeddedTypefaces: [],
        skippedTypefaces: skipped,
        reason: "Template font parts could not be read from the package."
      }
    };
  }

  relsXml = relsXml.replace("</Relationships>", `${newRels.join("")}</Relationships>`);
  presentationXml = insertEmbeddedFontList(
    presentationXml,
    `<p:embeddedFontLst>${fontEntries.join("")}</p:embeddedFontLst>`
  );

  const contentTypesPath = "[Content_Types].xml";
  const contentTypes = await exportZip.file(contentTypesPath)?.async("string");
  if (contentTypes) {
    exportZip.file(contentTypesPath, ensureFontContentType(contentTypes));
  }

  exportZip.file(relsPath, relsXml);
  exportZip.file(presentationPath, presentationXml);

  const buffer = await exportZip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE"
  });

  return {
    buffer: Buffer.from(buffer),
    report: {
      embedded: true,
      embeddedTypefaces: selected.map((font) => font.typeface),
      skippedTypefaces: skipped
    }
  };
}

/**
 * Flatten a brand contract's approved font lists into typeface names that can
 * be matched against template embedded fonts.
 */
export function approvedTypefacesFromContract(contract: {
  approved_fonts?: Record<string, string[]>;
}): string[] {
  const fonts = contract.approved_fonts ?? {};
  return [...new Set(Object.values(fonts).flat())];
}

export type ContractEmbeddedFonts = Record<
  string,
  Partial<Record<EmbeddedFontSlot, string>>
>;

/**
 * Embed brand fonts shipped with the brand kit itself (files under public/),
 * for brands whose approved template has not been uploaded in this session.
 * Font files use the same .fntdata format PowerPoint embeds, so any brand can
 * provide them by listing typeface -> slot -> public path in its contract.
 */
export async function embedContractFonts(
  exportBuffer: Buffer,
  embeddedFonts: ContractEmbeddedFonts
): Promise<{ buffer: Buffer; report: FontEmbedReport }> {
  const entries = Object.entries(embeddedFonts ?? {});

  if (entries.length === 0) {
    return {
      buffer: exportBuffer,
      report: {
        embedded: false,
        embeddedTypefaces: [],
        skippedTypefaces: [],
        reason: "The brand contract does not declare embedded font files."
      }
    };
  }

  const exportZip = await JSZip.loadAsync(exportBuffer);
  const relsPath = "ppt/_rels/presentation.xml.rels";
  const presentationPath = "ppt/presentation.xml";
  let relsXml = await exportZip.file(relsPath)?.async("string");
  let presentationXml = await exportZip.file(presentationPath)?.async("string");

  if (!relsXml || !presentationXml) {
    return {
      buffer: exportBuffer,
      report: {
        embedded: false,
        embeddedTypefaces: [],
        skippedTypefaces: entries.map(([typeface]) => typeface),
        reason: "Export package is missing presentation parts."
      }
    };
  }

  let relId = nextRelationshipId(relsXml);
  const newRels: string[] = [];
  const fontEntries: string[] = [];
  const embeddedTypefaces: string[] = [];
  const skippedTypefaces: string[] = [];
  let fontIndex = 1;

  for (const [typeface, slots] of entries) {
    const slotXml: string[] = [];

    for (const [slot, publicPath] of Object.entries(slots)) {
      if (!publicPath) {
        continue;
      }
      const filePath = path.join(
        process.cwd(),
        "public",
        publicPath.replace(/^\//, "")
      );
      if (!fs.existsSync(filePath)) {
        continue;
      }
      const partPath = `ppt/fonts/font${fontIndex}.fntdata`;
      fontIndex += 1;
      exportZip.file(partPath, fs.readFileSync(filePath));

      const id = `rId${relId++}`;
      newRels.push(
        `<Relationship Id="${id}" Type="${FONT_REL_TYPE}" Target="${partPath.replace(/^ppt\//, "")}"/>`
      );
      slotXml.push(`<p:${slot} r:id="${id}"/>`);
    }

    if (slotXml.length > 0) {
      fontEntries.push(
        `<p:embeddedFont><p:font typeface="${typeface}"/>${slotXml.join("")}</p:embeddedFont>`
      );
      embeddedTypefaces.push(typeface);
    } else {
      skippedTypefaces.push(typeface);
    }
  }

  if (fontEntries.length === 0) {
    return {
      buffer: exportBuffer,
      report: {
        embedded: false,
        embeddedTypefaces: [],
        skippedTypefaces,
        reason: "No declared brand font files were found on disk."
      }
    };
  }

  relsXml = relsXml.replace(
    "</Relationships>",
    `${newRels.join("")}</Relationships>`
  );
  presentationXml = insertEmbeddedFontList(
    presentationXml,
    `<p:embeddedFontLst>${fontEntries.join("")}</p:embeddedFontLst>`
  );

  const contentTypesPath = "[Content_Types].xml";
  const contentTypes = await exportZip.file(contentTypesPath)?.async("string");
  if (contentTypes) {
    exportZip.file(contentTypesPath, ensureFontContentType(contentTypes));
  }

  exportZip.file(relsPath, relsXml);
  exportZip.file(presentationPath, presentationXml);

  const buffer = await exportZip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE"
  });

  return {
    buffer: Buffer.from(buffer),
    report: { embedded: true, embeddedTypefaces, skippedTypefaces }
  };
}
