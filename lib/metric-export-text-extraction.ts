import JSZip from "jszip";

import { inferBiMetricSourceFormat, type BiMetricSourceFormat } from "@/lib/bi-csv-import";

const MAX_TEXT_CHARS = 250_000;

function decodeXmlText(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10))
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

async function extractPdfText(buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const result = await parser.getText();
    return result.text.slice(0, MAX_TEXT_CHARS);
  } finally {
    await parser.destroy();
  }
}

async function extractPptxText(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort(
      (a, b) =>
        Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0) -
        Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0)
    );
  const slideTexts: string[] = [];

  for (const slideName of slideNames) {
    const file = zip.files[slideName];

    if (!file) {
      continue;
    }

    const xml = await file.async("string");
    const text = Array.from(xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g))
      .map((match) => decodeXmlText(match[1] ?? ""))
      .map((part) => part.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\t");

    if (text) {
      slideTexts.push(text);
    }
  }

  return slideTexts.join("\n").slice(0, MAX_TEXT_CHARS);
}

export async function extractMetricExportText({
  fileName,
  mimeType,
  buffer
}: {
  fileName: string;
  mimeType?: string;
  buffer: Buffer;
}): Promise<{ sourceFormat: BiMetricSourceFormat; text: string }> {
  const sourceFormat = inferBiMetricSourceFormat(fileName, mimeType);

  if (sourceFormat === "pdf") {
    return {
      sourceFormat,
      text: await extractPdfText(buffer)
    };
  }

  if (sourceFormat === "pptx") {
    return {
      sourceFormat,
      text: await extractPptxText(buffer)
    };
  }

  return {
    sourceFormat,
    text: buffer.toString("utf8").replace(/^\uFEFF/, "").slice(0, MAX_TEXT_CHARS)
  };
}
