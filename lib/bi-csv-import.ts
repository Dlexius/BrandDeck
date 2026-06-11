import Papa from "papaparse";
import type { AdoptionCsvRow } from "@/lib/generateDeckPlan";
import { parseBusinessMetricRows } from "@/lib/metric-snapshot-adapter";

/**
 * Flexible BI-export intake: turns a CSV/TSV export from Power BI, Tableau,
 * Looker, or a plain spreadsheet into the same governed metric rows the
 * manual snapshot form produces. Recognized columns map onto the standard
 * adoption fields; every other column survives as a flexible context-pack
 * metric so the planner can still see it as evidence.
 */

export type ImportedMetricRow = AdoptionCsvRow &
  Record<string, string | number | null | undefined>;

export type BiMetricSourceFormat = "csv" | "tsv" | "text" | "pdf" | "pptx";

export type BiMetricImport = {
  fileName: string;
  sourceFormat: BiMetricSourceFormat;
  rows: ImportedMetricRow[];
  clientName: string;
  periods: string[];
  mappedColumns: Array<{ header: string; field: StandardField }>;
  metricColumns: Array<{ header: string; key: string }>;
  ignoredColumns: string[];
  metricCount: number;
  warnings: string[];
};

export type StandardField = keyof typeof STANDARD_FIELD_LABELS;

/**
 * Standard adoption fields. Workflow-specific counts (daily logs, RFIs,
 * inspections, tickets, ...) are intentionally NOT standard fields - they
 * import as flexible workflow metric columns so the intake works for any
 * product's workflows, not one vendor's tool names.
 */
export const STANDARD_FIELD_LABELS = {
  client_name: "Client",
  report_period: "Period",
  active_users: "Active Users",
  licensed_users: "Licensed Users",
  adoption_score: "Adoption Score",
  projects_active: "Active Projects",
  mobile_usage_rate: "Mobile Usage",
  top_feature: "Top Workflow",
  lowest_feature: "Lowest Workflow",
  risk_summary: "Risk Summary",
  recommendation_1: "Recommendation 1",
  recommendation_2: "Recommendation 2",
  recommendation_3: "Recommendation 3"
} as const;

const ADOPTION_REQUIRED_FIELDS: StandardField[] = [
  "client_name",
  "report_period",
  "active_users",
  "adoption_score"
];

/** Standard fields whose values are 0-100 percentages. */
const RATE_FIELDS = new Set<StandardField>([
  "adoption_score",
  "mobile_usage_rate"
]);

const TEXT_FIELDS = new Set<StandardField>([
  "client_name",
  "report_period",
  "top_feature",
  "lowest_feature",
  "risk_summary",
  "recommendation_1",
  "recommendation_2",
  "recommendation_3"
]);

/**
 * Header synonyms by standard field, matched against the normalized header
 * (lowercased, punctuation collapsed to single spaces). Order matters: the
 * first field whose synonym matches claims the column.
 */
const STANDARD_FIELD_SYNONYMS: Array<{
  field: StandardField;
  headers: string[];
}> = [
  {
    field: "client_name",
    headers: [
      "client name",
      "client",
      "account name",
      "account",
      "customer name",
      "customer",
      "company name",
      "company"
    ]
  },
  {
    field: "report_period",
    headers: [
      "report period",
      "reporting period",
      "period name",
      "fiscal period",
      "period",
      "report month",
      "month",
      "quarter",
      "report date",
      "date",
      "week"
    ]
  },
  {
    field: "active_users",
    headers: [
      "active users",
      "monthly active users",
      "weekly active users",
      "mau",
      "wau",
      "active user count",
      "users active",
      "active members"
    ]
  },
  {
    field: "licensed_users",
    headers: [
      "licensed users",
      "licensed seats",
      "total licenses",
      "licenses",
      "total seats",
      "seats",
      "provisioned users",
      "paid seats",
      "assigned seats"
    ]
  },
  {
    field: "adoption_score",
    headers: [
      "adoption score",
      "adoption rate",
      "adoption percent",
      "adoption percentage",
      "adoption pct",
      "adoption",
      "usage score",
      "utilization score"
    ]
  },
  {
    field: "projects_active",
    headers: [
      "active projects",
      "projects active",
      "project count",
      "open projects",
      "tracked projects",
      "projects"
    ]
  },
  {
    field: "mobile_usage_rate",
    headers: [
      "mobile usage rate",
      "mobile usage",
      "mobile adoption",
      "mobile percent",
      "mobile rate",
      "mobile",
      "field usage rate"
    ]
  },
  {
    field: "top_feature",
    headers: [
      "top feature",
      "top workflow",
      "top tool",
      "strongest workflow",
      "strongest feature"
    ]
  },
  {
    field: "lowest_feature",
    headers: [
      "lowest feature",
      "lowest workflow",
      "lowest tool",
      "weakest workflow",
      "weakest feature",
      "focus area",
      "focus workflow"
    ]
  },
  {
    field: "risk_summary",
    headers: ["risk summary", "risk notes", "key risk", "risks", "risk"]
  },
  {
    field: "recommendation_1",
    headers: [
      "recommendation 1",
      "recommended action 1",
      "action 1",
      "next step 1",
      "recommendation"
    ]
  },
  {
    field: "recommendation_2",
    headers: [
      "recommendation 2",
      "recommended action 2",
      "action 2",
      "next step 2"
    ]
  },
  {
    field: "recommendation_3",
    headers: [
      "recommendation 3",
      "recommended action 3",
      "action 3",
      "next step 3"
    ]
  }
];

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
];

