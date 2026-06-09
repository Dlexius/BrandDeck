import { z } from "zod";
import {
  MAX_SOURCE_DOCUMENT_CHARS,
  SourceDocumentSchema,
  type SourceDocument
} from "@/lib/deck-plan-schema";

const MetricValueSchema = z.union([z.string(), z.number()]);

export const ClientProfileContextSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  segment: z.string().min(1).max(120).optional(),
  stage: z.string().min(1).max(120).optional(),
  ownedTools: z.array(z.string().min(1).max(80)).max(40).default([]),
  businessGoals: z.array(z.string().min(1).max(220)).max(20).default([]),
  risks: z.array(z.string().min(1).max(220)).max(20).default([]),
  stakeholders: z.array(z.string().min(1).max(120)).max(30).default([])
});

export const MetricDatumSchema = z.object({
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(120).optional(),
  value: MetricValueSchema,
  unit: z.string().min(1).max(40).optional(),
  period: z.string().min(1).max(80).optional(),
  source: z.string().min(1).max(120).optional(),
  sourceRef: z.string().min(1).max(160).optional(),
  clientId: z.string().min(1).max(80).optional(),
  category: z.string().min(1).max(80).optional()
});

export const BusinessMetricSnapshotSchema = z.object({
  id: z.string().min(1).max(120),
  clientId: z.string().min(1).max(80).optional(),
  clientName: z.string().min(1).max(120).optional(),
  period: z.string().min(1).max(80),
  source: z.string().min(1).max(120),
  category: z.string().min(1).max(80).optional(),
  metrics: z.array(MetricDatumSchema).max(120)
});

export const SelectedContextRefSchema = z.object({
  id: z.string().min(1).max(120),
  type: z.enum([
    "doc",
    "sheet",
    "bi_export",
    "prior_deck",
    "note",
    "connector"
  ]),
  title: z.string().min(1).max(160),
  source: z.string().min(1).max(120),
  sourceId: z.string().min(1).max(160).optional(),
  url: z.string().max(500).optional(),
  selectedAt: z.string().min(1).max(80).optional()
});

export const ContinuityMemorySchema = z.object({
  priorRecommendations: z.array(z.string().min(1).max(220)).max(30).default([]),
  priorCommitments: z.array(z.string().min(1).max(220)).max(30).default([]),
  openRisks: z.array(z.string().min(1).max(220)).max(30).default([]),
  priorDeckTitles: z.array(z.string().min(1).max(160)).max(30).default([])
});

export const ContextPackSchema = z.object({
  id: z.string().min(1).max(120),
  clientProfile: ClientProfileContextSchema.optional(),
  metricSnapshots: z.array(BusinessMetricSnapshotSchema).max(80).default([]),
  sourceDocuments: z.array(SourceDocumentSchema).max(20).default([]),
  selectedContextRefs: z.array(SelectedContextRefSchema).max(80).default([]),
  continuityMemory: ContinuityMemorySchema.default({}),
  createdAt: z.string().min(1).max(80).optional(),
  updatedAt: z.string().min(1).max(80).optional()
});

export type ClientProfileContext = z.infer<typeof ClientProfileContextSchema>;
export type MetricDatum = z.infer<typeof MetricDatumSchema>;
export type BusinessMetricSnapshot = z.infer<
  typeof BusinessMetricSnapshotSchema
>;
export type SelectedContextRef = z.infer<typeof SelectedContextRefSchema>;
export type ContinuityMemory = z.infer<typeof ContinuityMemorySchema>;
export type ContextPack = z.infer<typeof ContextPackSchema>;

type LegacyMetricRow = Record<string, unknown>;

const STANDARD_METRIC_FIELDS = [
  "active_users",
  "licensed_users",
  "adoption_score",
  "projects_active",
  "mobile_usage_rate",
  "daily_logs_count",
  "rfi_count",
  "submittals_count",
  "budget_count",
  "commitments_count",
  "forms_count",
  "inspections_count",
  "analytics_usage_rate"
] as const;

