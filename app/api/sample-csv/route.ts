import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
  const csvPath = path.join(
    process.cwd(),
    "data",
    "branddeck-test-client-adoption.csv"
  );
  const csv = await readFile(csvPath, "utf8");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="sample-client-metrics.csv"'
    }
  });
}
