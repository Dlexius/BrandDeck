import JSZip from "jszip";
import type { DeckPlan, DeckSlide } from "@/lib/deck-plan-schema";
import type {
  TemplateFrameMapArtifact,
  TemplateKit
} from "@/lib/template-kit-store";
import {
  targetsForLayout,
  type TemplateEditTarget
} from "@/lib/template-edit-manifest";

const PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const SLIDE_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide";
const NOTES_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide";
const IMAGE_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
const SLIDE_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.presentationml.slide+xml";
const CLONED_SLIDE_NUMBER_START = 1001;
const CLONED_REL_ID_START = 100001;
const SVG_CONTENT_TYPE = "image/svg+xml";
const FORBIDDEN_PLACEHOLDER_PHRASES = [
  "Agenda item",
  "Click to add",
  "Lorem ipsum",
  "Go to the Chart Master Sheet",
  "This chart is a placeholder"
];

type SlideEditTarget = {
  shapeId: string;
  lines: string[] | number[];
  objectType?: TemplateEditTarget["objectType"];
  clearWhenEmpty?: boolean;
};

function escapeXmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeXmlText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function relationshipTagPattern(type: string) {
  return new RegExp(
    `<Relationship\\b(?=[^>]*\\bType="${type.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    )}")[^>]*/>`,
    "g"
  );
}

function ensureRelationshipsRoot(xml?: string) {
  return (
    xml ??
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PACKAGE_REL_NS}"></Relationships>`
  );
}

function removeRelationshipsByType(xml: string, type: string) {
  return xml.replace(relationshipTagPattern(type), "");
}

function appendRelationships(
  xml: string,
  relationships: Array<{ id: string; type: string; target: string }>
) {
  const relationshipXml = relationships
    .map(
      (relationship) =>
        `<Relationship Id="${escapeXmlAttribute(relationship.id)}" Type="${escapeXmlAttribute(
          relationship.type
        )}" Target="${escapeXmlAttribute(relationship.target)}"/>`
    )
    .join("");

  return xml.replace("</Relationships>", `${relationshipXml}</Relationships>`);
}

function ensureSlideOverride(contentTypesXml: string, slidePart: string) {
  const partName = `/${slidePart}`;

  if (contentTypesXml.includes(`PartName="${partName}"`)) {
    return contentTypesXml;
  }

  const override = `<Override PartName="${escapeXmlAttribute(
    partName
  )}" ContentType="${SLIDE_CONTENT_TYPE}"/>`;

  return contentTypesXml.replace("</Types>", `${override}</Types>`);
}

function ensureDefaultContentType(
  contentTypesXml: string,
  extension: string,
  contentType: string
) {
  const extensionPattern = new RegExp(
    `<Default\\b(?=[^>]*\\bExtension="${extension.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    )}")[^>]*/>`,
    "i"
  );

  if (extensionPattern.test(contentTypesXml)) {
    return contentTypesXml;
  }

  const defaultXml = `<Default Extension="${escapeXmlAttribute(
    extension
  )}" ContentType="${escapeXmlAttribute(contentType)}"/>`;

  return contentTypesXml.replace("</Types>", `${defaultXml}</Types>`);
}

function replaceRelationshipTarget(
  xml: string,
  relationshipId: string,
  target: string
) {
  const idPattern = relationshipId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const relationshipPattern = new RegExp(
    `<Relationship\\b(?=[^>]*\\bId="${idPattern}")[^>]*/>`
  );

  if (!relationshipPattern.test(xml)) {
    return appendRelationships(xml, [
      { id: relationshipId, type: IMAGE_REL_TYPE, target }
    ]);
  }

  return xml.replace(relationshipPattern, (relationshipXml) => {
    if (/\bTarget="[^"]*"/.test(relationshipXml)) {
      return relationshipXml.replace(
        /\bTarget="[^"]*"/,
        `Target="${escapeXmlAttribute(target)}"`
      );
    }

    return relationshipXml.replace(
      /\/>$/,
      ` Target="${escapeXmlAttribute(target)}"/>`
    );
  });
}

function replaceSlideIdList(
  presentationXml: string,
  slideIds: Array<{ id: number; relId: string }>
) {
  const slideIdXml = slideIds
    .map(
      (slide) =>
        `<p:sldId id="${slide.id}" r:id="${escapeXmlAttribute(slide.relId)}"/>`
    )
    .join("");
  const slideListXml = `<p:sldIdLst>${slideIdXml}</p:sldIdLst>`;

  if (/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/.test(presentationXml)) {
    return presentationXml.replace(
      /<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/,
      slideListXml
    );
  }

  return presentationXml.replace("</p:presentation>", `${slideListXml}</p:presentation>`);
}