const POWERBI_SUMMARY_COLUMNS = [
  "total_records",
  "past_90_records",
  "projects",
  "tools",
  "email_domains",
  "users"
] as const;

type PowerBiSummaryColumn = (typeof POWERBI_SUMMARY_COLUMNS)[number];

type PowerBiSummaryRow = Partial<Record<PowerBiSummaryColumn, number>> & {
  tool: string;
};

function normalizeHeader(header: string) {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeMetricKey(header: string) {
  return (
    header
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "metric"
  );
}

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function inferBiMetricSourceFormat(
  fileName: string,
  mimeType = ""
): BiMetricSourceFormat {
  const lowerName = fileName.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (lowerName.endsWith(".pdf") || lowerMime.includes("pdf")) {
    return "pdf";
  }

  if (
    lowerName.endsWith(".pptx") ||
    lowerMime.includes("presentationml.presentation")
  ) {
    return "pptx";
  }

  if (
    lowerName.endsWith(".tsv") ||
    lowerMime.includes("tab-separated-values")
  ) {
    return "tsv";
  }

  if (lowerName.endsWith(".txt") || lowerMime.includes("text/plain")) {
    return "text";
  }

  return "csv";
}

function toNumber(value: string) {
  const cleaned = value.replace(/[,%$\s]/g, "");

  if (!cleaned || !/^-?\d*\.?\d+$/.test(cleaned)) {
    return Number.NaN;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function looksLikeRateKey(key: string) {
  return /(rate|percent|percentage|pct|score)$/.test(key);
}

/**
 * Sortable value for common reporting-period spellings, or null when the
 * format is unrecognized. Rows are only re-ordered when every period parses.
 */
export function periodSortValue(period: string): number | null {
  const value = compactText(period).toLowerCase();

  const iso = value.match(/^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?$/);
  if (iso) {
    return (
      Number(iso[1]) * 10000 + Number(iso[2]) * 100 + Number(iso[3] ?? 0)
    );
  }

  const monthName = value.match(/^([a-z]{3,9})\.?\s+(\d{4})$/);
  if (monthName) {
    const monthIndex = MONTHS.findIndex((month) =>
      month.startsWith(monthName[1].slice(0, 3))
    );
    if (monthIndex >= 0) {
      return Number(monthName[2]) * 10000 + (monthIndex + 1) * 100;
    }
  }

  const quarter =
    value.match(/^q([1-4])\s*(\d{4})$/) ?? value.match(/^(\d{4})\s*q([1-4])$/);
  if (quarter) {
    const first = Number(quarter[1]);
    const second = Number(quarter[2]);
    const year = first > 4 ? first : second;
    const quarterNumber = first > 4 ? second : first;
    return year * 10000 + quarterNumber * 300;
  }

  const usDate = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usDate) {
    const year = Number(usDate[3]) < 100 ? 2000 + Number(usDate[3]) : Number(usDate[3]);
    return year * 10000 + Number(usDate[1]) * 100 + Number(usDate[2]);
  }

  if (/^\d{4}$/.test(value)) {
    return Number(value) * 10000;
  }

  return null;
}

function mapHeaders(headers: string[]) {
  const mappedColumns: Array<{ header: string; field: StandardField }> = [];
  const claimedFields = new Set<StandardField>();
  const claimedHeaders = new Set<string>();

  for (const { field, headers: synonyms } of STANDARD_FIELD_SYNONYMS) {
    for (const synonym of synonyms) {
      const match = headers.find(
        (header) =>
          !claimedHeaders.has(header) && normalizeHeader(header) === synonym
      );

      if (match && !claimedFields.has(field)) {
        mappedColumns.push({ header: match, field });
        claimedFields.add(field);
        claimedHeaders.add(match);
        break;
      }
    }
  }

  return { mappedColumns, claimedHeaders };
}

function parseDelimitedText(text: string) {
  let content = text.replace(/^\uFEFF/, "");
  let delimiter = "";

  // Excel writes a "sep=;" hint line above the header; honor and drop it.
  const sepHint = content.match(/^sep=(.)\r?\n/i);
  if (sepHint) {
    delimiter = sepHint[1];
    content = content.slice(sepHint[0].length);
  }

  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: "greedy",
    delimiter,
    delimitersToGuess: [",", "\t", ";", "|"],
    transformHeader: (header) => compactText(header)
  });

  // Papa falls back to a comma when it cannot guess the delimiter, which is
  // fine for single-column files; only quote/structure errors are fatal.
  const fatalErrors = parsed.errors.filter(
    (error) =>
      error.type === "Quotes" ||
      (error.type === "Delimiter" && error.code !== "UndetectableDelimiter")
  );

  if (fatalErrors.length > 0) {
    throw new Error(
      `Could not read the file as a CSV export: ${fatalErrors[0].message}`
    );
  }

  const headers = (parsed.meta.fields ?? []).filter(Boolean);
  const records = parsed.data.filter((record) =>
    Object.values(record).some((value) => compactText(String(value ?? "")))
  );

  if (headers.length === 0 || records.length === 0) {
    throw new Error(
      "The file has no readable data rows. Export a table with a header row and one row per reporting period."
    );
  }

  return { headers, records };
}

