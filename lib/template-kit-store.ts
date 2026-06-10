import crypto from "node:crypto";
import path from "node:path";
import JSZip from "jszip";
import { readImageDimensions } from "@/lib/brand-asset-store";
import {
  readRuntimeBuffer,
  readRuntimeJson,
  writeRuntimeBuffer,
  writeRuntimeJson
} from "@/lib/local-runtime-store";
import {
  APPROVED_LAYOUT_IDS,
  type ApprovedLayoutId,
  type DeckPlan
} from "@/lib/deck-plan-schema";
import { getDeckRecipe } from "@/lib/deck-recipes";
import { BUILT_IN_BINDING_TEMPLATE_FINGERPRINTS } from "@/lib/template-object-binding-store";

export type TemplateKitAsset = {
  entry: string;
  extension: string;
  mimeType: string;
  bytes: number;
  fingerprint: string;
  width?: number;
  height?: number;
};

export type TemplateSourceSlide = {
  sourceSlide: number;
  slideEntry: string;
  layoutEntry?: string;
  layoutName?: string;
  textPreview: string;
};

export type TemplateFrameMapping = {
  layoutId: ApprovedLayoutId;
  outputSlide: number;
  sourceSlide: number;
  templateVariantKey?: string;
  narrativeRole: string;
  reuseMode: "duplicate-slide";
  confidence: number;
  evidence: string[];
  editTargets: string[];
};

export type TemplateFrameMapOverride = {
  layoutId: ApprovedLayoutId;
  sourceSlide: number;
};

export type TemplateFrameMap = {
  mode: "template-following";
  rendererIntent: "clone-edit";
  outputSlides: TemplateFrameMapping[];
  omittedSourceSlides: Array<{
    sourceSlide: number;
    reason: string;
  }>;
  approval: {
    status: "suggested" | "approved";
    mappingFingerprint: string;
    approvedAt?: string;
    approvedBy?: string;
  };
};

export type TemplateFrameMapArtifact = {
  schema: "branddeck.template-frame-map/v1";
  templateKitId: string;
  templateName: string;
  templateFingerprint: string;
  generatedAt: string;
  mode: "template-following";
  rendererIntent: "clone-edit";
  outputSlides: Array<{
    outputSlide: number;
    sourceSlide: number;
    templateVariantKey?: string;
    layoutId: ApprovedLayoutId;
    narrativeRole: string;
    reuseMode: "duplicate-slide";
    confidence: number;
    evidence: string[];
    editTargets: string[];
  }>;
  omittedSourceSlides: TemplateFrameMap["omittedSourceSlides"];
  validation: {
    passed: boolean;
    coverage: string;
    minimumConfidence: number;
    unmappedOutputSlides: number[];
    lowConfidenceOutputSlides: number[];
  };
};

export type TemplateKit = {
  id: string;
  templateName: string;
  fingerprint: string;
  createdAt: string;
  bytes: number;
  slideCount: number;
  layoutCount: number;
  masterCount: number;
  mediaCount: number;
  imageCount: number;
  detectedFonts: string[];
  detectedColors: string[];
  topAssets: TemplateKitAsset[];
  sourceSlides: TemplateSourceSlide[];
  frameMap: TemplateFrameMap;
  driftGuards: {
    templateFingerprintLocked: boolean;
    frameMapRequired: boolean;
    cloneEditPreferred: boolean;
    approvedLayoutsRequired: boolean;
    deterministicRendererRequired: boolean;
    aiDesignDisabled: boolean;
  };
  buffer: Buffer;
};

type TemplateKitSummary = Omit<TemplateKit, "buffer">;

const TEMPLATE_KIT_LIMIT = 8;
const TEMPLATE_KIT_GLOBAL_KEY = Symbol.for("branddeck.templateKits");

type TemplateKitGlobal = {
  kits: Map<string, TemplateKit>;
  hydrated: boolean;
};

type PersistedTemplateKit = Omit<TemplateKit, "buffer"> & {
  bufferFile: string;
};