function normalizeTextLines(
  value: string | number | Array<string | number>,
  preserveEmpty = false
) {
  const lines = (Array.isArray(value) ? value : [value])
    .map((line) => String(line).replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return preserveEmpty && lines.length === 0 ? [""] : lines;
}

function firstMatch(value: string, pattern: RegExp) {
  return value.match(pattern)?.[0] ?? "";
}

function sanitizeRunProperties(runPropertiesXml: string) {
  return runPropertiesXml
    .replace(/\s+u="[^"]*"/g, "")
    .replace(/<a:highlight>[\s\S]*?<\/a:highlight>/g, "")
    .replace(/<a:hlinkClick\b[^>]*(?:\/>|>[\s\S]*?<\/a:hlinkClick>)/g, "")
    .replace(
      /<a:solidFill>\s*<a:schemeClr val="hlink"\s*\/>\s*<\/a:solidFill>/g,
      '<a:solidFill><a:schemeClr val="dk1"/></a:solidFill>'
    );
}

function paragraphStyle(paragraphXml: string) {
  return {
    paragraphProperties: firstMatch(
      paragraphXml,
      /<a:pPr\b[^>]*(?:\/>|>[\s\S]*?<\/a:pPr>)/
    ),
    runProperties: sanitizeRunProperties(
      firstMatch(paragraphXml, /<a:rPr\b[^>]*(?:\/>|>[\s\S]*?<\/a:rPr>)/)
    ),
    endParagraphProperties: sanitizeRunProperties(
      firstMatch(
        paragraphXml,
        /<a:endParaRPr\b[^>]*(?:\/>|>[\s\S]*?<\/a:endParaRPr>)/
      )
    )
  };
}

function makeTextBody(txBodyXml: string, lines: string[]) {
  const bodyPrefixMatch = txBodyXml.match(
    /^<p:txBody>([\s\S]*?)(?=<a:p[\s>])/
  );
  const bodyPrefix =
    bodyPrefixMatch?.[1] ?? '<a:bodyPr/><a:lstStyle/>';
  const textLines = lines.length > 0 ? lines : [""];
  const sourceParagraphs = txBodyXml.match(/<a:p\b[\s\S]*?<\/a:p>/g) ?? [];
  const sourceStyles = sourceParagraphs.map(paragraphStyle);
  const fallbackStyle = sourceStyles[0] ?? {
    paragraphProperties: "",
    runProperties: "",
    endParagraphProperties: ""
  };
  const paragraphs = textLines
    .map((line, index) => {
      const style =
        sourceStyles[Math.min(index, Math.max(sourceStyles.length - 1, 0))] ??
        fallbackStyle;

      return `<a:p>${style.paragraphProperties}<a:r>${style.runProperties}<a:t>${escapeXmlText(
        line
      )}</a:t></a:r>${style.endParagraphProperties}</a:p>`;
    })
    .join("");

  return `<p:txBody>${bodyPrefix}${paragraphs}</p:txBody>`;
}

function replaceShapeTextById(xml: string, shapeId: string, lines: string[]) {
  if (lines.length === 0) {
    return xml;
  }

  const shapePattern = new RegExp(
    `<p:sp\\b(?=(?:(?!<\\/p:sp>)[\\s\\S])*?<p:cNvPr\\b[^>]*\\bid="${shapeId}")[\\s\\S]*?<\\/p:sp>`
  );

  return xml.replace(shapePattern, (shapeXml) =>
    shapeXml.replace(/<p:txBody>[\s\S]*?<\/p:txBody>/, (txBodyXml) =>
      makeTextBody(txBodyXml, lines)
    )
  );
}

function replaceDrawingElementById(
  xml: string,
  tagName: "sp" | "pic" | "graphicFrame",
  shapeId: string,
  update: (elementXml: string) => string
) {
  const shapePattern = new RegExp(
    `<p:${tagName}\\b(?=(?:(?!<\\/p:${tagName}>)[\\s\\S])*?<p:cNvPr\\b[^>]*\\bid="${shapeId}")[\\s\\S]*?<\\/p:${tagName}>`
  );

  return xml.replace(shapePattern, update);
}

function replaceXmlAttribute(xml: string, attribute: string, value: number) {
  const attributePattern = new RegExp(`\\b${attribute}="[^"]*"`);

  return attributePattern.test(xml)
    ? xml.replace(attributePattern, `${attribute}="${value}"`)
    : xml;
}

function setDrawingGeometryById(
  xml: string,
  tagName: "sp" | "pic",
  shapeId: string,
  geometry: Partial<{ x: number; y: number; cx: number; cy: number }>
) {
  return replaceDrawingElementById(xml, tagName, shapeId, (shapeXml) =>
    shapeXml.replace(/<a:xfrm>[\s\S]*?<\/a:xfrm>/, (xfrmXml) => {
      let nextXml = xfrmXml;

      if (geometry.x !== undefined) {
        nextXml = nextXml.replace(/<a:off\b[^>]*\/>/, (offXml) =>
          replaceXmlAttribute(offXml, "x", geometry.x as number)
        );
      }

      if (geometry.y !== undefined) {
        nextXml = nextXml.replace(/<a:off\b[^>]*\/>/, (offXml) =>
          replaceXmlAttribute(offXml, "y", geometry.y as number)
        );
      }

      if (geometry.cx !== undefined) {
        nextXml = nextXml.replace(/<a:ext\b[^>]*\/>/, (extXml) =>
          replaceXmlAttribute(extXml, "cx", geometry.cx as number)
        );
      }

      if (geometry.cy !== undefined) {
        nextXml = nextXml.replace(/<a:ext\b[^>]*\/>/, (extXml) =>
          replaceXmlAttribute(extXml, "cy", geometry.cy as number)
        );
      }

      return nextXml;
    })
  );
}

function setTextShapeStyleById(
  xml: string,
  shapeId: string,
  options: {
    fontSize?: number;
    paragraphSpacingAfter?: number;
    lineSpacingPct?: number;
  }
) {
  return replaceDrawingElementById(xml, "sp", shapeId, (shapeXml) => {
    let nextXml = shapeXml;

    if (options.fontSize !== undefined) {
      nextXml = nextXml.replace(
        /(<a:(?:rPr|endParaRPr)\b[^>]*\bsz=")[^"]+(")/g,
        `$1${options.fontSize}$2`
      );
    }

    if (options.paragraphSpacingAfter !== undefined) {
      nextXml = nextXml.replace(
        /<a:spcAft><a:spcPts val="[^"]*"\/><\/a:spcAft>/g,
        `<a:spcAft><a:spcPts val="${options.paragraphSpacingAfter}"/></a:spcAft>`
      );
    }

    if (options.lineSpacingPct !== undefined) {
      nextXml = nextXml.replace(
        /<a:lnSpc><a:spcPct val="[^"]*"\/><\/a:lnSpc>/g,
        `<a:lnSpc><a:spcPct val="${options.lineSpacingPct}"/></a:lnSpc>`
      );
    }

    return nextXml;
  });
}

function titleCoverFontSize(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const wordCount = normalized ? normalized.split(" ").length : 0;
  const score = normalized.length + Math.max(0, wordCount - 2) * 4;

  if (score <= 18) {
    return 14400;
  }

  if (score <= 32) {
    return 11200;
  }

  if (score <= 38) {
    return 10000;
  }

  if (score <= 50) {
    return 8800;
  }

  return 7600;
}

function slideHeadlineFontSize(value: string) {
  const length = value.replace(/\s+/g, " ").trim().length;

  if (length <= 20) {
    return 6400;
  }

  if (length <= 26) {
    return 5600;
  }

  if (length <= 34) {
    return 5000;
  }

  if (length <= 44) {
    return 4400;
  }

  return 3800;
}

function denseBodyFontSize(value: string, baseFontSize: number) {
  const length = value.replace(/\s+/g, " ").trim().length;

  if (length <= 58) {
    return baseFontSize;
  }

  if (length <= 78) {
    return Math.min(baseFontSize, 3200);
  }

  if (length <= 105) {
    return Math.min(baseFontSize, 3000);
  }

  return Math.min(baseFontSize, 2600);
}