/**
 * Power BI often exports rates as 0-1 fractions. When every numeric value in
 * a rate column sits in (0, 1], scale the column to 0-100 percentages.
 */
function scaleFractionColumn(values: number[]) {
  const finite = values.filter((value) => Number.isFinite(value));
  return (
    finite.length > 0 &&
    finite.every((value) => value > 0 && value <= 1)
  );
}

export function importBiMetricCsv(
  text: string,
  options: { fileName?: string; sourceFormat?: BiMetricSourceFormat } = {}
): BiMetricImport {
  const fileName = options.fileName ?? "BI export";
  const { headers, records } = parseDelimitedText(text);
  const warnings: string[] = [];
  const { mappedColumns, claimedHeaders } = mapHeaders(headers);
  const fieldByHeader = new Map(
    mappedColumns.map(({ header, field }) => [header, field])
  );

  // Classify unmapped columns: numeric-or-text context metrics vs empty noise.
  const metricColumns: Array<{ header: string; key: string }> = [];
  const ignoredColumns: string[] = [];
  const reservedKeys = new Set<string>(Object.keys(STANDARD_FIELD_LABELS));

  for (const header of headers) {
    if (claimedHeaders.has(header)) {
      continue;
    }

    const key = normalizeMetricKey(header);
    const hasValues = records.some((record) =>
      compactText(String(record[header] ?? ""))
    );

    if (
      !hasValues ||
      reservedKeys.has(key) ||
      metricColumns.some((column) => column.key === key)
    ) {
      ignoredColumns.push(header);
      continue;
    }

    metricColumns.push({ header, key });
  }

  if (mappedColumns.length === 0 && metricColumns.length === 0) {
    throw new Error(
      "No usable columns found. Include columns like Client, Period, Active Users, and Adoption Score. Licensed Users can be included when available but is optional."
    );
  }

  // Detect fraction-form rate columns once per column, not per cell.
  const fractionHeaders = new Set<string>();
  for (const { header, field } of mappedColumns) {
    if (RATE_FIELDS.has(field)) {
      const values = records.map((record) => toNumber(String(record[header] ?? "")));
      if (scaleFractionColumn(values)) {
        fractionHeaders.add(header);
      }
    }
  }
  for (const { header, key } of metricColumns) {
    if (looksLikeRateKey(key)) {
      const values = records.map((record) => toNumber(String(record[header] ?? "")));
      if (scaleFractionColumn(values)) {
        fractionHeaders.add(header);
      }
    }
  }

  function cellValue(record: Record<string, string>, header: string) {
    const raw = compactText(String(record[header] ?? ""));

    if (!raw) {
      return null;
    }

    const numeric = toNumber(raw);

    if (!Number.isFinite(numeric)) {
      return raw;
    }

    return fractionHeaders.has(header)
      ? Math.round(numeric * 1000) / 10
      : numeric;
  }

  let rows: ImportedMetricRow[] = records.map((record) => {
    const row: Record<string, string | number> = {};

    for (const { header, field } of mappedColumns) {
      const value = cellValue(record, header);

      if (value === null) {
        continue;
      }

      row[field] = TEXT_FIELDS.has(field) ? String(value) : value;
    }

    for (const { header, key } of metricColumns) {
      const value = cellValue(record, header);

      if (value !== null) {
        row[key] = value;
      }
    }

    return row as ImportedMetricRow;
  });

  // A deck targets one client; when an export mixes several, keep the client
  // with the most rows so trend periods stay comparable.
  const clientCounts = new Map<string, { name: string; count: number }>();
  for (const row of rows) {
    const name = compactText(String(row.client_name ?? ""));

    if (!name) {
      continue;
    }

    const key = name.toLowerCase();
    const entry = clientCounts.get(key) ?? { name, count: 0 };
    entry.count += 1;
    clientCounts.set(key, entry);
  }

  if (clientCounts.size > 1) {
    const kept = [...clientCounts.values()].sort((a, b) => b.count - a.count)[0];
    rows = rows.filter(
      (row) =>
        compactText(String(row.client_name ?? "")).toLowerCase() ===
        kept.name.toLowerCase()
    );
    warnings.push(
      `The file contained ${clientCounts.size} clients; kept "${kept.name}" (${kept.count} row${
        kept.count === 1 ? "" : "s"
      }). Export one client per file to use the others.`
    );
  }

  // Order rows chronologically when every period parses; the latest row
  // becomes the current snapshot and earlier rows become the trend.
  const sortValues = rows.map((row) =>
    periodSortValue(String(row.report_period ?? ""))
  );
  if (rows.length > 1 && sortValues.every((value) => value !== null)) {
    const isOrdered = sortValues.every(
      (value, index) => index === 0 || (value as number) >= (sortValues[index - 1] as number)
    );

    if (!isOrdered) {
      rows = rows
        .map((row, index) => ({ row, sortValue: sortValues[index] as number, index }))
        .sort((a, b) => a.sortValue - b.sortValue || a.index - b.index)
        .map((entry) => entry.row);
      warnings.push("Rows were re-ordered chronologically by period.");
    }
  }

  if (rows.length === 0) {
    throw new Error("The file has no readable data rows after filtering.");
  }

  // Validate through the shared adapter so imported metrics are guaranteed to
  // fit the context-pack snapshot schema before they reach generation.
  const snapshots = parseBusinessMetricRows(rows, {
    source: `BI export: ${fileName}`
  });
  const metricCount = snapshots.reduce(
    (total, snapshot) => total + snapshot.metrics.length,
    0
  );

  if (metricCount === 0) {
    throw new Error(
      "No usable metric values found. Check that the export includes numeric columns."
    );
  }

  const lastRow = rows[rows.length - 1];
  const missingRequired = ADOPTION_REQUIRED_FIELDS.filter(
    (field) => !compactText(String(lastRow[field] ?? ""))
  );

  if (missingRequired.length > 0) {
    const missingLabels = missingRequired.map(
      (field) => STANDARD_FIELD_LABELS[field]
    );
    warnings.push(
      `Not mapped from the file: ${missingLabels.join(", ")}. ${
        missingLabels.length === 1
          ? "Adoption reports need this value"
          : "Adoption reports need these values"
      } - type ${
        missingLabels.length === 1 ? "it" : "them"
      } into the snapshot fields below.`
    );
  }

  return {
    fileName,
    sourceFormat: options.sourceFormat ?? "csv",
    rows,
    clientName: compactText(String(lastRow.client_name ?? "")),
    periods: rows.map((row) => compactText(String(row.report_period ?? ""))).filter(Boolean),
    mappedColumns,
    metricColumns,
    ignoredColumns,
    metricCount,
    warnings
  };
}