function getGlobalStore() {
  const globalWithKits = globalThis as typeof globalThis & {
    [TEMPLATE_KIT_GLOBAL_KEY]?: TemplateKitGlobal;
  };

  if (!globalWithKits[TEMPLATE_KIT_GLOBAL_KEY]) {
    globalWithKits[TEMPLATE_KIT_GLOBAL_KEY] = {
      kits: new Map(),
      hydrated: false
    };
  }

  const store = globalWithKits[TEMPLATE_KIT_GLOBAL_KEY];

  if (!store.hydrated) {
    hydrateTemplateKits(store);
  }

  return store;
}

function hydrateTemplateKits(store: TemplateKitGlobal) {
  const persisted = readRuntimeJson<PersistedTemplateKit[]>(
    "template-kits.json",
    []
  );
  const kits = persisted.flatMap((kit): TemplateKit[] => {
    try {
      const { bufferFile, ...summary } = kit;

      return [
        {
          ...summary,
          buffer: readRuntimeBuffer(bufferFile)
        }
      ];
    } catch {
      return [];
    }
  });

  store.kits = new Map(kits.map((kit) => [kit.id, kit]));
  store.hydrated = true;
}

function persistTemplateKits(store: TemplateKitGlobal) {
  const persisted = Array.from(store.kits.values()).map((kit) => {
    const { buffer, ...summary } = kit;
    const bufferFile = `template-kits/${kit.id}.pptx`;

    writeRuntimeBuffer(bufferFile, buffer);

    return {
      ...summary,
      bufferFile
    };
  });

  writeRuntimeJson("template-kits.json", persisted);
}

function fileEntries(zip: JSZip) {
  return Object.keys(zip.files).filter((name) => !zip.files[name]?.dir);
}

function uniqueSorted(values: Iterable<string>, limit: number) {
  return Array.from(new Set(values))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, limit);
}

function decodeXmlText(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

async function readXml(zip: JSZip, entry: string) {
  const file = zip.file(entry);
  return file ? file.async("string") : "";
}

function slideNumberFromEntry(entry: string) {
  const match = entry.match(/slide(\d+)\.xml$/);
  return match ? Number(match[1]) : 0;
}

function extractSlideText(xml: string) {
  const parts: string[] = [];
  for (const match of xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)) {
    parts.push(decodeXmlText(match[1]).trim());
  }

  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function extractLayoutName(xml: string) {
  const match = xml.match(/<p:cSld[^>]*\bname="([^"]+)"/);
  return match ? decodeXmlText(match[1]) : undefined;
}

function extractLayoutEntry(relsXml: string) {
  const match = relsXml.match(
    /Type="[^"]+\/slideLayout"[^>]*Target="(?:\.\.\/)?slideLayouts\/(slideLayout\d+\.xml)"/
  );

  return match ? `ppt/slideLayouts/${match[1]}` : undefined;
}

async function buildSourceSlides(zip: JSZip, entries: string[]) {
  const slideEntries = entries
    .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/.test(entry))
    .sort((a, b) => slideNumberFromEntry(a) - slideNumberFromEntry(b));

  return Promise.all(
    slideEntries.map(async (slideEntry) => {
      const sourceSlide = slideNumberFromEntry(slideEntry);
      const slideXml = await readXml(zip, slideEntry);
      const relsXml = await readXml(
        zip,
        `ppt/slides/_rels/slide${sourceSlide}.xml.rels`
      );
      const layoutEntry = extractLayoutEntry(relsXml);
      const layoutName = layoutEntry
        ? extractLayoutName(await readXml(zip, layoutEntry))
        : undefined;

      return {
        sourceSlide,
        slideEntry,
        layoutEntry,
        layoutName,
        textPreview: extractSlideText(slideXml).slice(0, 180)
      };
    })
  );
}

async function detectFonts(zip: JSZip, entries: string[]) {
  const xmlEntries = entries.filter((entry) =>
    /^ppt\/(theme|slideMasters|slideLayouts|slides)\//.test(entry)
  );
  const fonts: string[] = [];

  await Promise.all(
    xmlEntries.map(async (entry) => {
      const xml = await readXml(zip, entry);
      for (const match of xml.matchAll(/\btypeface="([^"]+)"/g)) {
        fonts.push(match[1]);
      }
    })
  );

  return uniqueSorted(fonts, 12);
}

