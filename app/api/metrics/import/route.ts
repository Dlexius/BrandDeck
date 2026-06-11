import { NextResponse } from "next/server";

import { importBiMetricExportText } from "@/lib/bi-csv-import";
import { extractMetricExportText } from "@/lib/metric-export-text-extraction";

export const runtime = "nodejs";

const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const metricFile = formData.get("file");

    if (!(metricFile instanceof File)) {
      return NextResponse.json(
        { error: "Upload a CSV, TSV, TXT, PDF, or PPTX metrics export." },
        { status: 400 }
      );
    }

    if (metricFile.size > MAX_IMPORT_BYTES) {
      return NextResponse.json(
        { error: "Metrics exports must be 20 MB or smaller." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await metricFile.arrayBuffer());
    const { sourceFormat, text } = await extractMetricExportText({
      fileName: metricFile.name,
      mimeType: metricFile.type,
      buffer
    });

    if (!text.trim()) {
      return NextResponse.json(
        {
          error:
            "No selectable text was found in this export. Use Power BI's PDF export with report text, or export the visual data as CSV."
        },
        { status: 400 }
      );
    }

    const imported = importBiMetricExportText(text, {
      fileName: metricFile.name,
      sourceFormat
    });

    return NextResponse.json({
      schema: "branddeck.metric-import/v1",
      imported
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to import the metrics export."
      },
      { status: 400 }
    );
  }
}