function looksDelimitedMetricExport(text: string) {
  const firstLines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map(compactText)
    .filter(Boolean)
    .slice(0, 5);

  return firstLines.some((line) => {
    const commaCount = (line.match(/,/g) ?? []).length;
    const tabCount = (line.match(/\t/g) ?? []).length;
    const semicolonCount = (line.match(/;/g) ?? []).length;
    const pipeCount = (line.match(/\|/g) ?? []).length;

    return Math.max(commaCount, tabCount, semicolonCount, pipeCount) >= 2;
  });
}

function cleanPowerBiText(text: string) {
  return text
    .replace(/[\uE000-\uF8FF]/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/\r/g, "");
}

function powerBiLines(text: string) {
  return cleanPowerBiText(text)
    .split("\n")
    .map((line) => line.replace(/[ ]+/g, " ").trim())
    .filter(Boolean);
}

function parseHumanNumber(value: string) {
  const suffixMatch = value.trim().match(/([kmb])$/i);
  const multiplier = suffixMatch
    ? suffixMatch[1].toLowerCase() === "k"
      ? 1_000
      : suffixMatch[1].toLowerCase() === "m"
        ? 1_000_000
        : 1_000_000_000
    : 1;
  const cleaned = value
    .replace(/[kmb]$/i, "")
    .replace(/[,\s$]/g, "")
    .trim();
  const numeric = Number(cleaned);

  return Number.isFinite(numeric) ? numeric * multiplier : Number.NaN;
}