async function detectColors(zip: JSZip, entries: string[]) {
  const xmlEntries = entries.filter((entry) =>
    /^ppt\/(theme|slideMasters|slideLayouts|slides)\//.test(entry)
  );
  const colors: string[] = [];

  await Promise.all(
    xmlEntries.map(async (entry) => {
      const xml = await readXml(zip, entry);
      for (const match of xml.matchAll(/\b(?:srgbClr val|lastClr)="([0-9A-Fa-f]{6})"/g)) {
        colors.push(`#${match[1].toUpperCase()}`);
      }
    })
  );

  return uniqueSorted(colors, 16);
}

async function summarizeAssets(zip: JSZip, mediaEntries: string[]) {
  const assets = await Promise.all(
    mediaEntries.map(async (entry) => {
      const file = zip.file(entry);
      const data = file ? await file.async("nodebuffer") : Buffer.alloc(0);
      const extension = path.extname(entry).replace(".", "").toLowerCase();
      const mimeType =
        extension === "png"
          ? "image/png"
          : extension === "jpg" || extension === "jpeg"
            ? "image/jpeg"
            : extension === "svg"
              ? "image/svg+xml"
              : "application/octet-stream";

      return {
        entry,
        extension,
        mimeType,
        bytes: data.length,
        fingerprint: crypto.createHash("sha256").update(data).digest("hex"),
        ...readImageDimensions(data, mimeType)
      };
    })
  );

  return assets.sort((a, b) => b.bytes - a.bytes).slice(0, 12);
}

const FRAME_MAP_RULES: Record<
  ApprovedLayoutId,
  {
    narrativeRole: string;
    positiveTerms: string[];
    layoutTerms: string[];
    preferredSourceSlides: number[];
  }
> = {
  title_client_report: {
    narrativeRole: "opening title",
    positiveTerms: ["presentation title", "title here", "optional eyebrow"],
    layoutTerms: ["blank_2_1_2", "title"],
    preferredSourceSlides: [11]
  },
  agenda: {
    narrativeRole: "agenda",
    positiveTerms: ["agenda item", "agenda"],
    layoutTerms: ["agenda"],
    preferredSourceSlides: [15]
  },
  statement: {
    narrativeRole: "framing statement",
    positiveTerms: ["our goal", "goal for you", "big statement", "quote"],
    layoutTerms: ["statement", "quote", "dark"],
    preferredSourceSlides: []
  },
  photo_section_divider: {
    narrativeRole: "photo section divider",
    positiveTerms: ["section title", "divider", "chapter", "photo"],
    layoutTerms: ["section", "divider", "photo", "image"],
    preferredSourceSlides: []
  },
  executive_summary: {
    narrativeRole: "executive summary",
    positiveTerms: ["simple text slide", "bullet one", "optional descriptive"],
    layoutTerms: ["simple", "section"],
    preferredSourceSlides: [31]
  },
  adoption_kpi_scorecard: {
    narrativeRole: "kpi scorecard",
    positiveTerms: ["section title", "slide headline", "lorem ipsum"],
    layoutTerms: ["card", "section"],
    preferredSourceSlides: [40]
  },
  usage_trend: {
    narrativeRole: "usage trend",
    positiveTerms: ["line graph context", "chart master", "category"],
    layoutTerms: ["graph", "chart"],
    preferredSourceSlides: [132]
  },
  feature_adoption: {
    narrativeRole: "feature adoption",
    positiveTerms: ["bar graph", "table", "chart"],
    layoutTerms: ["chart", "table"],
    preferredSourceSlides: [136, 135]
  },
  risks_recommendations: {
    narrativeRole: "risks and recommendations",
    positiveTerms: ["icon", "section title", "step-through"],
    layoutTerms: ["icon", "text"],
    preferredSourceSlides: [75, 76]
  },
  action_plan_table: {
    narrativeRole: "action plan table",
    positiveTerms: ["table", "status", "owner", "plan", "timeline"],
    layoutTerms: ["table"],
    preferredSourceSlides: []
  },
  next_steps: {
    narrativeRole: "next steps",
    positiveTerms: ["step-through slide", "section title"],
    layoutTerms: ["step", "card"],
    preferredSourceSlides: [80]
  }
};

type ApprovedTemplateVariant = {
  sourceSlide: number;
  narrativeRole: string;
  confidence: number;
  evidence: string[];
};

const BUILT_IN_TEMPLATE_VARIANTS: Partial<
  Record<ApprovedLayoutId, Record<string, ApprovedTemplateVariant>>
