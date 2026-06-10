import JSZip from "jszip";

/**
 * A text-bearing object detected inside a template source slide. objectId is
 * the drawing id (`p:cNvPr id`) the clone-edit renderer targets, so a mapping
 * built from these objects is renderer-ready without hand-authored JSON.
 */
export type TemplateSlideTextObject = {
  objectId: string;
  objectName: string;
  objectType: "text_box" | "table_cell";
  textPreview: string;
  characterCount: number;
};

function decodeXmlText(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function drawingProperties(blockXml: string) {
  const tag = blockXml.match(/<p:cNvPr\b[^>]*>/)?.[0];

  if (!tag) {
    return null;
  }

  const id = tag.match(/\bid="(\d+)"/)?.[1];
  const name = tag.match(/\bname="([^"]*)"/)?.[1];

  return id ? { id, name: decodeXmlText(name ?? "") } : null;
}

function textContent(blockXml: string) {
  const parts: string[] = [];

  for (const match of blockXml.matchAll(/<a:t>([^<]*)<\/a:t>/g)) {
    parts.push(decodeXmlText(match[1]).trim());
  }

  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function extractObjectsFromSlideXml(slideXml: string): TemplateSlideTextObject[] {
  const objects: Array<TemplateSlideTextObject & { position: number }> = [];

  for (const match of slideXml.matchAll(/<p:sp\b[\s\S]*?<\/p:sp>/g)) {
    const blockXml = match[0];

    if (!blockXml.includes("<p:txBody>")) {
      continue;
    }

    const properties = drawingProperties(blockXml);

    if (!properties) {
      continue;
    }

    const text = textContent(blockXml);
    objects.push({
      objectId: properties.id,
      objectName: properties.name,
      objectType: "text_box",
      textPreview: text.slice(0, 120),
      characterCount: text.length,
      position: match.index ?? 0
    });
  }

  for (const match of slideXml.matchAll(
    /<p:graphicFrame\b[\s\S]*?<\/p:graphicFrame>/g
  )) {
    const blockXml = match[0];

    if (!blockXml.includes("<a:tbl>")) {
      continue;
    }

    const properties = drawingProperties(blockXml);

    if (!properties) {
      continue;
    }

    const text = textContent(blockXml);
    objects.push({
      objectId: properties.id,
      objectName: properties.name,
      objectType: "table_cell",
      textPreview: text.slice(0, 120),
      characterCount: text.length,
      position: match.index ?? 0
    });
  }

  return objects
    .sort((a, b) => a.position - b.position)
    .map(({ position: _position, ...object }) => object);
}

/**
 * List the text boxes and tables on the requested template source slides.
 * Pure read over the PPTX buffer - nothing is persisted.
 */
export async function extractTemplateTextObjects(
  buffer: Buffer,
  sourceSlides: number[]
): Promise<Record<number, TemplateSlideTextObject[]>> {
  const zip = await JSZip.loadAsync(buffer);
  const uniqueSlides = [...new Set(sourceSlides)].filter(
    (slide) => Number.isInteger(slide) && slide >= 1
  );
  const result: Record<number, TemplateSlideTextObject[]> = {};

  await Promise.all(
    uniqueSlides.map(async (sourceSlide) => {
      const file = zip.file(`ppt/slides/slide${sourceSlide}.xml`);
      const slideXml = file ? await file.async("string") : "";
      result[sourceSlide] = slideXml ? extractObjectsFromSlideXml(slideXml) : [];
    })
  );

  return result;
}