function partitionSpaceSeparatedNumber(value: string, expectedCount: number) {
  const groups = value.match(/\d+/g) ?? [];

  if (groups.length === 0) {
    return [];
  }

  if (expectedCount <= 1 || groups.length === 1) {
    return [parseHumanNumber(groups.join(""))];
  }

  const values: number[] = [];
  const singleGroupCount = Math.min(expectedCount - 1, groups.length - 1);

  for (let index = 0; index < singleGroupCount; index += 1) {
    values.push(parseHumanNumber(groups[index]));
  }

  values.push(parseHumanNumber(groups.slice(singleGroupCount).join("")));
  return values;
}

function numberPartsFromCell(cell: string, expectedCount: number) {
  const cleaned = cell.trim();

  if (!cleaned) {
    return [];
  }

  if (
    !cleaned.includes(",") &&
    !/[kmb]/i.test(cleaned) &&
    /^\d+(?:\s+\d+)+$/.test(cleaned)
  ) {
    const groups = cleaned.match(/\d+/g) ?? [];

    if (groups.length <= 2) {
      return [parseHumanNumber(groups.join(""))];
    }

    return partitionSpaceSeparatedNumber(cleaned, expectedCount);
  }

  const matches =
    cleaned.match(/\d+(?:\.\d+)?[kmb]|\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/gi) ??
    [];

  return matches.map(parseHumanNumber).filter(Number.isFinite);
}

function expandPowerBiNumericCells(cells: string[], expectedCount: number) {
  const values: number[] = [];

  cells.forEach((cell, index) => {
    const remainingSlots = expectedCount - values.length;
    const remainingCells = cells.length - index - 1;
    const expectedFromCell = Math.max(1, remainingSlots - remainingCells);
    const parts = numberPartsFromCell(cell, expectedFromCell);

    values.push(...parts.slice(0, remainingSlots));
  });

  return values;
}

function summaryValuesFromNumbers(values: number[]) {
  const result: Partial<Record<PowerBiSummaryColumn, number>> = {};

  if (values.length >= POWERBI_SUMMARY_COLUMNS.length) {
    POWERBI_SUMMARY_COLUMNS.forEach((column, index) => {
      result[column] = values[index];
    });
    return result;
  }

  if (values.length === 3 && values[2] === 1) {
    result.total_records = values[0];
    result.past_90_records = values[1];
    result.tools = values[2];
    return result;
  }

  values.forEach((value, index) => {
    const column = POWERBI_SUMMARY_COLUMNS[index];

    if (column) {
      result[column] = value;
    }
  });

  return result;
}

function parsePowerBiSummaryLine(line: string): PowerBiSummaryRow | null {
  const cells = line
    .split(/\t+/)
    .map(compactText)
    .filter(Boolean);
  let tool = "";
  let numericCells: string[] = [];

  if (cells.length >= 2) {
    [tool, ...numericCells] = cells;
  } else {
    const match = line.match(/^([A-Za-z][A-Za-z0-9&/() -]{1,64}?)\s{2,}(.+)$/);

    if (!match) {
      return null;
    }

    tool = compactText(match[1]);
    numericCells = [match[2]];
  }

  if (
    !tool ||
    /^(tool|total records|past 90|projects|leaderboard|date)$/i.test(tool)
  ) {
    return null;
  }

  const numbers = expandPowerBiNumericCells(
    numericCells,
    POWERBI_SUMMARY_COLUMNS.length
  );

  if (numbers.length < 2) {
    return null;
  }

  return {
    tool,
    ...summaryValuesFromNumbers(numbers)
  };
}

function parsePowerBiSummaryRows(lines: string[]) {
  const rows: PowerBiSummaryRow[] = [];
  let inSummary = false;

  for (const line of lines) {
    if (
      /total records/i.test(line) &&
      /past 90/i.test(line) &&
      /projects/i.test(line) &&
      /users/i.test(line)
    ) {
      inSummary = true;
      continue;
    }

    if (!inSummary) {
      continue;
    }

    const row = parsePowerBiSummaryLine(line);

    if (!row) {
      continue;
    }

    rows.push(row);

    if (/^total$/i.test(row.tool)) {
      break;
    }
  }

  return rows;
}

function extractPowerBiCompany(lines: string[]) {
  for (let index = 0; index < lines.length; index += 1) {
    if (/^company$/i.test(lines[index])) {
      const next = lines[index + 1];

      if (next && !/^(projects|records|fields to show)$/i.test(next)) {
        return next;
      }
    }
  }

  const inline = lines
    .join(" ")
    .match(/Company\s+(.{2,120}?)\s+(?:Projects|Records|Fields to Show)/i);

  return inline ? compactText(inline[1]) : "";
}