> = {
  title_client_report: {
    cover_split: {
      sourceSlide: 8,
      narrativeRole: "opening title with split visual",
      confidence: 100,
      evidence: ["approved_variant:cover_split"]
    },
    cover_minimal: {
      sourceSlide: 10,
      narrativeRole: "opening title with minimal visual",
      confidence: 100,
      evidence: ["approved_variant:cover_minimal"]
    },
    cover_default: {
      sourceSlide: 11,
      narrativeRole: "opening title",
      confidence: 100,
      evidence: ["approved_variant:cover_default"]
    },
    cover_image_band: {
      sourceSlide: 12,
      narrativeRole: "opening title with image band",
      confidence: 100,
      evidence: ["approved_variant:cover_image_band"]
    }
  },
  executive_summary: {
    summary_list_2col: {
      sourceSlide: 30,
      narrativeRole: "executive summary list",
      confidence: 100,
      evidence: ["approved_variant:summary_list_2col"]
    }
  },
  adoption_kpi_scorecard: {
    kpi_point_summary: {
      sourceSlide: 41,
      narrativeRole: "kpi point summary",
      confidence: 100,
      evidence: ["approved_variant:kpi_point_summary"]
    },
    kpi_category_summary: {
      sourceSlide: 42,
      narrativeRole: "kpi category summary",
      confidence: 100,
      evidence: ["approved_variant:kpi_category_summary"]
    }
  },
  usage_trend: {
    trend_stacked_chart: {
      sourceSlide: 129,
      narrativeRole: "usage trend with stacked chart frame",
      confidence: 100,
      evidence: ["approved_variant:trend_stacked_chart"]
    }
  },
  feature_adoption: {
    feature_table_alt: {
      sourceSlide: 135,
      narrativeRole: "feature adoption table alternate",
      confidence: 100,
      evidence: ["approved_variant:feature_table_alt"]
    }
  },
  risks_recommendations: {
    risk_actions_3up: {
      sourceSlide: 75,
      narrativeRole: "risks and recommendations",
      confidence: 100,
      evidence: ["approved_variant:risk_actions_3up"]
    },
    risk_actions_3up_alt: {
      sourceSlide: 76,
      narrativeRole: "risk remediation actions",
      confidence: 100,
      evidence: ["approved_variant:risk_actions_3up_alt"]
    }
  },
  next_steps: {
    step_through_1: {
      sourceSlide: 78,
      narrativeRole: "step-through actions",
      confidence: 100,
      evidence: ["approved_variant:step_through_1"]
    },
    step_through_2: {
      sourceSlide: 79,
      narrativeRole: "step-through decisions",
      confidence: 100,
      evidence: ["approved_variant:step_through_2"]
    },
    step_through_3: {
      sourceSlide: 80,
      narrativeRole: "step-through source notes",
      confidence: 100,
      evidence: ["approved_variant:step_through_3"]
    }
  }
};

function recipeVariantKeyForSlide(
  deckPlan: DeckPlan | undefined,
  index: number,
  layoutId: ApprovedLayoutId
) {
  if (!deckPlan?.deck_recipe_id) {
    return undefined;
  }

  const recipe = getDeckRecipe(deckPlan.deck_recipe_id);
  const recipeSlide = recipe?.slide_sequence[index];

  if (!recipeSlide || recipeSlide.layout_id !== layoutId) {
    return undefined;
  }

  return recipeSlide.template_variant_key;
}

function applyBuiltInTemplateVariant({
  kit,
  layoutId,
  variantKey,
  fallback
}: {
  kit: TemplateKit;
  layoutId: ApprovedLayoutId;
  variantKey?: string;
  fallback?: TemplateFrameMapping;
}) {
  if (!variantKey || !BUILT_IN_BINDING_TEMPLATE_FINGERPRINTS.has(kit.fingerprint)) {
    return fallback;
  }

  const variant = BUILT_IN_TEMPLATE_VARIANTS[layoutId]?.[variantKey];

  if (!variant) {
    return fallback;
  }

  const sourceSlideExists = kit.sourceSlides.some(
    (slide) => slide.sourceSlide === variant.sourceSlide
  );

  if (!sourceSlideExists) {
    return fallback;
  }

  return {
    layoutId,
    outputSlide: fallback?.outputSlide ?? 0,
    sourceSlide: variant.sourceSlide,
    templateVariantKey: variantKey,
    narrativeRole: variant.narrativeRole,
    reuseMode: "duplicate-slide" as const,
    confidence: variant.confidence,
    evidence: variant.evidence,
    editTargets: fallback?.editTargets ?? []
  };
}