function actionCardFontSize(value: string) {
  const length = value.replace(/\s+/g, " ").trim().length;

  if (length <= 62) {
    return 2400;
  }

  if (length <= 86) {
    return 2200;
  }

  return 2000;
}

const TITLE_VARIANT_SLOTS: Partial<
  Record<
    number,
    {
      titleId: string;
      subtitleId: string;
      preparedId?: string;
      subtitleLongTitleY?: number;
      preparedLongTitleY?: number;
    }
  >
> = {
  8: {
    titleId: "2401",
    subtitleId: "2402",
    preparedId: "2405",
    subtitleLongTitleY: 5060000,
    preparedLongTitleY: 6900000
  },
  10: {
    titleId: "2418",
    subtitleId: "2419",
    preparedId: "2421",
    subtitleLongTitleY: 4960000,
    preparedLongTitleY: 6780000
  },
  11: {
    titleId: "2427",
    subtitleId: "2428",
    preparedId: "2430",
    subtitleLongTitleY: 5060000,
    preparedLongTitleY: 6900000
  },
  12: {
    titleId: "2435",
    subtitleId: "2436",
    preparedId: "2438",
    subtitleLongTitleY: 5060000,
    preparedLongTitleY: 6900000
  }
};

const SLIDE_HEADLINE_IDS: Partial<Record<number, string[]>> = {
  30: ["2633"],
  31: ["2640"],
  40: ["2736"],
  129: ["4629"],
  132: ["4671"],
  75: ["3328"],
  76: ["3345"],
  79: ["3401"],
  80: ["3419"]
};

function applyTitleCoverFitGuards(xml: string, slide: DeckSlide, sourceSlide: number) {
  const slots = TITLE_VARIANT_SLOTS[sourceSlide];

  if (!slots) {
    return xml;
  }

  const title = String(slide.fields.client_name ?? slide.title);
  const subtitle = String(slide.fields.subtitle ?? "");
  const titleFontSize = titleCoverFontSize(title);
  const subtitleFontSize = subtitle.length > 86 ? 2400 : 2800;
  let nextXml = setTextShapeStyleById(xml, slots.titleId, {
    fontSize: titleFontSize,
    lineSpacingPct: titleFontSize <= 10000 ? 74000 : 78000
  });

  nextXml = setTextShapeStyleById(nextXml, slots.subtitleId, {
    fontSize: subtitleFontSize,
    lineSpacingPct: 105000
  });

  if (titleFontSize <= 10000 && slots.subtitleLongTitleY !== undefined) {
    nextXml = setDrawingGeometryById(nextXml, "sp", slots.subtitleId, {
      y: slots.subtitleLongTitleY,
      cy: 1120000
    });
  }

  if (
    titleFontSize <= 10000 &&
    slots.preparedId &&
    slots.preparedLongTitleY !== undefined
  ) {
    nextXml = setDrawingGeometryById(nextXml, "sp", slots.preparedId, {
      y: slots.preparedLongTitleY
    });
  }

  return nextXml;
}

function applySlideHeadlineFitGuards(xml: string, slide: DeckSlide, sourceSlide: number) {
  const titleIds = SLIDE_HEADLINE_IDS[sourceSlide] ?? [];

  if (titleIds.length === 0) {
    return xml;
  }

  const fontSize = slideHeadlineFontSize(slide.title);

  return titleIds.reduce(
    (nextXml, shapeId) =>
      setTextShapeStyleById(nextXml, shapeId, {
        fontSize,
        lineSpacingPct: 88000
      }),
    xml
  );
}

function applyDenseContentFitGuards(xml: string, slide: DeckSlide, sourceSlide: number) {
  if (slide.layout_id === "executive_summary") {
    if (sourceSlide === 30) {
      const combinedSummary = summaryWithImpact(slide).join(" ");

      return setTextShapeStyleById(xml, "2625", {
        fontSize: denseBodyFontSize(combinedSummary, 3600),
        lineSpacingPct: 94000
      });
    }

    if (sourceSlide === 31) {
      const summaryPoints = asStringArray(slide.fields.summary_points);
      const firstGroup = summaryPoints.slice(0, 2).join(" ");
      const secondGroup = summaryPoints.slice(2, 4).join(" ");
      let nextXml = setTextShapeStyleById(xml, "2641", {
        fontSize: denseBodyFontSize(String(slide.fields.business_impact ?? ""), 3600),
        lineSpacingPct: 94000
      });

      nextXml = setTextShapeStyleById(nextXml, "2639", {
        fontSize: denseBodyFontSize(firstGroup, 3600),
        lineSpacingPct: 94000
      });

      return setTextShapeStyleById(nextXml, "2645", {
        fontSize: denseBodyFontSize(secondGroup, 3600),
        lineSpacingPct: 94000
      });
    }
  }

  if (slide.layout_id === "agenda") {
    const agendaItems = asStringArray(slide.fields.agenda_items);
    const agendaItemShapeIds = ["2465", "2468", "2470", "2472", "2474", "2476"];

    return agendaItemShapeIds.reduce((nextXml, shapeId, index) => {
      const item = agendaItems[index] ?? "";
      const fontSize = item.length > 48 ? 2800 : 3200;

      return setTextShapeStyleById(nextXml, shapeId, {
        fontSize,
        lineSpacingPct: 92000
      });
    }, xml);
  }

  if (slide.layout_id === "risks_recommendations") {
    const bodyShapeIds =
      sourceSlide === 76
        ? ["3347", "3349", "3351"]
        : sourceSlide === 75
          ? ["3330", "3332", "3334"]
          : [];
    const bodyLines = [
      String(slide.fields.risk_summary ?? ""),
      ...asStringArray(slide.fields.recommendations).slice(0, 2)
    ];

    return bodyShapeIds.reduce((nextXml, shapeId, index) => {
      const fontSize = denseBodyFontSize(bodyLines[index] ?? "", 3600);

      return setTextShapeStyleById(nextXml, shapeId, {
        fontSize,
        lineSpacingPct: 96000
      });
    }, xml);
  }

  if (slide.layout_id === "next_steps") {
    const stepShapeIds =
      sourceSlide === 79
        ? ["3407", "3408", "3409"]
        : sourceSlide === 80
          ? ["3425", "3426", "3427"]
          : [];
    const steps = asStringArray(slide.fields.steps);

    return stepShapeIds.reduce((nextXml, shapeId, index) => {
      const fontSize = actionCardFontSize(steps[index] ?? "");

      return setTextShapeStyleById(nextXml, shapeId, {
        fontSize,
        lineSpacingPct: 98000
      });
    }, xml);
  }

  return xml;
}