const LEGACY_ROW_TEXT_FIELDS = new Set([
  "client_name",
  "report_period",
  "top_feature",
  "lowest_feature",
  "risk_summary",
  "recommendation_1",
  "recommendation_2",
  "recommendation_3"
]);

const ADOPTION_REQUIRED_FIELDS = [
  "client_name",
  "report_period",
  "active_users",
  "licensed_users",
  "adoption_score"
] as const;

function compact(value: unknown, fallback = "") {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value !== "string") {
    return fallback;
  }

  return value.replace(/\s+/g, " ").trim() || fallback;
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  if (value === null || value === undefined) {
    return Number.NaN;
  }

  const parsed = Number(String(value).replace(/[,%]/g, "").trim());
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function slug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "context"
  );
}

function titleizeMetricKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function normalizeMetricKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function metricFromEntry({
  key,
  value,
  period,
  source,
  clientId,
  category
}: {
  key: string;
  value: unknown;
  period: string;
  source: string;
  clientId?: string;
  category?: string;
}): MetricDatum | null {
  const numericValue = toNumber(value);
  const textValue = compact(value);

  if (!Number.isFinite(numericValue) && !textValue) {
    return null;
  }

  if (LEGACY_ROW_TEXT_FIELDS.has(key) && !Number.isFinite(numericValue)) {
    return null;
  }

  return {
    key: normalizeMetricKey(key),
    label: titleizeMetricKey(key),
    value: Number.isFinite(numericValue) ? numericValue : textValue,
    period,
    source,
    sourceRef: `${source}: ${titleizeMetricKey(key)}`,
    clientId,
    category
  };
}

function snapshotFromRecord({
  record,
  index,
  source,
  category,
  clientId,
  clientName
}: {
  record: LegacyMetricRow;
  index: number;
  source: string;
  category: string;
  clientId?: string;
  clientName?: string;
}): BusinessMetricSnapshot | null {
  const period = compact(record.report_period, `Period ${index + 1}`);
  const rowClientName = compact(record.client_name, clientName ?? "");
  const metrics = Object.entries(record)
    .map(([key, value]) =>
      metricFromEntry({
        key,
        value,
        period,
        source,
        clientId,
        category
      })
    )
    .filter((metric): metric is MetricDatum => metric !== null);

  if (metrics.length === 0) {
    return null;
  }

  return {
    id: `${slug(source)}_${slug(rowClientName || clientId || "client")}_${slug(
      period
    )}_${index}`,
    clientId,
    clientName: rowClientName || clientName,
    period,
    source,
    category,
    metrics
  };
}

