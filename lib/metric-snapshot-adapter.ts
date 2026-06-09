import {
  BusinessMetricSnapshotSchema,
  type BusinessMetricSnapshot,
  type MetricDatum
} from "@/lib/context-pack-schema";

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

  const parsed = Number(String(value).replace(/[,%$]/g, "").trim());
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function normalizeKey(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "metric"
  );
}

function labelFromKey(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function snapshotId(source: string, clientName: string, period: string, index: number) {
  return `${normalizeKey(source)}_${normalizeKey(clientName || "client")}_${normalizeKey(
    period
  )}_${index}`;
}

export function parseBusinessMetricRows(
  rows: Array<Record<string, unknown>>,
  options: {
    source: string;
    defaultClientName?: string;
    defaultPeriod?: string;
    category?: string;
    clientId?: string;
  }
): BusinessMetricSnapshot[] {
  return rows
    .map((row, index) => {
      const clientName = compact(
        row.client_name ?? row.client ?? row.account ?? row.customer,
        options.defaultClientName ?? ""
      );
      const period = compact(
        row.report_period ?? row.period ?? row.month ?? row.quarter,
        options.defaultPeriod ?? `Period ${index + 1}`
      );
      const metrics: MetricDatum[] = Object.entries(row)
        .filter(([key]) => {
          const normalized = normalizeKey(key);
          return ![
            "client_name",
            "client",
            "account",
            "customer",
            "report_period",
            "period",
            "month",
            "quarter"
          ].includes(normalized);
        })
        .flatMap(([key, value]) => {
          const numericValue = toNumber(value);
          const textValue = compact(value);

          if (!Number.isFinite(numericValue) && !textValue) {
            return [];
          }

          return [
            {
              key: normalizeKey(key),
              label: labelFromKey(key),
              value: Number.isFinite(numericValue) ? numericValue : textValue,
              period,
              source: options.source,
              sourceRef: `${options.source}: ${labelFromKey(key)}`,
              clientId: options.clientId,
              category: options.category ?? "business_metrics"
            }
          ];
        });

      if (metrics.length === 0) {
        return null;
      }

      return BusinessMetricSnapshotSchema.parse({
        id: snapshotId(options.source, clientName, period, index),
        clientId: options.clientId,
        clientName,
        period,
        source: options.source,
        category: options.category ?? "business_metrics",
        metrics
      });
    })
    .filter((snapshot): snapshot is BusinessMetricSnapshot => snapshot !== null);
}