function extractPowerBiDateRange(text: string) {
  const range = cleanPowerBiText(text).match(
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}\/\d{1,2}\/\d{4})(?:\s+Start Date\s*-\s*End Date)?/i
  );

  return range ? `${range[1]} - ${range[2]}` : "";
}

function powerBiMetricKey(tool: string, suffix: string) {
  return `${normalizeMetricKey(tool)}_${suffix}`;
}

function powerBiHeaderLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatSourceName(sourceFormat: BiMetricSourceFormat) {
  return sourceFormat === "pptx"
    ? "PPTX"
    : sourceFormat === "pdf"
      ? "PDF"
      : "text";
}

function importPowerBiReportText(
  text: string,
  options: { fileName?: string; sourceFormat?: BiMetricSourceFormat } = {}
): BiMetricImport {
  const fileName = options.fileName ?? "Power BI export";
  const sourceFormat = options.sourceFormat ?? "text";
  const lines = powerBiLines(text);

  if (
    /addinsinstallpage|relaunch the add-in|after you install the add-in/i.test(
      text
    )
  ) {
    throw new Error(
      "This PPTX only contains the Microsoft Power BI add-in handoff, not report data. Export the actual report pages as PDF, or export the table behind the visual as CSV."
    );
  }

  const summaryRows = parsePowerBiSummaryRows(lines);

  if (summaryRows.length === 0) {
    throw new Error(
      `No readable Power BI metric table was found in ${fileName}. Use a PDF/PPTX export with selectable report text, or export the underlying visual data as CSV.`
    );
  }

  const totalRow = summaryRows.find((row) => /^total$/i.test(row.tool));
  const toolRows = summaryRows
    .filter((row) => !/^total$/i.test(row.tool))
    .filter((row) => Number.isFinite(row.total_records))
    .sort((a, b) => (b.total_records ?? 0) - (a.total_records ?? 0));
  const lowestTool = [...toolRows]
    .filter((row) => (row.total_records ?? 0) > 0)
    .sort((a, b) => (a.total_records ?? 0) - (b.total_records ?? 0))[0];
  const clientName = extractPowerBiCompany(lines);
  const period = extractPowerBiDateRange(text) || "Power BI export";
  const row: ImportedMetricRow = {
    client_name: clientName,
    report_period: period,
    top_feature: toolRows[0]?.tool,
    lowest_feature: lowestTool?.tool,
    risk_summary:
      "Power BI export loaded workflow activity; confirm any adoption score before making score-based claims.",
    recommendation_1:
      "Confirm the adoption score or use the deck prompt to frame this as workflow activity instead of scorecard coverage.",
    recommendation_2:
      "Use the highest-volume workflows to focus enablement and executive discussion.",
    recommendation_3:
      "Review the lowest-volume workflow for ownership, training, or configuration gaps."
  };
  const metricColumns: Array<{ header: string; key: string }> = [];

  if (Number.isFinite(totalRow?.users)) {
    row.active_users = totalRow?.users;
  }

  if (Number.isFinite(totalRow?.projects)) {
    row.projects_active = totalRow?.projects;
  }

  toolRows.slice(0, 12).forEach((summaryRow, index) => {
    const recordsKey = powerBiMetricKey(summaryRow.tool, "records");
    row[recordsKey] = Math.round(summaryRow.total_records ?? 0);

    if (index < 8) {
      metricColumns.push({
        header: `${summaryRow.tool} Records`,
        key: recordsKey
      });
    }

    if (Number.isFinite(summaryRow.past_90_records)) {
      row[powerBiMetricKey(summaryRow.tool, "past_90_records")] = Math.round(
        summaryRow.past_90_records ?? 0
      );
    }

    if (Number.isFinite(summaryRow.users)) {
      row[powerBiMetricKey(summaryRow.tool, "users")] = Math.round(
        summaryRow.users ?? 0
      );
    }
  });

  const aggregateMetrics: Array<{
    sourceKey: PowerBiSummaryColumn;
    rowKey: string;
    header: string;
  }> = [
    {
      sourceKey: "total_records",
      rowKey: "total_records",
      header: "Total Records"
    },
    {
      sourceKey: "past_90_records",
      rowKey: "past_90_records",
      header: "Past 90 Records"
    },
    {
      sourceKey: "tools",
      rowKey: "tool_count",
      header: "Tool Count"
    },
    {
      sourceKey: "email_domains",
      rowKey: "email_domain_count",
      header: "Email Domain Count"
    }
  ];

  aggregateMetrics.forEach(({ sourceKey, rowKey, header }) => {
    const value = totalRow?.[sourceKey];

    if (Number.isFinite(value)) {
      row[rowKey] = Math.round(value ?? 0);
      metricColumns.push({ header, key: rowKey });
    }
  });

  const rows = [row];
  const mappedColumns: Array<{ header: string; field: StandardField }> = [];

  if (row.client_name) {
    mappedColumns.push({ header: "Company", field: "client_name" });
  }

  mappedColumns.push({ header: "Start Date - End Date", field: "report_period" });

  if (row.active_users !== undefined) {
    mappedColumns.push({ header: "Users", field: "active_users" });
  }

  if (row.projects_active !== undefined) {
    mappedColumns.push({ header: "Projects", field: "projects_active" });
  }

  const snapshots = parseBusinessMetricRows(rows, {
    source: `BI ${formatSourceName(sourceFormat)} export: ${fileName}`
  });
  const metricCount = snapshots.reduce(
    (total, snapshot) => total + snapshot.metrics.length,
    0
  );
  const warnings: string[] = [
    `Extracted a Power BI ${formatSourceName(
      sourceFormat
    )} summary as a single metric snapshot. Table visuals become workflow evidence; page filters become client/period context when readable.`
  ];
  const missingRequired = ADOPTION_REQUIRED_FIELDS.filter(
    (field) => !compactText(String(row[field] ?? ""))
  );

  if (missingRequired.length > 0) {
    const missingLabels = missingRequired.map(
      (field) => STANDARD_FIELD_LABELS[field]
    );
    warnings.push(
      `Not mapped from the ${formatSourceName(sourceFormat)}: ${missingLabels.join(
        ", "
      )}. ${
        missingLabels.length === 1
          ? "Adoption reports need this value"
          : "Adoption reports need these values"
      } - type ${
        missingLabels.length === 1 ? "it" : "them"
      } into the snapshot fields below.`
    );
  }

  if (metricCount === 0) {
    throw new Error(
      `No numeric metrics were found in ${fileName}. Export the underlying visual data as CSV, or use a PDF with selectable table text.`
    );
  }

  return {
    fileName,
    sourceFormat,
    rows,
    clientName,
    periods: [period],
    mappedColumns,
    metricColumns,
    ignoredColumns: [],
    metricCount,
    warnings
  };
}