function scoreSourceSlide(
  slide: TemplateSourceSlide,
  rule: (typeof FRAME_MAP_RULES)[ApprovedLayoutId]
) {
  const text = slide.textPreview.toLowerCase();
  const layoutName = slide.layoutName?.toLowerCase() ?? "";
  const evidence: string[] = [];
  let score = 0;

  for (const term of rule.positiveTerms) {
    if (text.includes(term)) {
      score += 3;
      evidence.push(`text:${term}`);
    }
  }

  for (const term of rule.layoutTerms) {
    if (layoutName.includes(term)) {
      score += 2;
      evidence.push(`layout:${term}`);
    }
  }

  const preferredIndex = rule.preferredSourceSlides.indexOf(slide.sourceSlide);
  if (preferredIndex >= 0) {
    score += 10 - preferredIndex;
    evidence.push(`preferred:${slide.sourceSlide}`);
  }

  return { score, evidence };
}

function inferTemplateFrameMap(sourceSlides: TemplateSourceSlide[]) {
  const selected = new Set<number>();
  const outputSlides = APPROVED_LAYOUT_IDS.map((layoutId, index) => {
    const rule = FRAME_MAP_RULES[layoutId];
    const ranked = sourceSlides
      .map((slide) => ({
        slide,
        ...scoreSourceSlide(slide, rule)
      }))
      .sort((a, b) => b.score - a.score || a.slide.sourceSlide - b.slide.sourceSlide);
    const best = ranked[0];
    const sourceSlide = best?.slide.sourceSlide ?? sourceSlides[0]?.sourceSlide ?? 1;
    selected.add(sourceSlide);

    return {
      layoutId,
      outputSlide: index + 1,
      sourceSlide,
      narrativeRole: rule.narrativeRole,
      reuseMode: "duplicate-slide" as const,
      confidence: Math.min(100, Math.round(((best?.score ?? 0) / 16) * 100)),
      evidence:
        best?.evidence.length > 0
          ? best.evidence
          : ["fallback:first-available-source-slide"],
      editTargets: []
    };
  });

  const frameMap = {
    mode: "template-following" as const,
    rendererIntent: "clone-edit" as const,
    outputSlides,
    omittedSourceSlides: sourceSlides
      .filter((slide) => !selected.has(slide.sourceSlide))
      .slice(0, 24)
      .map((slide) => ({
        sourceSlide: slide.sourceSlide,
        reason: "Not selected by deterministic layout-role scoring."
      }))
  };

  return {
    ...frameMap,
    approval: {
      status: "suggested" as const,
      mappingFingerprint: frameMapFingerprint(outputSlides)
    }
  };
}

function frameMapFingerprint(outputSlides: TemplateFrameMapping[]) {
  return crypto
    .createHash("sha256")
    .update(
      outputSlides
        .map((slide) => `${slide.outputSlide}:${slide.layoutId}:${slide.sourceSlide}`)
        .join("|")
    )
    .digest("hex");
}

function rebuildOmittedSourceSlides(
  sourceSlides: TemplateSourceSlide[],
  outputSlides: TemplateFrameMapping[]
) {
  const selected = new Set(outputSlides.map((slide) => slide.sourceSlide));

  return sourceSlides
    .filter((slide) => !selected.has(slide.sourceSlide))
    .slice(0, 24)
    .map((slide) => ({
      sourceSlide: slide.sourceSlide,
      reason: "Not selected by the approved admin frame map."
    }));
}

export function summarizeTemplateKit(kit: TemplateKit): TemplateKitSummary {
  const { buffer: _buffer, ...summary } = kit;
  return summary;
}

export function listTemplateKits() {
  return Array.from(getGlobalStore().kits.values()).map(summarizeTemplateKit);
}

