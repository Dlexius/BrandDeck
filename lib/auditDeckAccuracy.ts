import type { DeckPlan, DeckSlide, SourceDocument } from "@/lib/deck-plan-schema";
import {
  contextPackToMetricRows,
  metricDatumsByKey,
  normalizedMetricKey,
  numericMetricValue,
  standardMetricKeys,
  type ContextPack
} from "@/lib/context-pack-schema";
import type { AdoptionCsvRow } from "@/lib/generateDeckPlan";

export type DeckAccuracyCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  slideTitle?: string;
};

export type DeckAccuracyAudit = {
  passed: boolean;
  accuracyScore: number;
  checks: DeckAccuracyCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
};

type NormalizedRow = {
  client_name: string;
  report_period: string;
  active_users: number;
  licensed_users: number;
  adoption_score: number;
  projects_active: number;
  mobile_usage_rate: number;
  daily_logs_count: number;
  rfi_count: number;
  submittals_count: number;
};

function check(
  id: string,
  label: string,
  passed: boolean,
  detail: string,
  slideTitle?: string
): DeckAccuracyCheck {
  return { id, label, passed, detail, slideTitle };
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  const parsed = Number(String(value).replace(/[,%]/g, "").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toCount(value: unknown) {
  return Math.round(Math.max(0, toNumber(value)));
}

function toPercent(value: unknown) {
  return Math.round(Math.min(100, Math.max(0, toNumber(value))));
}

function toText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim()
    ? value.replace(/\s+/g, " ").trim()
    : fallback;
}

function normalizeRow(row: AdoptionCsvRow): NormalizedRow {
  return {
    client_name: toText(row.client_name, "Unknown Client"),
    report_period: toText(row.report_period, "Current Period"),
    active_users: toCount(row.active_users),
    licensed_users: toCount(row.licensed_users),
    adoption_score: toPercent(row.adoption_score),
    projects_active: toCount(row.projects_active),
    mobile_usage_rate: toPercent(row.mobile_usage_rate),
    daily_logs_count: toCount(row.daily_logs_count),
    rfi_count: toCount(row.rfi_count),
    submittals_count: toCount(row.submittals_count)
  };
}

function hasMetricSignal(row: NormalizedRow) {
  return (
    row.active_users > 0 ||
    row.licensed_users > 0 ||
    row.adoption_score > 0 ||
    row.projects_active > 0 ||
    row.mobile_usage_rate > 0 ||
    row.daily_logs_count > 0 ||
    row.rfi_count > 0 ||
    row.submittals_count > 0
  );
}

function selectedRows(parsedCsvData: AdoptionCsvRow[]) {
  const inputRows = parsedCsvData.map(normalizeRow);
  const rowsWithMetricSignal = inputRows.filter(hasMetricSignal);
  return rowsWithMetricSignal.length > 0 ? rowsWithMetricSignal : inputRows;
}

function slideByLayout(deckPlan: DeckPlan, layoutId: DeckSlide["layout_id"]) {
  return deckPlan.slides.find((slide) => slide.layout_id === layoutId);
}

function allSlidesByLayout(deckPlan: DeckPlan, layoutId: DeckSlide["layout_id"]) {
  return deckPlan.slides.filter((slide) => slide.layout_id === layoutId);
}

function fieldNumber(slide: DeckSlide | undefined, fieldName: string) {
  return toNumber(slide?.fields[fieldName], Number.NaN);
}

function stringifyField(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === "string") {
    return [value];
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => stringifyField(item));
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((item) =>
      stringifyField(item)
    );
  }

  return [];
}