export function importBiMetricExportText(
  text: string,
  options: { fileName?: string; sourceFormat?: BiMetricSourceFormat } = {}
): BiMetricImport {
  const sourceFormat =
    options.sourceFormat ??
    inferBiMetricSourceFormat(options.fileName ?? "BI export");
  const shouldParseDelimited =
    sourceFormat === "csv" ||
    sourceFormat === "tsv" ||
    (sourceFormat === "text" && looksDelimitedMetricExport(text));

  if (shouldParseDelimited) {
    return importBiMetricCsv(text, {
      fileName: options.fileName,
      sourceFormat
    });
  }

  return importPowerBiReportText(text, {
    fileName: options.fileName,
    sourceFormat
  });
}

// Power BI leaderboards routinely track dozens of workflows; keep room for
// them and let the highest-volume rows win when an export exceeds the cap.
const MAX_FORM_WORKFLOW_METRICS = 24;

/**
 * "daily_logs_count" → "Daily Logs Count"; human headers pass through. The
 * label must normalize back to the import's column key so later form edits
 * update the same imported value instead of creating a duplicate metric.
 */
function workflowLabelFromHeader(header: string) {
  const cleaned = compactText(header);

  if (!/^[a-z0-9_]+$/.test(cleaned)) {
    return cleaned;
  }

  return cleaned.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

/**
 * Snapshot-form values mirroring an imported series: the latest row fills the
 * current fields, the prior row fills the trend baseline fields, and numeric
 * count columns become editable workflow metric rows.
 */
export function businessSnapshotFromImport(
  imported: Pick<BiMetricImport, "rows" | "metricColumns">
): Record<string, string> & {
  workflow_metrics?: Array<{ label: string; count: string }>;
} {
  const rows = imported.rows;
  const current = rows[rows.length - 1] ?? {};
  const prior = rows.length > 1 ? rows[rows.length - 2] : undefined;
  const patch: Record<string, string> & {
    workflow_metrics?: Array<{ label: string; count: string }>;
  } = {};

  const fieldText = (row: Record<string, unknown> | undefined, key: string) => {
    const value = row?.[key];
    return value === undefined || value === null ? "" : compactText(String(value));
  };

  for (const field of Object.keys(STANDARD_FIELD_LABELS)) {
    const value = fieldText(current, field);

    if (value) {
      patch[field] = value;
    }
  }

  // Numeric count columns surface as editable workflow metrics; rate-style
  // columns stay import-only evidence because workflow rows render as counts.
  const workflowMetrics = imported.metricColumns
    .filter(({ key }) => !looksLikeRateKey(key))
    .flatMap(({ header, key }) => {
      const value = current[key];
      const numeric =
        typeof value === "number" ? value : toNumber(String(value ?? ""));

      if (!Number.isFinite(numeric)) {
        return [];
      }

      return [{ label: workflowLabelFromHeader(header), count: String(numeric) }];
    })
    .sort((a, b) => Number(b.count) - Number(a.count))
    .slice(0, MAX_FORM_WORKFLOW_METRICS);

  if (workflowMetrics.length > 0) {
    patch.workflow_metrics = workflowMetrics;
  }

  if (prior) {
    const priorFields: Array<[string, string]> = [
      ["previous_report_period", "report_period"],
      ["previous_active_users", "active_users"],
      ["previous_adoption_score", "adoption_score"],
      ["previous_mobile_usage_rate", "mobile_usage_rate"]
    ];

    for (const [snapshotField, rowField] of priorFields) {
      const value = fieldText(prior, rowField);

      if (value) {
        patch[snapshotField] = value;
      }
    }
  }

  return patch;
}

/**
 * Apply the edited workflow-metric list onto an imported series: values land
 * on the latest row under normalized label keys, and metrics the creator
 * removed are deleted so they stop flowing into the deck.
 */
export function applyWorkflowMetricsToImportedRows(
  rows: ImportedMetricRow[],
  previousMetrics: Array<{ label: string; count: string }>,
  nextMetrics: Array<{ label: string; count: string }>
): ImportedMetricRow[] {
  if (rows.length === 0) {
    return rows;
  }

  const reservedKeys = new Set<string>(Object.keys(STANDARD_FIELD_LABELS));
  const keyFor = (label: string) => normalizeMetricKey(compactText(label));
  const nextKeys = new Map(
    nextMetrics
      .map((metric) => [keyFor(metric.label), compactText(metric.count)] as const)
      .filter(([key, count]) => key && count && !reservedKeys.has(key))
  );
  const removedKeys = previousMetrics
    .map((metric) => keyFor(metric.label))
    .filter((key) => key && !nextKeys.has(key) && !reservedKeys.has(key));

  return rows.map((row, index) => {
    if (index !== rows.length - 1) {
      return row;
    }

    const next: ImportedMetricRow = { ...row };

    for (const key of removedKeys) {
      delete next[key];
    }

    for (const [key, count] of nextKeys) {
      const numeric = toNumber(count);
      next[key] = Number.isFinite(numeric) ? numeric : count;
    }

    return next;
  });
}

const PRIOR_FIELD_TO_ROW_FIELD: Record<string, StandardField> = {
  previous_report_period: "report_period",
  previous_active_users: "active_users",
  previous_adoption_score: "adoption_score",
  previous_mobile_usage_rate: "mobile_usage_rate"
};

/**
 * Apply one snapshot-form edit onto an imported series without discarding the
 * other periods or the flexible metric columns. Current-period fields edit
 * the latest row, previous_* fields edit (or create) the prior row, and the
 * client name applies to every row.
 */
export function applySnapshotFieldToImportedRows(
  rows: ImportedMetricRow[],
  field: string,
  value: string
): ImportedMetricRow[] {
  const cleaned = compactText(value);

  if (rows.length === 0) {
    return rows;
  }

  if (field === "client_name") {
    return rows.map((row) => ({ ...row, client_name: cleaned }));
  }

  const priorRowField = PRIOR_FIELD_TO_ROW_FIELD[field];

  if (priorRowField) {
    if (rows.length >= 2) {
      return rows.map((row, index) =>
        index === rows.length - 2 ? { ...row, [priorRowField]: cleaned } : row
      );
    }

    // Single imported period: create a baseline row from the current row's
    // standard fields so the trend has two points, like the manual form does.
    const current = rows[rows.length - 1];
    const baseline: Record<string, string | number> = {};

    for (const standardField of Object.keys(STANDARD_FIELD_LABELS)) {
      const fieldValue = current[standardField as StandardField];

      if (fieldValue !== undefined && fieldValue !== null && fieldValue !== "") {
        baseline[standardField] = fieldValue as string | number;
      }
    }

    baseline[priorRowField] = cleaned;

    // A prior row needs its own period label; the current one was copied in.
    if (priorRowField !== "report_period") {
      baseline.report_period = `Prior ${String(
        current.report_period ?? "period"
      )}`;
    }

    return [baseline as ImportedMetricRow, ...rows];
  }

  return rows.map((row, index) =>
    index === rows.length - 1 ? { ...row, [field]: cleaned } : row
  );
}