export function buildTemplateFrameMapArtifact(
  kit: TemplateKit,
  deckPlan?: DeckPlan
): TemplateFrameMapArtifact {
  const byLayoutId = new Map(
    kit.frameMap.outputSlides.map((mapping) => [mapping.layoutId, mapping])
  );
  const outputSlides = (deckPlan?.slides ?? kit.frameMap.outputSlides).map(
    (slide, index) => {
      const layoutId =
        "layout_id" in slide ? slide.layout_id : (slide.layoutId as ApprovedLayoutId);
      const baseMapping = byLayoutId.get(layoutId);
      const variantKey = recipeVariantKeyForSlide(deckPlan, index, layoutId);
      const mapping =
        applyBuiltInTemplateVariant({
          kit,
          layoutId,
          variantKey,
          fallback: baseMapping
        }) ?? baseMapping;

      return {
        outputSlide: index + 1,
        sourceSlide: mapping?.sourceSlide ?? 0,
        templateVariantKey: mapping?.templateVariantKey,
        layoutId,
        narrativeRole: mapping?.narrativeRole ?? "unmapped",
        reuseMode: "duplicate-slide" as const,
        confidence: mapping?.confidence ?? 0,
        evidence: mapping?.evidence ?? ["missing:mapped-source-slide"],
        editTargets: mapping?.editTargets ?? []
      };
    }
  );
  const unmappedOutputSlides = outputSlides
    .filter((slide) => slide.sourceSlide === 0)
    .map((slide) => slide.outputSlide);
  const lowConfidenceOutputSlides = outputSlides
    .filter((slide) => slide.confidence < 60)
    .map((slide) => slide.outputSlide);
  const currentFingerprint = frameMapFingerprint(kit.frameMap.outputSlides);
  const approvalCurrent =
    kit.frameMap.approval.status === "approved" &&
    kit.frameMap.approval.mappingFingerprint === currentFingerprint;

  return {
    schema: "branddeck.template-frame-map/v1",
    templateKitId: kit.id,
    templateName: kit.templateName,
    templateFingerprint: kit.fingerprint,
    generatedAt: new Date().toISOString(),
    mode: "template-following",
    rendererIntent: "clone-edit",
    outputSlides,
    omittedSourceSlides: kit.frameMap.omittedSourceSlides,
    validation: {
      passed: unmappedOutputSlides.length === 0 && approvalCurrent,
      coverage: `${outputSlides.length - unmappedOutputSlides.length}/${outputSlides.length}`,
      minimumConfidence: Math.min(...outputSlides.map((slide) => slide.confidence)),
      unmappedOutputSlides,
      lowConfidenceOutputSlides
    }
  };
}

export async function createTemplateKit(templateName: string, buffer: Buffer) {
  const fingerprint = crypto.createHash("sha256").update(buffer).digest("hex");
  const zip = await JSZip.loadAsync(buffer);
  const entries = fileEntries(zip);
  const mediaEntries = entries.filter((entry) => entry.startsWith("ppt/media/"));
  const sourceSlides = await buildSourceSlides(zip, entries);
  const id = `kit_${fingerprint.slice(0, 16)}`;
  const kit: TemplateKit = {
    id,
    templateName,
    fingerprint,
    createdAt: new Date().toISOString(),
    bytes: buffer.length,
    slideCount: entries.filter((entry) => /^ppt\/slides\/slide\d+\.xml$/.test(entry))
      .length,
    layoutCount: entries.filter((entry) =>
      /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(entry)
    ).length,
    masterCount: entries.filter((entry) =>
      /^ppt\/slideMasters\/slideMaster\d+\.xml$/.test(entry)
    ).length,
    mediaCount: mediaEntries.length,
    imageCount: mediaEntries.filter((entry) => /\.(png|jpe?g|gif|svg)$/i.test(entry))
      .length,
    detectedFonts: await detectFonts(zip, entries),
    detectedColors: await detectColors(zip, entries),
    topAssets: await summarizeAssets(zip, mediaEntries),
    sourceSlides,
    frameMap: inferTemplateFrameMap(sourceSlides),
    driftGuards: {
      templateFingerprintLocked: true,
      frameMapRequired: true,
      cloneEditPreferred: true,
      approvedLayoutsRequired: true,
      deterministicRendererRequired: true,
      aiDesignDisabled: true
    },
    buffer
  };

  const store = getGlobalStore();
  store.kits.set(id, kit);

  if (store.kits.size > TEMPLATE_KIT_LIMIT) {
    const oldestKitId = store.kits.keys().next().value as string | undefined;
    if (oldestKitId) {
      store.kits.delete(oldestKitId);
    }
  }

  persistTemplateKits(store);

  return kit;
}