function deckVisibleText(deckPlan: DeckPlan) {
  return deckPlan.slides
    .flatMap((slide) => [slide.title, ...stringifyField(slide.fields)])
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeSentence(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function splitSentences(text: string) {
  return normalizeSentence(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

const UNSAFE_SOURCE_COPY_PATTERNS = [
  /\bignore\b.*\b(brand|template|layout|logo|governance)\b/i,
  /\b(change|move|replace|redesign)\b.*\b(logo|brand|template|layout|font|color)\b/i,
  /\b(unapproved|unauthorized|off-brand)\b/i,
  /\b(purple|gradient|icon|asset|logo placement|brand governance)\b/i,
  /\b(openai|api|model|prompt|renderer|pptxgen|layout id|object id)\b/i
];

function safeSourceSentences(
  sourceDocuments: SourceDocument[],
  pattern: RegExp,
  limit = 3
) {
  const matches: string[] = [];

  for (const document of sourceDocuments.slice(0, 6)) {
    for (const sentence of splitSentences(document.text.slice(0, 12000))) {
      if (!pattern.test(sentence)) {
        continue;
      }

      if (UNSAFE_SOURCE_COPY_PATTERNS.some((unsafe) => unsafe.test(sentence))) {
        continue;
      }

      matches.push(sentence);

      if (matches.length >= limit) {
        return matches;
      }
    }
  }

  return matches;
}

function prioritizedSafeSourceSentences(
  sourceDocuments: SourceDocument[],
  primaryPattern: RegExp,
  fallbackPattern: RegExp,
  limit = 3
) {
  const primaryMatches = safeSourceSentences(
    sourceDocuments,
    primaryPattern,
    limit
  );

  return primaryMatches.length > 0
    ? primaryMatches
    : safeSourceSentences(sourceDocuments, fallbackPattern, limit);
}

const EXPLICIT_SOURCE_ACTION_PATTERN = /^\s*(recommendation|next step|action):/i;
const FALLBACK_SOURCE_ACTION_PATTERN =
  /\b(recommend|next step|action|owner|mitigate|enable|train|review)\b/i;
const EXPLICIT_SOURCE_RISK_PATTERN = /^\s*(risk|blocker|concern|gap|issue):/i;
const FALLBACK_SOURCE_RISK_PATTERN =
  /\b(risk|blocker|concern|gap|delay|late|stalled|issue|low|lowest)\b/i;

/**
 * The exact safe source sentences the grounding audit checks for. Exposed so
 * the planner can be told up front which lines must stay recognizable, and so
 * a deterministic repair can restate them without another model call - both
 * sides of the audit agree because they share these extractors.
 */
export function safeSourceFidelityLines(sourceDocuments: SourceDocument[]) {
  return {
    actions: prioritizedSafeSourceSentences(
      sourceDocuments,
      EXPLICIT_SOURCE_ACTION_PATTERN,
      FALLBACK_SOURCE_ACTION_PATTERN
    ),
    explicitActions: safeSourceSentences(
      sourceDocuments,
      EXPLICIT_SOURCE_ACTION_PATTERN
    ),
    risks: prioritizedSafeSourceSentences(
      sourceDocuments,
      EXPLICIT_SOURCE_RISK_PATTERN,
      FALLBACK_SOURCE_RISK_PATTERN
    ),
    explicitRisks: safeSourceSentences(
      sourceDocuments,
      EXPLICIT_SOURCE_RISK_PATTERN
    )
  };
}

export function visibleContainsSentence(deckText: string, sentence: string) {
  const normalizedSentence = normalizeSentence(sentence).toLowerCase();

  if (deckText.includes(normalizedSentence)) {
    return true;
  }

  const keywords = normalizedSentence
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 5)
    .slice(0, 8);

  if (keywords.length === 0) {
    return false;
  }

  const matchedKeywords = keywords.filter((keyword) => deckText.includes(keyword));
  return matchedKeywords.length >= Math.min(4, keywords.length);
}

function checkKpiFacts(deckPlan: DeckPlan, current: NormalizedRow) {
  const slide = slideByLayout(deckPlan, "adoption_kpi_scorecard");

  if (!slide) {
    return [
      check(
        "csv:kpi-slide",
        "KPI slide present",
        false,
        "No KPI scorecard slide was found."
      )
    ];
  }

  const metrics: Array<[keyof NormalizedRow, string]> = [
    ["active_users", "Active users"],
    ["licensed_users", "Licensed users"],
    ["adoption_score", "Adoption score"],
    ["projects_active", "Active projects"],
    ["mobile_usage_rate", "Mobile usage"]
  ];

  return metrics.map(([fieldName, label]) => {
    const expected = current[fieldName];
    const actual = fieldNumber(slide, fieldName);

    return check(
      `csv:kpi:${String(fieldName)}`,
      label,
      actual === expected,
      `Expected ${expected}; deck plan has ${Number.isNaN(actual) ? "missing" : actual}.`,
      slide.title
    );
  });
}

function checkTrendFacts(deckPlan: DeckPlan, rows: NormalizedRow[]) {
  const slide = slideByLayout(deckPlan, "usage_trend");

  if (!slide) {
    return [
      check(
        "csv:trend-slide",
        "Trend slide optional",
        true,
        "No trend slide in this recipe."
      )
    ];
  }

  const trendPoints = Array.isArray(slide.fields.trend_points)
    ? slide.fields.trend_points
    : [];
  const lastPoint = trendPoints[trendPoints.length - 1] as
    | Record<string, unknown>
    | undefined;
  const current = rows[rows.length - 1];

  return [
    check(
      "csv:trend-count",
      "Trend row count",
      trendPoints.length === rows.length,
      `Expected ${rows.length} trend point(s); deck plan has ${trendPoints.length}.`,
      slide.title
    ),
    check(
      "csv:trend-latest-adoption",
      "Latest trend adoption",
      toNumber(lastPoint?.adoption_score, Number.NaN) === current.adoption_score,
      `Expected ${current.adoption_score}; deck plan has ${lastPoint?.adoption_score ?? "missing"}.`,
      slide.title
    ),
    check(
      "csv:trend-latest-active-users",
      "Latest trend active users",
      toNumber(lastPoint?.active_users, Number.NaN) === current.active_users,
      `Expected ${current.active_users}; deck plan has ${lastPoint?.active_users ?? "missing"}.`,
      slide.title
    )
  ];
}

function contextMetricExpectations(contextPack?: ContextPack) {
  const expectations = new Map<string, number>();
  const standardKeys = standardMetricKeys();

  for (const [key, metrics] of metricDatumsByKey(contextPack)) {
    const metric = metrics[metrics.length - 1];
    const value = metric ? numericMetricValue(metric) : Number.NaN;

    if (!metric || !Number.isFinite(value)) {
      continue;
    }

    expectations.set(key, Math.round(value));

    if (metric.label) {
      expectations.set(normalizedMetricKey(metric.label), Math.round(value));
    }

    if (!standardKeys.has(key) && metric.label) {
      expectations.set(normalizedMetricKey(metric.label.replace(/\s+count$/i, "")), Math.round(value));
    }
  }

  return expectations;
}

function legacyFeatureExpectations(current: NormalizedRow) {
  const expectations = new Map<string, number>();

  if (current.daily_logs_count > 0) {
    expectations.set("daily_logs", current.daily_logs_count);
  }

  if (current.rfi_count > 0) {
    expectations.set("rfis", current.rfi_count);
    expectations.set("rfi", current.rfi_count);
  }

  if (current.submittals_count > 0) {
    expectations.set("submittals", current.submittals_count);
  }

  return expectations;
}

function contextRateExpectations(contextPack?: ContextPack) {
  const expectations = new Map<string, number>();

  for (const [key, metrics] of metricDatumsByKey(contextPack)) {
    if (!/(^|_)(rate|percent|percentage)$/.test(key)) {
      continue;
    }

    const metric = metrics[metrics.length - 1];
    const value = metric ? numericMetricValue(metric) : Number.NaN;

    if (!metric || !Number.isFinite(value)) {
      continue;
    }

    const roundedValue = Math.round(value);
    const baseKeys = new Set([
      key,
      key.replace(/_usage_rate$/, "_usage"),
      key.replace(/_usage_rate$/, ""),
      key.replace(/_(rate|percent|percentage)$/, "")
    ]);

    for (const baseKey of baseKeys) {
      if (baseKey) {
        expectations.set(baseKey, roundedValue);
      }
    }

    if (metric.label) {
      const labelKey = normalizedMetricKey(metric.label);
      expectations.set(labelKey, roundedValue);
      expectations.set(
        labelKey.replace(/_usage_rate$/, "_usage"),
        roundedValue
      );
      expectations.set(labelKey.replace(/_usage_rate$/, ""), roundedValue);
      expectations.set(
        labelKey.replace(/_(rate|percent|percentage)$/, ""),
        roundedValue
      );
    }
  }

  return expectations;
}

function checkFeatureFacts(
  deckPlan: DeckPlan,
  current: NormalizedRow,
  contextPack?: ContextPack
) {
  const slide = slideByLayout(deckPlan, "feature_adoption");

  if (!slide) {
    return [
      check(
        "csv:feature-slide",
        "Feature slide optional",
        true,
        "No feature adoption slide in this recipe."
      )
    ];
  }

  const metrics = Array.isArray(slide.fields.feature_metrics)
    ? (slide.fields.feature_metrics as Array<Record<string, unknown>>)
    : [];
  const expected = new Map([
    ...legacyFeatureExpectations(current),
    ...contextMetricExpectations(contextPack)
  ]);
  const rateExpected = contextRateExpectations(contextPack);

  // The slide's stated top feature must never contradict the plotted data.
  const consistencyChecks: ReturnType<typeof check>[] = [];
  const measured = metrics
    .map((metric) => ({
      feature: String(metric.feature ?? ""),
      count: toNumber(metric.count, Number.NaN)
    }))
    .filter((metric) => Number.isFinite(metric.count) && metric.count > 0);

  if (measured.length > 1) {
    const statedTop = String(slide.fields.top_feature ?? "");
    const maxCount = Math.max(...measured.map((metric) => metric.count));
    const leaders = measured
      .filter((metric) => metric.count === maxCount)
      .map((metric) => normalizedMetricKey(metric.feature));

    consistencyChecks.push(
      check(
        "feature:top-feature-consistency",
        "Top feature matches measured data",
        statedTop === "" || leaders.includes(normalizedMetricKey(statedTop)),
        statedTop === "" || leaders.includes(normalizedMetricKey(statedTop))
          ? "Stated top feature agrees with the highest measured count."
          : `Slide states "${statedTop}" as the top feature, but the measured leader is "${measured.find((metric) => metric.count === maxCount)?.feature}" (${maxCount}).`,
        slide.title
      )
    );
  }

  if (expected.size === 0) {
    return [
      ...consistencyChecks,
      check(
        "feature:flexible-source",
        "Flexible feature metrics",
        true,
        "Feature metrics are source/context-derived; no legacy adoption feature fields were required.",
        slide.title
      )
    ];
  }

  return [...consistencyChecks, ...metrics.map((metric) => {
    const feature = String(metric.feature ?? "");
    const key = normalizedMetricKey(feature);
    const expectedCount = expected.get(key);
    const actual = metric.count;
    const rateValue = rateExpected.get(key);

    if (
      rateValue !== undefined &&
      toNumber(actual, Number.NaN) === rateValue
    ) {
      return check(
        `feature:rate-as-count:${key || "metric"}`,
        `${feature || "Feature"} rate not shown as count`,
        false,
        `Feature tables display count rows; ${feature || "this metric"} matches a rate/percentage value (${rateValue}) and should move to narrative or a KPI field.`,
        slide.title
      );
    }

    if (expectedCount === undefined) {
      return check(
        `feature:flexible:${key || "metric"}`,
        `${feature || "Feature"} metric`,
        true,
        "Metric is not one of the legacy adoption fields and is allowed as a flexible context metric.",
        slide.title
      );
    }

    return check(
      `metric:feature:${feature}`,
      `${feature} count`,
      toNumber(actual, Number.NaN) === expectedCount,
      `Expected ${expectedCount}; deck plan has ${actual ?? "missing"}.`,
      slide.title
    );
  })];
}

function checkSourceGrounding(
  deckPlan: DeckPlan,
  sourceDocuments: SourceDocument[]
) {
  const checks: DeckAccuracyCheck[] = [];
  const deckText = deckVisibleText(deckPlan);
  const expectedDocCount = sourceDocuments.length;

  checks.push(
    check(
      "source-pack:count",
      "Source pack count",
      (deckPlan.source_pack?.document_count ?? 0) === expectedDocCount,
      `Expected ${expectedDocCount}; deck plan has ${
        deckPlan.source_pack?.document_count ?? 0
      }.`
    )
  );

  if (expectedDocCount === 0) {
    return checks;
  }

  const {
    actions: sourceActions,
    explicitActions: explicitSourceActions,
    risks: sourceRisks,
    explicitRisks: explicitSourceRisks
  } = safeSourceFidelityLines(sourceDocuments);

  checks.push(
    check(
      "source-grounding:action",
      "Source action reflected",
      explicitSourceActions.length === 0 ||
        sourceActions.some((sentence) => visibleContainsSentence(deckText, sentence)),
      explicitSourceActions.length === 0
        ? "No explicit source action line required reflection."
        : "At least one explicit safe source action appears in client-visible deck copy."
    )
  );

  checks.push(
    check(
      "source-grounding:risk",
      "Source risk reflected",
      explicitSourceRisks.length === 0 ||
        sourceRisks.some((sentence) => visibleContainsSentence(deckText, sentence)),
      explicitSourceRisks.length === 0
        ? "No explicit source risk line required reflection."
        : "At least one explicit safe source risk appears in client-visible deck copy."
    )
  );

  return checks;
}

export function auditDeckAccuracy({
  deckPlan,
  parsedCsvData,
  sourceDocuments = [],
  contextPack
}: {
  deckPlan: DeckPlan;
  parsedCsvData?: AdoptionCsvRow[];
  sourceDocuments?: SourceDocument[];
  contextPack?: ContextPack;
}): DeckAccuracyAudit {
  const metricRows =
    parsedCsvData && parsedCsvData.length > 0
      ? parsedCsvData
      : (contextPackToMetricRows(contextPack) as AdoptionCsvRow[]);
  const rows = selectedRows(metricRows);
  const current = rows[rows.length - 1];
  const checks: DeckAccuracyCheck[] = [];

  if (!current || !hasMetricSignal(current)) {
    checks.push(
      check(
        "metrics:optional",
        "Metric grounding",
        true,
        "No strict adoption metric checks were required for this source/context deck."
      )
    );
  } else {
    checks.push(...checkKpiFacts(deckPlan, current));
    checks.push(...checkTrendFacts(deckPlan, rows));
    checks.push(...checkFeatureFacts(deckPlan, current, contextPack));
  }

  checks.push(
    ...checkSourceGrounding(
      deckPlan,
      sourceDocuments.length > 0 ? sourceDocuments : contextPack?.sourceDocuments ?? []
    )
  );

  const passed = checks.filter((item) => item.passed).length;
  const accuracyScore = Math.round((passed / Math.max(checks.length, 1)) * 100);

  return {
    passed: checks.every((item) => item.passed),
    accuracyScore,
    checks,
    summary: {
      total: checks.length,
      passed,
      failed: checks.length - passed
    }
  };
}