function dedupeDocuments(documents: SourceDocument[]) {
  const seen = new Set<string>();
  const result: SourceDocument[] = [];

  for (const document of documents) {
    const parsed = SourceDocumentSchema.safeParse({
      ...document,
      text: document.text.slice(0, MAX_SOURCE_DOCUMENT_CHARS)
    });

    if (!parsed.success) {
      continue;
    }

    const key = `${parsed.data.id}:${parsed.data.name}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(parsed.data);

    if (result.length >= 20) {
      break;
    }
  }

  return result;
}

function documentRefs(documents: SourceDocument[]): SelectedContextRef[] {
  return documents.map((document) => ({
    id: document.id,
    type:
      document.type === "spreadsheet"
        ? "sheet"
        : document.type === "presentation"
          ? "prior_deck"
          : document.type === "notes"
            ? "note"
            : "doc",
    title: document.name,
    source: "Attached context",
    sourceId: document.id
  }));
}

export function buildContextPackFromInputs({
  contextPack,
  clientProfile,
  csvRows = [],
  manualSnapshot,
  sourceDocuments = [],
  selectedContextRefs = [],
  continuityMemory
}: {
  contextPack?: ContextPack;
  clientProfile?: ClientProfileContext;
  csvRows?: LegacyMetricRow[];
  manualSnapshot?: LegacyMetricRow;
  sourceDocuments?: SourceDocument[];
  selectedContextRefs?: SelectedContextRef[];
  continuityMemory?: ContinuityMemory;
}) {
  const base = contextPack ? ContextPackSchema.parse(contextPack) : undefined;
  const profile = clientProfile ?? base?.clientProfile;
  const clientId = profile?.id;
  const clientName = profile?.name;
  const csvSnapshots = csvRows
    .map((record, index) =>
      snapshotFromRecord({
        record,
        index,
        source: "Account metric snapshot",
        category: "account_metrics",
        clientId,
        clientName
      })
    )
    .filter((snapshot): snapshot is BusinessMetricSnapshot => snapshot !== null);
  const manualSnapshotRecord =
    manualSnapshot && csvSnapshots.length === 0
      ? snapshotFromRecord({
          record: manualSnapshot,
          index: 0,
          source: "Manual metric snapshot",
          category: "account_metrics",
          clientId,
          clientName
        })
      : null;
  const documents = dedupeDocuments([
    ...(base?.sourceDocuments ?? []),
    ...sourceDocuments
  ]);
  const refs = [
    ...(base?.selectedContextRefs ?? []),
    ...selectedContextRefs,
    ...documentRefs(sourceDocuments)
  ].slice(0, 80);
  const firstPeriod =
    csvSnapshots[csvSnapshots.length - 1]?.period ??
    manualSnapshotRecord?.period ??
    base?.metricSnapshots[base.metricSnapshots.length - 1]?.period ??
    "current";
  const id = base?.id ?? `${slug(clientName ?? "client")}_${slug(firstPeriod)}`;

  return ContextPackSchema.parse({
    id,
    clientProfile: profile,
    metricSnapshots: [
      ...(base?.metricSnapshots ?? []),
      ...csvSnapshots,
      ...(manualSnapshotRecord ? [manualSnapshotRecord] : [])
    ],
    sourceDocuments: documents,
    selectedContextRefs: refs,
    continuityMemory:
      continuityMemory ?? base?.continuityMemory ?? ContinuityMemorySchema.parse({}),
    createdAt: base?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

function snapshotMetricMap(snapshot: BusinessMetricSnapshot) {
  const entries = snapshot.metrics.map((metric) => [
    normalizeMetricKey(metric.key),
    metric.value
  ]);

  return Object.fromEntries(entries);
}

export function contextPackToMetricRows(contextPack?: ContextPack) {
  if (!contextPack) {
    return [];
  }

  return contextPack.metricSnapshots.map((snapshot) => ({
    client_name: snapshot.clientName ?? contextPack.clientProfile?.name,
    report_period: snapshot.period,
    ...snapshotMetricMap(snapshot)
  }));
}

export function latestContextMetricRow(contextPack?: ContextPack) {
  const rows = contextPackToMetricRows(contextPack);
  return rows[rows.length - 1];
}

export function contextPackHasAdoptionMetrics(contextPack?: ContextPack) {
  const rows = contextPackToMetricRows(contextPack);

  return rows.some((row) =>
    ADOPTION_REQUIRED_FIELDS.every((field) => compact(row[field]).length > 0)
  );
}

export function metricDatumsByKey(contextPack?: ContextPack) {
  const metrics = new Map<string, MetricDatum[]>();

  for (const snapshot of contextPack?.metricSnapshots ?? []) {
    for (const metric of snapshot.metrics) {
      const key = normalizeMetricKey(metric.key);
      const values = metrics.get(key) ?? [];
      values.push(metric);
      metrics.set(key, values);
    }
  }

  return metrics;
}

export function numericMetricValue(metric: MetricDatum) {
  return toNumber(metric.value);
}

export function normalizedMetricKey(value: string) {
  return normalizeMetricKey(value);
}

export function standardMetricKeys() {
  return new Set<string>(STANDARD_METRIC_FIELDS.map(normalizeMetricKey));
}