function applyTemplateTextFitGuards(
  xml: string,
  slide: DeckSlide,
  sourceSlide: number
) {
  return applyDenseContentFitGuards(
    applySlideHeadlineFitGuards(
      applyTitleCoverFitGuards(xml, slide, sourceSlide),
      slide,
      sourceSlide
    ),
    slide,
    sourceSlide
  );
}

function applyStackedTrendLayoutPolish(xml: string) {
  let nextXml = setDrawingGeometryById(xml, "pic", "4626", {
    cx: 11160000
  });

  nextXml = setDrawingGeometryById(nextXml, "sp", "4632", {
    x: 14500000,
    y: 5480000,
    cx: 3100000,
    cy: 2520000
  });

  return setTextShapeStyleById(nextXml, "4632", {
    fontSize: 1600,
    paragraphSpacingAfter: 900
  });
}

function textBodyHasForbiddenPlaceholder(txBodyXml: string) {
  const lowercaseBody = txBodyXml.toLowerCase();

  return FORBIDDEN_PLACEHOLDER_PHRASES.some((phrase) =>
    lowercaseBody.includes(phrase.toLowerCase())
  );
}

function clearForbiddenPlaceholderTextBodies(xml: string) {
  return xml.replace(/<p:txBody>[\s\S]*?<\/p:txBody>/g, (txBodyXml) =>
    textBodyHasForbiddenPlaceholder(txBodyXml) ? makeTextBody(txBodyXml, [""]) : txBodyXml
  );
}

function replaceGraphicFrameTextsById(
  xml: string,
  shapeId: string,
  values: string[]
) {
  if (values.length === 0) {
    return xml;
  }

  const framePattern = new RegExp(
    `<p:graphicFrame\\b(?=(?:(?!<\\/p:graphicFrame>)[\\s\\S])*?<p:cNvPr\\b[^>]*\\bid="${shapeId}")[\\s\\S]*?<\\/p:graphicFrame>`
  );

  return xml.replace(framePattern, (frameXml) => {
    let index = 0;

    return frameXml.replace(/<a:t>[\s\S]*?<\/a:t>/g, (textXml) => {
      if (index >= values.length) {
        return textXml;
      }

      const value = values[index];
      index += 1;

      return `<a:t>${escapeXmlText(value)}</a:t>`;
    });
  });
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item));
}

function fieldNumber(slide: DeckSlide, field: string) {
  const value = slide.fields[field];
  return typeof value === "number" || typeof value === "string"
    ? String(value)
    : "";
}

function fieldNumericValue(slide: DeckSlide, field: string) {
  const value = slide.fields[field];
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function adoptionCoverage(slide: DeckSlide) {
  const activeUsers = fieldNumericValue(slide, "active_users");
  const licensedUsers = fieldNumericValue(slide, "licensed_users");

  if (activeUsers <= 0 || licensedUsers <= 0) {
    return 0;
  }

  return Math.round(Math.min(100, Math.max(0, (activeUsers / licensedUsers) * 100)));
}

function formatMetric(value: unknown, suffix = "") {
  if (typeof value !== "number" && typeof value !== "string") {
    return "";
  }

  return `${value}${suffix}`;
}

function summaryWithImpact(slide: DeckSlide) {
  const businessImpact = String(slide.fields.business_impact ?? "").trim();
  const summaryPoints = asStringArray(slide.fields.summary_points);

  return [businessImpact, ...summaryPoints].filter(Boolean).slice(0, 5);
}

function kpiFocusFeature(slide: DeckSlide) {
  const focus = String(slide.fields.lowest_feature ?? "").trim();

  return focus || "Review focus";
}

function kpiPointLines(slide: DeckSlide, label: string, value: string) {
  return [label, value].filter(Boolean);
}

function featureTableValues(slide: DeckSlide) {
  const metrics = Array.isArray(slide.fields.feature_metrics)
    ? slide.fields.feature_metrics
    : [];
  const rows = metrics.slice(0, 3).map((metric) => {
    if (!metric || typeof metric !== "object") {
      return ["Feature", "", "", ""];
    }

    const record = metric as Record<string, unknown>;
    return [
      String(record.feature ?? "Feature"),
      String(record.count ?? ""),
      record.feature === slide.fields.top_feature ? "Top feature" : "Tracked use",
      record.feature === slide.fields.lowest_feature ? "Needs focus" : "Maintain cadence"
    ];
  });

  while (rows.length < 3) {
    rows.push(["Feature", "", "", ""]);
  }

  return ["Feature", "Count", "Signal", "Action", ...rows.flat()];
}

function compactPeriodLabel(value: unknown) {
  const label = String(value ?? "Period").trim();
  const match = label.match(/^([A-Za-z]+)\s+(\d{4})$/);

  if (!match) {
    return label;
  }

  return `${match[1].slice(0, 3)} '${match[2].slice(2)}`;
}

function trendPoints(slide: DeckSlide) {
  const rawPoints = Array.isArray(slide.fields.trend_points)
    ? slide.fields.trend_points
    : [];

  return rawPoints
    .map((point) => {
      if (!point || typeof point !== "object") {
        return null;
      }

      const record = point as Record<string, unknown>;
      const adoptionScore = Number(record.adoption_score);
      const activeUsers = Number(record.active_users);

      if (!Number.isFinite(adoptionScore) || !Number.isFinite(activeUsers)) {
        return null;
      }

      return {
        label: compactPeriodLabel(record.label),
        adoptionScore,
        activeUsers
      };
    })
    .filter((point): point is {
      label: string;
      adoptionScore: number;
      activeUsers: number;
    } => point !== null);
}

function trendProofPoints(slide: DeckSlide) {
  const points = trendPoints(slide);

  if (points.length <= 4) {
    return points;
  }

  const indexes = [
    0,
    Math.round((points.length - 1) / 3),
    Math.round(((points.length - 1) * 2) / 3),
    points.length - 1
  ];
  const uniqueIndexes = Array.from(new Set(indexes));

  return uniqueIndexes
    .map((index) => points[index])
    .filter((point): point is (typeof points)[number] => point !== undefined);
}

function trendPointLines(slide: DeckSlide) {
  const rows = trendProofPoints(slide).map(
    (point) => `${point.label}: ${point.adoptionScore}% / ${point.activeUsers}`
  );
  const filteredRows = rows.filter(Boolean);

  return filteredRows.length > 0
    ? ["Trend data", ...filteredRows]
    : ["Trend data", String(slide.fields.trend_summary ?? "")];
}

function compactChromeText(value: string, maxLength = 32) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function deckChromeTitle(slide: DeckSlide) {
  const label =
    typeof slide.fields.deck_label === "string" && slide.fields.deck_label.trim()
      ? slide.fields.deck_label
      : "ADOPTION REPORT";

  return compactChromeText(label.toUpperCase(), 28);
}

function sectionChromeTitle(slide: DeckSlide) {
  return compactChromeText(slide.title.toUpperCase(), 32);
}

function preparedForLine() {
  return "Prepared for client review";
}

function findPictureRelationshipId(slideXml: string, pictureId: string) {
  const picturePattern = new RegExp(
    `<p:pic\\b(?=(?:(?!<\\/p:pic>)[\\s\\S])*?<p:cNvPr\\b[^>]*\\bid="${pictureId}")[\\s\\S]*?<\\/p:pic>`
  );
  const pictureXml = slideXml.match(picturePattern)?.[0];

  return pictureXml?.match(/\br:embed="([^"]+)"/)?.[1];
}