export function getTemplateKit(id: string) {
  return getGlobalStore().kits.get(id);
}

export async function readTemplateMediaAsset(id: string, entry: string) {
  const kit = getTemplateKit(id);

  if (!kit) {
    throw new Error("Template kit not found.");
  }

  const asset = kit.topAssets.find((item) => item.entry === entry);

  if (!asset) {
    throw new Error("Template media asset not found in the indexed asset list.");
  }

  const extension = asset.extension.toLowerCase();
  const mimeType =
    extension === "png"
      ? "image/png"
      : extension === "jpg" || extension === "jpeg"
        ? "image/jpeg"
        : extension === "svg"
          ? "image/svg+xml"
          : "";

  if (!mimeType) {
    throw new Error("Only PNG, JPG, and SVG template media can be promoted.");
  }

  const zip = await JSZip.loadAsync(kit.buffer);
  const mediaFile = zip.file(entry);

  if (!mediaFile) {
    throw new Error("Template media asset is missing from the PPTX package.");
  }

  return {
    fileName: path.basename(entry),
    mimeType,
    buffer: await mediaFile.async("nodebuffer")
  };
}

export function updateTemplateFrameMapOverrides(
  id: string,
  overrides: TemplateFrameMapOverride[]
) {
  const kit = getTemplateKit(id);

  if (!kit) {
    throw new Error("Template kit not found.");
  }

  const sourceSlides = new Set(kit.sourceSlides.map((slide) => slide.sourceSlide));
  const allowedLayouts = new Set<ApprovedLayoutId>(APPROVED_LAYOUT_IDS);
  const existingByLayout = new Map(
    kit.frameMap.outputSlides.map((mapping) => [mapping.layoutId, mapping])
  );

  for (const override of overrides) {
    if (!allowedLayouts.has(override.layoutId)) {
      throw new Error(`${override.layoutId} is not an approved layout ID.`);
    }

    if (!sourceSlides.has(override.sourceSlide)) {
      throw new Error(`Source slide ${override.sourceSlide} does not exist in this template.`);
    }
  }

  const overrideByLayout = new Map(
    overrides.map((override) => [override.layoutId, override.sourceSlide])
  );

  kit.frameMap.outputSlides = APPROVED_LAYOUT_IDS.map((layoutId, index) => {
    const existing = existingByLayout.get(layoutId);
    const overrideSourceSlide = overrideByLayout.get(layoutId);

    if (!existing) {
      const rule = FRAME_MAP_RULES[layoutId];

      return {
        layoutId,
        outputSlide: index + 1,
        sourceSlide: overrideSourceSlide ?? kit.sourceSlides[0]?.sourceSlide ?? 1,
        narrativeRole: rule.narrativeRole,
        reuseMode: "duplicate-slide" as const,
        confidence: overrideSourceSlide ? 100 : 0,
        evidence: overrideSourceSlide
          ? [`admin_override:${overrideSourceSlide}`]
          : ["missing:mapped-source-slide"],
        editTargets: []
      };
    }

    if (!overrideSourceSlide) {
      return {
        ...existing,
        outputSlide: index + 1
      };
    }

    return {
      ...existing,
      outputSlide: index + 1,
      sourceSlide: overrideSourceSlide,
      confidence: 100,
      evidence: [`admin_override:${overrideSourceSlide}`]
    };
  });
  kit.frameMap.omittedSourceSlides = rebuildOmittedSourceSlides(
    kit.sourceSlides,
    kit.frameMap.outputSlides
  );
  kit.frameMap.approval = {
    status: "suggested",
    mappingFingerprint: frameMapFingerprint(kit.frameMap.outputSlides)
  };

  persistTemplateKits(getGlobalStore());

  return kit;
}

export function approveTemplateFrameMap(id: string) {
  const kit = getTemplateKit(id);

  if (!kit) {
    throw new Error("Template kit not found.");
  }

  kit.frameMap.approval = {
    status: "approved",
    mappingFingerprint: frameMapFingerprint(kit.frameMap.outputSlides),
    approvedAt: new Date().toISOString(),
    approvedBy: "Local brand admin"
  };

  persistTemplateKits(getGlobalStore());

  return kit;
}