function trendChartSvg(slide: DeckSlide) {
  const points = trendPoints(slide);
  const safePoints =
    points.length > 0
      ? points
      : [{ label: "Current", adoptionScore: 0, activeUsers: 0 }];
  const width = 1280;
  const height = 560;
  const margin = { top: 36, right: 44, bottom: 76, left: 74 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const xForIndex = (index: number) =>
    safePoints.length === 1
      ? margin.left + plotWidth / 2
      : margin.left + (index / (safePoints.length - 1)) * plotWidth;
  const yForScore = (score: number) =>
    margin.top + ((100 - Math.max(0, Math.min(100, score))) / 100) * plotHeight;
  const linePoints = safePoints
    .map((point, index) => `${xForIndex(index)},${yForScore(point.adoptionScore)}`)
    .join(" ");
  const areaPath = `M ${xForIndex(0)} ${yForScore(
    safePoints[0].adoptionScore
  )} ${safePoints
    .slice(1)
    .map((point, index) => `L ${xForIndex(index + 1)} ${yForScore(point.adoptionScore)}`)
    .join(" ")} L ${xForIndex(safePoints.length - 1)} ${
    margin.top + plotHeight
  } L ${xForIndex(0)} ${margin.top + plotHeight} Z`;
  const gridlines = [0, 25, 50, 75, 100]
    .map((score) => {
      const y = yForScore(score);

      return `<line x1="${margin.left}" y1="${y}" x2="${
        margin.left + plotWidth
      }" y2="${y}" stroke="#D7CABF" stroke-width="1"/><text x="${
        margin.left - 16
      }" y="${y + 5}" fill="#3A3735" font-family="Arial" font-size="20" text-anchor="end">${score}%</text>`;
    })
    .join("");
  const xLabels = safePoints
    .map((point, index) => {
      const x = xForIndex(index);

      return `<text x="${x}" y="${
        margin.top + plotHeight + 42
      }" fill="#3A3735" font-family="Arial" font-size="20" text-anchor="middle">${escapeXmlText(
        point.label
      )}</text>`;
    })
    .join("");
  const markers = safePoints
    .map((point, index) => {
      const x = xForIndex(index);
      const y = yForScore(point.adoptionScore);

      return `<circle cx="${x}" cy="${y}" r="8" fill="#FF5200"/><circle cx="${x}" cy="${y}" r="4" fill="#FFFFFF"/><text x="${x}" y="${
        y - 18
      }" fill="#1D1B1A" font-family="Arial" font-size="21" font-weight="700" text-anchor="middle">${point.adoptionScore}%</text>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#FFFFFF"/>
  <rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" fill="#F3F3F3"/>
  ${gridlines}
  <line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${
    margin.left + plotWidth
  }" y2="${margin.top + plotHeight}" stroke="#3A3735" stroke-width="2"/>
  <path d="${areaPath}" fill="#FF5200" opacity="0.24"/>
  <polyline points="${linePoints}" fill="none" stroke="#FF5200" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  ${markers}
  ${xLabels}
</svg>`;
}

function linesForDataBinding(
  target: TemplateEditTarget,
  slide: DeckSlide,
  outputSlide: number
) {
  const sectionLabel = sectionChromeTitle(slide);
  const presentationTitle = deckChromeTitle(slide);

  switch (target.dataBinding) {
    case "slide.title":
      return [slide.title];
    case "system.generated_by":
      return [preparedForLine()];
    case "system.deck_title":
      return [presentationTitle];
    case "system.section_label":
      return [sectionLabel];
    case "system.output_slide_number":
      return [String(outputSlide).padStart(2, "0")];
    case "fields.client_name":
      return [String(slide.fields.client_name ?? slide.title)];
    case "fields.subtitle":
      return [String(slide.fields.subtitle ?? "Brand-governed customer report")];
    case "fields.report_period":
      return [String(slide.fields.report_period ?? "")];
    case "fields.business_impact":
      return [String(slide.fields.business_impact ?? "")];
    case "fields.business_impact_and_summary_points":
      return summaryWithImpact(slide);
    case "fields.summary_points[0..1]":
      return asStringArray(slide.fields.summary_points).slice(0, 2);
    case "fields.summary_points[2..3]":
      return asStringArray(slide.fields.summary_points).slice(2, 4);
    case "fields.metric_context":
      return [String(slide.fields.metric_context ?? "")];
    case "fields.adoption_score":
      return ["Adoption Score", formatMetric(slide.fields.adoption_score, "%")];
    case "fields.active_users":
      return ["Active Users", fieldNumber(slide, "active_users")];
    case "fields.licensed_users":
      return ["Licensed Users", fieldNumber(slide, "licensed_users")];
    case "fields.mobile_usage_rate":
      return ["Mobile Usage", formatMetric(slide.fields.mobile_usage_rate, "%")];
    case "system.kpi_label_adoption":
      return ["ADOPTION"];
    case "system.kpi_label_users":
      return ["ACTIVE USERS"];
    case "system.kpi_label_mobile":
      return ["MOBILE"];
    case "fields.kpi_adoption_point":
      return kpiPointLines(
        slide,
        "Adoption Score",
        formatMetric(slide.fields.adoption_score, "%")
      );
    case "fields.kpi_active_users_point":
      return kpiPointLines(slide, "Active Users", fieldNumber(slide, "active_users"));
    case "fields.kpi_mobile_point":
      return kpiPointLines(
        slide,
        "Mobile Usage",
        formatMetric(slide.fields.mobile_usage_rate, "%")
      );
    case "fields.kpi_licensed_category":
      return [`Licensed: ${fieldNumber(slide, "licensed_users")}`];
    case "fields.kpi_projects_category":
      return [`Projects: ${fieldNumber(slide, "projects_active")}`];
    case "fields.kpi_coverage_category":
      return [`Coverage: ${adoptionCoverage(slide)}%`];
    case "fields.kpi_focus_category":
      return [`Focus: ${kpiFocusFeature(slide)}`];
    case "fields.trend_summary":
      return [String(slide.fields.trend_summary ?? "")];
    case "fields.trend_points":
      return trendPointLines(slide);
    case "fields.feature_metrics":
      return featureTableValues(slide);
    case "fields.risk_summary":
      return [String(slide.fields.risk_summary ?? "")];
    case "fields.recommendations[0]":
      return [asStringArray(slide.fields.recommendations)[0] ?? ""];
    case "fields.recommendations[1]": {
      const recommendations = asStringArray(slide.fields.recommendations);
      return [recommendations[1] ?? recommendations[2] ?? ""];
    }
    case "fields.note":
      return [String(slide.fields.note ?? "")];
    case "fields.steps[0]":
      return [asStringArray(slide.fields.steps)[0] ?? ""];
    case "fields.steps[1]":
      return [asStringArray(slide.fields.steps)[1] ?? ""];
    case "fields.steps[2]":
      return [asStringArray(slide.fields.steps)[2] ?? ""];
    case "fields.agenda_items[0]":
      return [asStringArray(slide.fields.agenda_items)[0] ?? ""];
    case "fields.agenda_items[1]":
      return [asStringArray(slide.fields.agenda_items)[1] ?? ""];
    case "fields.agenda_items[2]":
      return [asStringArray(slide.fields.agenda_items)[2] ?? ""];
    case "fields.agenda_items[3]":
      return [asStringArray(slide.fields.agenda_items)[3] ?? ""];
    case "fields.agenda_items[4]":
      return [asStringArray(slide.fields.agenda_items)[4] ?? ""];
    case "fields.agenda_items[5]":
      return [asStringArray(slide.fields.agenda_items)[5] ?? ""];
    default:
      return [];
  }
}

function buildManifestEditTargets(
  slide: DeckSlide,
  outputSlide: number,
  sourceSlide: number,
  templateKit: TemplateKit
): SlideEditTarget[] {
  return targetsForLayout(slide.layout_id, templateKit)
    .filter((target) => target.sourceSlide === sourceSlide)
    .map((target) => ({
      shapeId: target.objectId,
      objectType: target.objectType,
      lines: linesForDataBinding(target, slide, outputSlide),
      clearWhenEmpty: !target.required
    }));
}

export type CloneEditBindingAudit = {
  passed: boolean;
  checks: Array<{
    id: string;
    label: string;
    passed: boolean;
    detail: string;
    slideTitle?: string;
  }>;
};

export function auditCloneEditBindings({
  templateKit,
  frameMapArtifact,
  deckPlan,
  allowLocalFallback = false
}: {
  templateKit: TemplateKit;
  frameMapArtifact: TemplateFrameMapArtifact;
  deckPlan: DeckPlan;
  allowLocalFallback?: boolean;
}): CloneEditBindingAudit {
  const localFallbackAllowed =
    allowLocalFallback && process.env.NODE_ENV !== "production";
  const checks: CloneEditBindingAudit["checks"] = [];

  frameMapArtifact.outputSlides.forEach((mapping, index) => {
    const slide = deckPlan.slides[index];
    const targets = slide
      ? targetsForLayout(slide.layout_id, templateKit).filter(
          (target) => target.sourceSlide === mapping.sourceSlide
        )
      : [];

    checks.push({
      id: `slide-${mapping.outputSlide}:binding-map`,
      label: "Approved object bindings",
      passed: targets.length > 0 || localFallbackAllowed,
      detail:
        targets.length > 0
          ? `${targets.length} governed object binding(s) found.`
          : localFallbackAllowed
            ? "No object bindings found; local fallback explicitly allowed."
            : "No approved object bindings found for this mapped slide.",
      slideTitle: slide?.title
    });

    targets
      .filter((target) => target.required)
      .forEach((target) => {
        const lines = slide
          ? normalizeTextLines(
              linesForDataBinding(target, slide, mapping.outputSlide),
              false
            )
          : [];
        const hasContent = lines.some((line) => String(line).trim().length > 0);

        checks.push({
          id: `slide-${mapping.outputSlide}:${target.objectId}:${target.dataBinding}`,
          label: `Required binding: ${target.role}`,
          passed: hasContent,
          detail: hasContent
            ? `${target.dataBinding} resolves to client-visible content.`
            : `${target.dataBinding} resolves empty for object ${target.objectId}.`,
          slideTitle: slide?.title
        });
      });
  });

  return {
    passed: checks.every((check) => check.passed),
    checks
  };
}

function buildChromeEditTargets(slide: DeckSlide, outputSlide: number): SlideEditTarget[] {
  const commonChrome = [
    { shapeId: "2479", lines: [String(outputSlide).padStart(2, "0")] },
    { shapeId: "2642", lines: [String(outputSlide).padStart(2, "0")] },
    { shapeId: "2733", lines: [String(outputSlide).padStart(2, "0")] },
    { shapeId: "4673", lines: [String(outputSlide).padStart(2, "0")] },
    { shapeId: "4706", lines: [String(outputSlide).padStart(2, "0")] },
    { shapeId: "3338", lines: [String(outputSlide).padStart(2, "0")] },
    { shapeId: "3416", lines: [String(outputSlide).padStart(2, "0")] }
  ];
  const sectionLabel = sectionChromeTitle(slide);
  const presentationTitle = deckChromeTitle(slide);

  switch (slide.layout_id) {
    case "agenda":
      return [
        { shapeId: "2467", lines: [presentationTitle] },
        commonChrome[0]
      ];
    case "executive_summary":
      return [
        { shapeId: "2643", lines: [presentationTitle] },
        { shapeId: "2644", lines: [sectionLabel] },
        commonChrome[1]
      ];
    case "adoption_kpi_scorecard":
      return [
        { shapeId: "2734", lines: [presentationTitle] },
        { shapeId: "2735", lines: [sectionLabel] },
        commonChrome[2]
      ];
    case "usage_trend":
      return [
        { shapeId: "4669", lines: [presentationTitle] },
        { shapeId: "4670", lines: [sectionLabel] },
        commonChrome[3]
      ];
    case "feature_adoption":
      return [
        { shapeId: "4707", lines: [presentationTitle] },
        { shapeId: "4708", lines: [sectionLabel] },
        commonChrome[4]
      ];
    case "risks_recommendations":
      return [
        { shapeId: "3326", lines: [presentationTitle] },
        { shapeId: "3327", lines: [sectionLabel] },
        commonChrome[5]
      ];
    case "next_steps":
      return [
        { shapeId: "3417", lines: [presentationTitle] },
        { shapeId: "3418", lines: [sectionLabel] },
        commonChrome[6]
      ];
    default:
      return [];
  }
}

function buildLegacySlideEditTargets(
  slide: DeckSlide,
  outputSlide: number
): SlideEditTarget[] {
  const commonChrome = [
    { shapeId: "2479", lines: [String(outputSlide).padStart(2, "0")] },
    { shapeId: "2642", lines: [String(outputSlide).padStart(2, "0")] },
    { shapeId: "2733", lines: [String(outputSlide).padStart(2, "0")] },
    { shapeId: "4673", lines: [String(outputSlide).padStart(2, "0")] },
    { shapeId: "4706", lines: [String(outputSlide).padStart(2, "0")] },
    { shapeId: "3338", lines: [String(outputSlide).padStart(2, "0")] },
    { shapeId: "3416", lines: [String(outputSlide).padStart(2, "0")] }
  ];
  const sectionLabel = sectionChromeTitle(slide);
  const presentationTitle = deckChromeTitle(slide);

  switch (slide.layout_id) {
    case "title_client_report":
      return [
        {
          shapeId: "2427",
          lines: [String(slide.fields.client_name ?? slide.title)]
        },
        {
          shapeId: "2428",
          lines: [String(slide.fields.subtitle ?? "Brand-governed customer report")]
        },
        {
          shapeId: "2429",
          lines: [String(slide.fields.report_period ?? "")]
        },
        { shapeId: "2430", lines: [preparedForLine()] }
      ];
    case "agenda": {
      const agendaItems = asStringArray(slide.fields.agenda_items).slice(0, 6);
      const agendaItemShapeIds = ["2465", "2468", "2470", "2472", "2474", "2476"];
      return [
        { shapeId: "2467", lines: [presentationTitle] },
        { shapeId: "2478", lines: [slide.title.toUpperCase()] },
        ...agendaItemShapeIds.map((shapeId, index) => ({
          shapeId,
          lines: [agendaItems[index] ?? ""],
          clearWhenEmpty: true
        })),
        commonChrome[0]
      ];
    }
    case "executive_summary": {
      const summaryPoints = asStringArray(slide.fields.summary_points);
      return [
        { shapeId: "2640", lines: [slide.title] },
        { shapeId: "2641", lines: [String(slide.fields.business_impact ?? "")] },
        { shapeId: "2639", lines: summaryPoints.slice(0, 2) },
        { shapeId: "2645", lines: summaryPoints.slice(2, 4) },
        { shapeId: "2643", lines: [presentationTitle] },
        { shapeId: "2644", lines: [sectionLabel] },
        commonChrome[1]
      ];
    }
    case "adoption_kpi_scorecard":
      return [
        { shapeId: "2736", lines: [slide.title] },
        { shapeId: "2737", lines: [String(slide.fields.metric_context ?? "")] },
        {
          shapeId: "2739",
          lines: ["Adoption Score", formatMetric(slide.fields.adoption_score, "%")]
        },
        {
          shapeId: "2741",
          lines: ["Active Users", fieldNumber(slide, "active_users")]
        },
        {
          shapeId: "2743",
          lines: ["Licensed Users", fieldNumber(slide, "licensed_users")]
        },
        {
          shapeId: "2745",
          lines: [
            "Mobile Usage",
            formatMetric(slide.fields.mobile_usage_rate, "%")
          ]
        },
        { shapeId: "2734", lines: [presentationTitle] },
        { shapeId: "2735", lines: [sectionLabel] },
        commonChrome[2]
      ];
    case "usage_trend":
      return [
        { shapeId: "4671", lines: [slide.title] },
        { shapeId: "4672", lines: [String(slide.fields.trend_summary ?? "")] },
        { shapeId: "4675", lines: trendPointLines(slide) },
        { shapeId: "4669", lines: [presentationTitle] },
        { shapeId: "4670", lines: [sectionLabel] },
        commonChrome[3]
      ];
    case "feature_adoption":
      return [
        { shapeId: "4707", lines: [presentationTitle] },
        { shapeId: "4708", lines: [sectionLabel] },
        commonChrome[4]
      ];
    case "risks_recommendations": {
      const recommendations = asStringArray(slide.fields.recommendations);
      return [
        { shapeId: "3328", lines: [slide.title] },
        { shapeId: "3330", lines: [String(slide.fields.risk_summary ?? "")] },
        { shapeId: "3332", lines: [recommendations[0] ?? ""] },
        { shapeId: "3334", lines: [recommendations[1] ?? recommendations[2] ?? ""] },
        { shapeId: "3326", lines: [presentationTitle] },
        { shapeId: "3327", lines: [sectionLabel] },
        commonChrome[5]
      ];
    }
    case "next_steps": {
      const steps = asStringArray(slide.fields.steps).slice(0, 3);
      return [
        { shapeId: "3419", lines: [slide.title] },
        { shapeId: "3420", lines: [String(slide.fields.note ?? "")] },
        ...steps.map((step, index) => ({
          shapeId: String(3425 + index),
          lines: [step]
        })),
        { shapeId: "3417", lines: [presentationTitle] },
        { shapeId: "3418", lines: [sectionLabel] },
        commonChrome[6]
      ];
    }
    default:
      return [];
  }
}

function applyDeckPlanEdits(
  slideXml: string,
  slide: DeckSlide,
  outputSlide: number,
  sourceSlide: number,
  templateKit: TemplateKit
) {
  const manifestTargets = buildManifestEditTargets(
    slide,
    outputSlide,
    sourceSlide,
    templateKit
  );
  const editTargets =
    manifestTargets.length > 0
      ? [...manifestTargets, ...buildChromeEditTargets(slide, outputSlide)]
      : buildLegacySlideEditTargets(slide, outputSlide);

  let editedXml = editTargets.reduce((xml, target) => {
    const lines = normalizeTextLines(target.lines, target.clearWhenEmpty);

    if (target.objectType === "table_cell") {
      return replaceGraphicFrameTextsById(xml, target.shapeId, lines);
    }

    return replaceShapeTextById(xml, target.shapeId, lines);
  }, slideXml);

  editedXml = applyTemplateTextFitGuards(editedXml, slide, sourceSlide);

  if (slide.layout_id === "usage_trend" && sourceSlide === 129) {
    editedXml = applyStackedTrendLayoutPolish(editedXml);
  }

  return clearForbiddenPlaceholderTextBodies(editedXml);
}

function trendChartPictureId(sourceSlide: number) {
  const pictureIds: Record<number, string> = {
    129: "4626",
    132: "4674"
  };

  return pictureIds[sourceSlide] ?? "4674";
}

async function buildClonedTemplateZip(
  templateKit: TemplateKit,
  frameMapArtifact: TemplateFrameMapArtifact,
  deckPlan?: DeckPlan
) {
  if (!frameMapArtifact.validation.passed) {
    throw new Error("Template frame map is incomplete. Starter deck cannot be cloned.");
  }

  const zip = await JSZip.loadAsync(templateKit.buffer);
  const presentationEntry = zip.file("ppt/presentation.xml");
  const presentationRelsEntry = zip.file("ppt/_rels/presentation.xml.rels");
  const contentTypesEntry = zip.file("[Content_Types].xml");

  if (!presentationEntry || !presentationRelsEntry || !contentTypesEntry) {
    throw new Error("Template PPTX is missing required presentation package parts.");
  }

  let contentTypesXml = await contentTypesEntry.async("string");
  const newSlides: Array<{
    slideNumber: number;
    slidePart: string;
    relId: string;
    slideId: number;
  }> = [];

  for (const [index, mapping] of frameMapArtifact.outputSlides.entries()) {
    const sourceSlidePart = `ppt/slides/slide${mapping.sourceSlide}.xml`;
    const sourceSlideRelsPart = `ppt/slides/_rels/slide${mapping.sourceSlide}.xml.rels`;
    const sourceSlideEntry = zip.file(sourceSlidePart);

    if (!sourceSlideEntry) {
      throw new Error(`Mapped source slide ${mapping.sourceSlide} was not found.`);
    }

    const clonedSlideNumber = CLONED_SLIDE_NUMBER_START + index;
    const clonedSlidePart = `ppt/slides/slide${clonedSlideNumber}.xml`;
    const clonedSlideRelsPart = `ppt/slides/_rels/slide${clonedSlideNumber}.xml.rels`;
    const clonedRelId = `rId${CLONED_REL_ID_START + index}`;

    const deckSlide = deckPlan?.slides[index];
    const sourceSlideXml = await sourceSlideEntry.async("string");
    const clonedSlideXml = deckSlide
      ? applyDeckPlanEdits(
          sourceSlideXml,
          deckSlide,
          mapping.outputSlide,
          mapping.sourceSlide,
          templateKit
        )
      : sourceSlideXml;
    zip.file(clonedSlidePart, clonedSlideXml);

    const sourceRelsEntry = zip.file(sourceSlideRelsPart);
    const sourceRelsXml = sourceRelsEntry
      ? await sourceRelsEntry.async("string")
      : undefined;
    let clonedRelsXml = removeRelationshipsByType(
      ensureRelationshipsRoot(sourceRelsXml),
      NOTES_REL_TYPE
    );

    if (deckSlide?.layout_id === "usage_trend") {
      const chartRelationshipId = findPictureRelationshipId(
        clonedSlideXml,
        trendChartPictureId(mapping.sourceSlide)
      );

      if (chartRelationshipId) {
        const chartAssetName = `branddeck-trend-${clonedSlideNumber}.svg`;

        zip.file(`ppt/media/${chartAssetName}`, trendChartSvg(deckSlide));
        clonedRelsXml = replaceRelationshipTarget(
          clonedRelsXml,
          chartRelationshipId,
          `../media/${chartAssetName}`
        );
        contentTypesXml = ensureDefaultContentType(
          contentTypesXml,
          "svg",
          SVG_CONTENT_TYPE
        );
      }
    }

    zip.file(clonedSlideRelsPart, clonedRelsXml);

    contentTypesXml = ensureSlideOverride(contentTypesXml, clonedSlidePart);
    newSlides.push({
      slideNumber: clonedSlideNumber,
      slidePart: clonedSlidePart.replace(/^ppt\//, ""),
      relId: clonedRelId,
      slideId: CLONED_SLIDE_NUMBER_START + index
    });
  }

  const presentationXml = replaceSlideIdList(
    await presentationEntry.async("string"),
    newSlides.map((slide) => ({ id: slide.slideId, relId: slide.relId }))
  );
  const presentationRelsXml = appendRelationships(
    removeRelationshipsByType(await presentationRelsEntry.async("string"), SLIDE_REL_TYPE),
    newSlides.map((slide) => ({
      id: slide.relId,
      type: SLIDE_REL_TYPE,
      target: slide.slidePart
    }))
  );

  zip.file("ppt/presentation.xml", presentationXml);
  zip.file("ppt/_rels/presentation.xml.rels", presentationRelsXml);
  zip.file("[Content_Types].xml", contentTypesXml);

  return zip;
}

async function generateZipBuffer(zip: JSZip) {
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: {
      level: 6
    }
  });
}

export async function renderCloneStarterPptx(
  templateKit: TemplateKit,
  frameMapArtifact: TemplateFrameMapArtifact
) {
  return generateZipBuffer(
    await buildClonedTemplateZip(templateKit, frameMapArtifact)
  );
}

export async function renderCloneEditedPptx(
  templateKit: TemplateKit,
  frameMapArtifact: TemplateFrameMapArtifact,
  deckPlan: DeckPlan
) {
  return generateZipBuffer(
    await buildClonedTemplateZip(templateKit, frameMapArtifact, deckPlan)
  );
}
