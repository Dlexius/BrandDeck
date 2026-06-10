import pptxgen from "pptxgenjs";
import JSZip from "jszip";
import path from "node:path";
import type { BrandContract, DeckPlan, DeckSlide } from "@/lib/deck-plan-schema";

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const PX = 1 / 144;

// Typefaces come from the active brand contract so any uploaded brand renders
// with its own approved fonts. These defaults only apply before a contract is
// loaded.
let FONT_HEAD = "Arial";
let FONT_BODY = "Arial";
let FONT_MONO = "Courier New";

function applyContractFonts(contract: BrandContract) {
  FONT_HEAD = contract.approved_fonts.heading[0] ?? "Arial";
  FONT_BODY = contract.approved_fonts.body[0] ?? "Arial";
  FONT_MONO = contract.approved_fonts.mono[0] ?? "Courier New";
}

type Deck = ReturnType<typeof createDeck>;
type Slide = ReturnType<Deck["addSlide"]>;
type ThemeMode = "light" | "warm" | "dark";

function createDeck(contract: BrandContract, plan: DeckPlan) {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = contract.companyName;
  pptx.company = contract.companyName;
  pptx.subject = plan.deck_type ?? "Client report";
  pptx.title = `${plan.client_name} | ${plan.report_period}`;
  pptx.theme = {
    headFontFace: FONT_HEAD,
    bodyFontFace: FONT_BODY
  };
  return pptx;
}

function px(value: number) {
  return Number((value * PX).toFixed(4));
}

function hex(contract: BrandContract, token: string) {
  return contract.approved_color_tokens[token].replace("#", "");
}

function assetPath(publicPath?: string) {
  if (!publicPath) {
    return "";
  }

  return path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
}

function templateAsset(
  contract: BrandContract,
  key:
    | "wordmark_black"
    | "wordmark_white"
    | "hero_photo"
    | "texture_title"
    | "texture_agenda"
) {
  return assetPath(contract.template_assets?.[key]);
}

function templateIcon(contract: BrandContract, key: string) {
  return assetPath(contract.template_assets?.icons[key]);
}

function text(value: unknown, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }

  return String(value);
}

function arrayField<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function addBackground(
  pptx: Deck,
  slide: Slide,
  contract: BrandContract,
  mode: ThemeMode
) {
  const token =
    mode === "dark" ? "black" : mode === "warm" ? "warm_sand" : "white";
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: SLIDE_H,
    fill: { color: hex(contract, token) },
    line: { color: hex(contract, token) }
  });
}

function addTemplateChrome(
  pptx: Deck,
  slide: Slide,
  contract: BrandContract,
  pageNumber: number,
  section: string,
  mode: ThemeMode = "light",
  deckLabel = "CLIENT REPORT"
) {
  const isDark = mode === "dark";
  addBackground(pptx, slide, contract, mode);

  slide.addText(deckLabel.toUpperCase(), {
    x: px(22.12),
    y: px(19.92),
    w: px(215.12),
    h: px(19.4),
    margin: 0,
    fontFace: FONT_MONO,
    fontSize: 8,
    color: hex(contract, isDark ? "white" : "ink")
  });
  slide.addText(section.toUpperCase(), {
    x: px(293.84),
    y: px(19.92),
    w: px(290),
    h: px(19.4),
    margin: 0,
    fontFace: FONT_MONO,
    fontSize: 8,
    color: hex(contract, isDark ? "white" : "ink")
  });
  slide.addShape(pptx.ShapeType.hexagon, {
    x: px(1866.13),
    y: px(23.65),
    w: px(31.75),
    h: px(27.46),
    fill: { color: hex(contract, isDark ? "primary_orange" : "primary_orange") },
    line: { color: hex(contract, isDark ? "primary_orange" : "primary_orange") }
  });
  slide.addImage({
    path: templateAsset(contract, isDark ? "wordmark_white" : "wordmark_black"),
    x: px(23.46),
    y: px(1024.5),
    w: px(244.39),
    h: px(31.5),
    altText: `${contract.companyName} wordmark from the approved template`
  });
  slide.addText(String(pageNumber).padStart(2, "0"), {
    x: px(1782.67),
    y: px(1040.06),
    w: px(115.21),
    h: px(19.4),
    margin: 0,
    align: "right",
    fontFace: FONT_BODY,
    fontSize: 5.5,
    color: hex(contract, isDark ? "white" : "ink")
  });
}

function addTitle(
  slide: Slide,
  contract: BrandContract,
  title: string,
  options: { x?: number; y?: number; w?: number; colorToken?: string } = {}
) {
  // Taller box + shrink-to-fit so insight-headline titles (full-sentence
  // takeaways, like the approved template examples) can wrap to two lines.
  slide.addText(title, {
    x: options.x ?? px(22.12),
    y: options.y ?? px(108),
    w: options.w ?? px(1332.76),
    h: px(132),
    margin: 0,
    fontFace: FONT_HEAD,
    fontSize: title.length > 44 ? 27 : 36,
    bold: true,
    breakLine: false,
    color: hex(contract, options.colorToken ?? "charcoal"),
    fit: "shrink"
  });
}

/**
 * Split copy containing a single *emphasized phrase* into rich-text runs so
 * the renderer can color the approved emphasis in the brand accent. Only the
 * emphasis color is renderer-controlled; the phrase itself comes from the
 * governed plan.
 */
function emphasisRuns(
  value: string,
  baseColor: string,
  accentColor: string
): Array<{ text: string; options: { color: string } }> {
  const match = value.match(/\*([^*]+)\*/);
  if (!match || match.index === undefined) {
    return [{ text: value, options: { color: baseColor } }];
  }

  const before = value.slice(0, match.index);
  const after = value.slice(match.index + match[0].length);
  const runs: Array<{ text: string; options: { color: string } }> = [];
  if (before) {
    runs.push({ text: before, options: { color: baseColor } });
  }
  runs.push({ text: match[1], options: { color: accentColor } });
  if (after) {
    runs.push({ text: after, options: { color: baseColor } });
  }
  return runs;
}

function addBodyCopy(
  slide: Slide,
  contract: BrandContract,
  value: string,
  x: number,
  y: number,
  w: number,
  h: number,
  options: {
    fontSize?: number;
    bold?: boolean;
    colorToken?: string;
    valign?: "top" | "middle" | "bottom";
  } = {}
) {
  slide.addText(value, {
    x,
    y,
    w,
    h,
    margin: 0,
    fontFace: options.bold ? FONT_HEAD : FONT_BODY,
    fontSize: options.fontSize ?? 10.5,
    bold: options.bold,
    color: hex(contract, options.colorToken ?? "ink"),
    fit: "shrink",
    breakLine: false,
    valign: options.valign ?? "top"
  });
}

function addLabel(
  slide: Slide,
  contract: BrandContract,
  value: string,
  x: number,
  y: number,
  options: { colorToken?: string; w?: number } = {}
) {
  slide.addText(value.toUpperCase(), {
    x,
    y,
    w: options.w ?? 1.75,
    h: 0.16,
    margin: 0,
    fontFace: FONT_MONO,
    fontSize: 6.5,
    bold: true,
    color: hex(contract, options.colorToken ?? "primary_orange")
  });
}

function addPositiveRect(
  pptx: Deck,
  slide: Slide,
  contract: BrandContract,
  options: {
    x: number;
    y: number;
    w: number;
    h: number;
    token: string;
  }
) {
  slide.addShape(pptx.ShapeType.rect, {
    x: options.x,
    y: options.y,
    w: Math.max(options.w, 0.01),
    h: Math.max(options.h, 0.01),
    fill: { color: hex(contract, options.token) },
    line: { color: hex(contract, options.token) }
  });
}

function addTrendSegment(
  pptx: Deck,
  slide: Slide,
  contract: BrandContract,
  from: { x: number; y: number },
  to: { x: number; y: number }
) {
  // Direct point-to-point segment so the trend reads as a clean line chart
  // instead of a stair-step.
  slide.addShape(pptx.ShapeType.line, {
    x: from.x,
    y: Math.min(from.y, to.y),
    w: Math.max(to.x - from.x, 0.01),
    h: Math.abs(to.y - from.y),
    flipV: to.y < from.y,
    line: { color: hex(contract, "primary_orange"), width: 2.4 }
  });
}

/**
 * X positions for a row of equal-width columns centered in the content band.
 */
function centeredColumnXs(count: number, columnW: number, gap: number) {
  const contentLeft = px(22.12);
  const contentRight = SLIDE_W - px(22.12);
  const total = count * columnW + Math.max(count - 1, 0) * gap;
  const start = contentLeft + Math.max((contentRight - contentLeft - total) / 2, 0);
  return Array.from({ length: count }, (_, index) => start + index * (columnW + gap));
}

function renderTitleSlide(
  pptx: Deck,
  slide: Slide,
  contract: BrandContract,
  plan: DeckPlan,
  slideDef: DeckSlide
) {
  addBackground(pptx, slide, contract, "warm");
  slide.addShape(pptx.ShapeType.rect, {
    x: px(1108.56),
    y: 0,
    w: SLIDE_W - px(1108.56),
    h: SLIDE_H,
    fill: { color: hex(contract, "primary_orange") },
    line: { color: hex(contract, "primary_orange") }
  });
  slide.addImage({
    path: templateAsset(contract, "texture_title"),
    x: px(1135.09),
    y: px(75.45),
    w: px(788.81),
    h: px(971.89),
    altText: `${contract.companyName} approved title texture`
  });
  slide.addShape(pptx.ShapeType.hexagon, {
    x: px(1866.13),
    y: px(23.65),
    w: px(31.75),
    h: px(27.46),
    fill: { color: hex(contract, "black") },
    line: { color: hex(contract, "black") }
  });
  slide.addImage({
    path: templateAsset(contract, "hero_photo"),
    x: px(1135.09),
    y: px(601.42),
    w: px(762.79),
    h: px(445.92),
    sizing: { type: "cover", x: px(1135.09), y: px(601.42), w: px(762.79), h: px(445.92) },
    altText: `${contract.companyName} approved template imagery`
  });
  slide.addText(text(slideDef.fields.deck_label, "CLIENT REPORT").toUpperCase(), {
    x: px(22.12),
    y: px(18.23),
    w: px(300),
    h: px(22.61),
    margin: 0,
    fontFace: FONT_MONO,
    fontSize: 9,
    color: hex(contract, "ink")
  });
  slide.addText(text(slideDef.fields.client_name, plan.client_name), {
    x: px(21.99),
    y: px(55.09),
    w: px(1050),
    h: px(310),
    margin: 0,
    fontFace: FONT_HEAD,
    fontSize: 58,
    bold: true,
    breakLine: false,
    color: hex(contract, "charcoal"),
    fit: "shrink"
  });
  // The plan subtitle is the single source for this line - no repeated title.
  const subtitle = text(slideDef.fields.subtitle, slideDef.title);
  slide.addText(subtitle, {
    x: px(21.99),
    y: px(402.55),
    w: px(799.28),
    h: px(97.29),
    margin: 0,
    fontFace: FONT_HEAD,
    fontSize: 28,
    bold: false,
    color: hex(contract, "charcoal"),
    fit: "shrink"
  });
  // Show the reporting period as a small label when the subtitle does not
  // already carry it, so every title slide states the period exactly once.
  const reportPeriod = text(slideDef.fields.report_period, plan.report_period);
  if (
    reportPeriod &&
    !subtitle.toLowerCase().includes(reportPeriod.toLowerCase())
  ) {
    slide.addText(reportPeriod.toUpperCase(), {
      x: px(21.99),
      y: px(540),
      w: px(500),
      h: px(28),
      margin: 0,
      fontFace: FONT_MONO,
      fontSize: 11,
      bold: true,
      color: hex(contract, "ink")
    });
  }
  slide.addImage({
    path: templateAsset(contract, "wordmark_black"),
    x: px(22.12),
    y: px(980.71),
    w: px(516.88),
    h: px(66.63),
    altText: `${contract.companyName} wordmark from the approved template`
  });
}

function renderAgenda(
  pptx: Deck,
  slide: Slide,
  contract: BrandContract,
  slideDef: DeckSlide
) {
  slide.addImage({
    path: templateAsset(contract, "texture_agenda"),
    x: 0,
    y: px(448.87),
    w: px(815.23),
    h: px(631.13),
    altText: `${contract.companyName} approved agenda texture`
  });
  const items = arrayField<string>(slideDef.fields.agenda_items).slice(0, 6);
  // Vertically center the agenda block so short agendas don't bunch at the top.
  const itemSpacing = 128;
  const blockHeight = (items.length - 1) * itemSpacing + 74;
  const startY = Math.max(80, (1080 - blockHeight) / 2 - 40);
  items.forEach((item, index) => {
    const y = px(startY + index * itemSpacing);
    slide.addText(String(index + 1).padStart(2, "0"), {
      x: px(763.29),
      y,
      w: px(47.69),
      h: px(29.1),
      margin: 0,
      fontFace: FONT_MONO,
      fontSize: 14,
      bold: true,
      color: hex(contract, "primary_orange")
    });
    slide.addText(item, {
      x: px(838.13),
      y,
      w: px(788.28),
      h: px(73.89),
      margin: 0,
      fontFace: FONT_HEAD,
      fontSize: 23,
      bold: true,
      color: hex(contract, "white"),
      fit: "shrink"
    });
  });
}

function renderStatement(
  pptx: Deck,
  slide: Slide,
  contract: BrandContract,
  slideDef: DeckSlide
) {
  // Bold framing statement on the dark background, mirroring the approved
  // template's "Our goal for you today" slides. The emphasis phrase (marked
  // with *asterisks* in the plan) renders in the brand accent color.
  const statement = text(slideDef.fields.statement_text, slideDef.title);
  const runs = emphasisRuns(
    statement,
    hex(contract, "white"),
    hex(contract, "primary_orange")
  );

  slide.addText(
    runs.map((run) => ({
      text: run.text,
      options: {
        color: run.options.color,
        fontFace: FONT_HEAD,
        fontSize: 40,
        bold: true
      }
    })),
    {
      x: px(292),
      y: px(360),
      w: px(1336),
      h: px(420),
      margin: 0,
      valign: "top",
      fit: "shrink"
    }
  );
}

function renderExecutiveSummary(
  slide: Slide,
  contract: BrandContract,
  slideDef: DeckSlide
) {
  addTitle(slide, contract, slideDef.title, { w: px(1050) });
  addBodyCopy(
    slide,
    contract,
    text(slideDef.fields.business_impact),
    px(22.12),
    px(240),
    px(740),
    px(420),
    { fontSize: 18, bold: true, colorToken: "charcoal" }
  );
  const summaryPoints = arrayField<string>(slideDef.fields.summary_points);
  // Distribute the points evenly through the content band so short lists do
  // not bunch at the top of the slide.
  const bandTop = px(240);
  const bandBottom = px(980);
  const blockH = px(150);
  const spacing =
    summaryPoints.length > 1
      ? Math.min(
          px(190),
          (bandBottom - bandTop - blockH) / (summaryPoints.length - 1)
        )
      : 0;
  const groupH = blockH + spacing * Math.max(summaryPoints.length - 1, 0);
  const startY = bandTop + Math.max((bandBottom - bandTop - groupH) / 2, 0);
  summaryPoints.forEach((point, index) => {
    const x = px(838.13);
    const y = startY + index * spacing;
    addLabel(slide, contract, `Point 0${index + 1}`, x, y);
    addBodyCopy(slide, contract, point, x, y + 0.26, px(720), px(96), {
      fontSize: 14,
      bold: true
    });
  });
}

function renderScorecard(
  pptx: Deck,
  slide: Slide,
  contract: BrandContract,
  slideDef: DeckSlide
) {
  addTitle(slide, contract, slideDef.title);
  addBodyCopy(
    slide,
    contract,
    text(slideDef.fields.metric_context),
    px(22.12),
    px(228.7),
    px(1517.89),
    px(45.26),
    { fontSize: 11 }
  );
  const fields = slideDef.fields;
  const metrics = [
    ["Adoption Score", `${text(fields.adoption_score)}%`, "Current health", "insights"],
    ["Active Users", text(fields.active_users), "Using the platform", "reporting"],
    ["Licensed Users", text(fields.licensed_users), "Assigned seats", "data"],
    ["Active Projects", text(fields.projects_active), "Tracked projects", "project_management"],
    ["Mobile Usage", `${text(fields.mobile_usage_rate)}%`, "Field engagement", "mobile"]
  ];

  // Count-aware grid: rows of up to three cards spread across the full
  // content width, with partial rows centered so the slide stays balanced.
  const contentLeft = px(22.12);
  const contentRight = SLIDE_W - px(22.12);
  const gap = px(31);
  const perRow = 3;
  const cardW = (contentRight - contentLeft - gap * (perRow - 1)) / perRow;
  const cardH = px(265);
  const rowGap = px(36);
  const rowCount = Math.ceil(metrics.length / perRow);
  const gridTop = px(402);

  const positions = metrics.map((_, index) => {
    const row = Math.floor(index / perRow);
    const inRow = index % perRow;
    const itemsInRow =
      row === rowCount - 1 && metrics.length % perRow !== 0
        ? metrics.length % perRow
        : perRow;
    const rowWidth = itemsInRow * cardW + (itemsInRow - 1) * gap;
    const rowStart = contentLeft + (contentRight - contentLeft - rowWidth) / 2;
    return [
      rowStart + inRow * (cardW + gap),
      gridTop + row * (cardH + rowGap),
      cardW,
      cardH
    ];
  });

  metrics.forEach(([label, value, context, iconKey], index) => {
    const [x, y, w, h] = positions[index];
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w,
      h,
      fill: { color: hex(contract, index === 0 ? "warm_sand" : "light_gray") },
      line: { color: hex(contract, "stone"), width: 0.55 }
    });
    slide.addImage({
      path: templateIcon(contract, iconKey),
      x: x + 0.28,
      y: y + 0.32,
      w: 0.34,
      h: 0.34,
      altText: `${label} approved template icon`
    });
    addLabel(slide, contract, label, x + 0.75, y + 0.35, {
      colorToken: "ink",
      w: w - 1.2
    });
    slide.addText(value, {
      x: x + 0.75,
      y: y + 0.74,
      w: w - 1.05,
      h: 0.44,
      margin: 0,
      fontFace: FONT_HEAD,
      fontSize: 25,
      bold: true,
      color: hex(contract, "charcoal")
    });
    addBodyCopy(slide, contract, context, x + 0.75, y + 1.33, w - 1.0, 0.24, {
      fontSize: 8.5
    });
  });
}

function renderUsageTrend(
  pptx: Deck,
  slide: Slide,
  contract: BrandContract,
  slideDef: DeckSlide
) {
  addTitle(slide, contract, slideDef.title, { x: px(292.22), w: px(815.18) });
  addBodyCopy(
    slide,
    contract,
    text(slideDef.fields.trend_summary),
    px(294.12),
    px(234.12),
    px(1213.42),
    px(79.12),
    { fontSize: 11.5 }
  );
  const points = arrayField<{
    label: string;
    adoption_score: number;
    active_users: number;
  }>(slideDef.fields.trend_points);
  const chartX = px(315);
  const chartY = px(386);
  const chartW = px(1115);
  const chartH = px(456);

  // Clean white plot area with brand-contract gridlines and readable labels.
  const gridline = contract.chart_color_rules.neutral_gridline.replace("#", "");
  const axisLabel = contract.chart_color_rules.axis_label.replace("#", "");
  slide.addShape(pptx.ShapeType.rect, {
    x: chartX,
    y: chartY,
    w: chartW,
    h: chartH,
    fill: { color: hex(contract, "white") },
    line: { color: gridline, width: 0.5 }
  });
  [0, 25, 50, 75, 100].forEach((value) => {
    const y = chartY + chartH - (value / 100) * chartH;
    slide.addShape(pptx.ShapeType.line, {
      x: chartX,
      y,
      w: chartW,
      h: 0,
      line: { color: gridline, width: 0.5 }
    });
    slide.addText(String(value), {
      x: chartX - 0.38,
      y: y - 0.08,
      w: 0.28,
      h: 0.16,
      margin: 0,
      fontFace: FONT_BODY,
      fontSize: 8,
      align: "right",
      color: axisLabel
    });
  });

  const step = points.length > 1 ? chartW / (points.length - 1) : chartW;
  const coords = points.map((point, index) => ({
    x: chartX + index * step,
    y: chartY + chartH - (point.adoption_score / 100) * chartH,
    label: point.label,
    score: point.adoption_score
  }));

  coords.slice(1).forEach((coord, index) => {
    addTrendSegment(pptx, slide, contract, coords[index], coord);
  });
  coords.forEach((coord) => {
    slide.addShape(pptx.ShapeType.ellipse, {
      x: coord.x - 0.05,
      y: coord.y - 0.05,
      w: 0.1,
      h: 0.1,
      fill: { color: hex(contract, "primary_orange") },
      line: { color: hex(contract, "primary_orange") }
    });
    slide.addText(`${coord.score}`, {
      x: coord.x - 0.22,
      y: coord.y - 0.3,
      w: 0.44,
      h: 0.18,
      margin: 0,
      fontFace: FONT_HEAD,
      fontSize: 9,
      bold: true,
      align: "center",
      color: hex(contract, "charcoal")
    });
    slide.addText(coord.label, {
      x: coord.x - 0.5,
      y: chartY + chartH + 0.12,
      w: 1.0,
      h: 0.18,
      margin: 0,
      fontFace: FONT_BODY,
      fontSize: 7.5,
      align: "center",
      color: contract.chart_color_rules.axis_label.replace("#", "")
    });
  });

  // Deterministic, client-facing callout computed from the plotted data. The
  // metric name comes from the plan so non-adoption trends label correctly.
  if (points.length > 1) {
    const metricLabel = text(slideDef.fields.trend_metric_label, "Adoption score");
    const first = points[0];
    const last = points[points.length - 1];
    const delta = last.adoption_score - first.adoption_score;
    const direction = delta >= 0 ? "+" : "";
    addBodyCopy(
      slide,
      contract,
      `${direction}${delta} pts since ${first.label}`,
      px(1484.31),
      px(507.09),
      px(376.13),
      px(120),
      { fontSize: 22, bold: true, colorToken: "primary_orange" }
    );
    addBodyCopy(
      slide,
      contract,
      `${metricLabel} reached ${last.adoption_score} in ${last.label}.`,
      px(1484.31),
      px(620),
      px(376.13),
      px(110),
      { fontSize: 11 }
    );
  }
}

function renderFeatureAdoption(
  pptx: Deck,
  slide: Slide,
  contract: BrandContract,
  slideDef: DeckSlide
) {
  addTitle(slide, contract, slideDef.title, { x: px(292.22), w: px(900) });
  addBodyCopy(
    slide,
    contract,
    `Top feature: ${text(slideDef.fields.top_feature)}. Focus area: ${text(slideDef.fields.lowest_feature)}.`,
    px(294.12),
    px(234.12),
    px(1213.42),
    px(79.12),
    { fontSize: 11.5 }
  );

  const metrics = arrayField<{ feature: string; count: number }>(
    slideDef.fields.feature_metrics
  );
  const max = Math.max(...metrics.map((metric) => metric.count), 1);
  // Tighten row spacing as the list grows so bars and callouts never collide.
  const rowSpacing = metrics.length > 3 ? 105 : 135;
  metrics.forEach((metric, index) => {
    const y = px(410 + index * rowSpacing);
    const barW = px(880) * (metric.count / max);
    const iconKey =
      metric.feature === "RFIs"
        ? "rfi"
        : metric.feature === "Daily Logs"
          ? "reporting"
          : "data";
    slide.addImage({
      path: templateIcon(contract, iconKey),
      x: px(292),
      y: y - 0.08,
      w: 0.24,
      h: 0.24,
      altText: `${metric.feature} approved template icon`
    });
    addBodyCopy(slide, contract, metric.feature, px(345), y, px(210), px(34), {
      fontSize: 9,
      bold: true
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: px(590),
      y,
      w: px(880),
      h: px(38),
      fill: { color: hex(contract, "light_gray") },
      line: { color: hex(contract, "stone"), width: 0.3 }
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: px(590),
      y,
      w: barW,
      h: px(38),
      fill: { color: index === 0 ? hex(contract, "primary_orange") : hex(contract, "ink") },
      line: { color: index === 0 ? hex(contract, "primary_orange") : hex(contract, "ink") }
    });
    slide.addText(String(metric.count), {
      x: px(1505),
      y: y + 0.01,
      w: px(100),
      h: px(26),
      margin: 0,
      fontFace: FONT_HEAD,
      fontSize: 8.5,
      bold: true,
      color: hex(contract, "charcoal"),
      align: "right"
    });
  });

  // Place the callout cards below the last bar instead of at a fixed Y so
  // longer metric lists can never overlap them.
  const calloutY = Math.max(
    px(790),
    px(410 + metrics.length * rowSpacing + 20)
  );
  const callouts = [
    ["Top feature", text(slideDef.fields.top_feature), "warm_sand"],
    ["Focus area", text(slideDef.fields.lowest_feature), "light_gray"]
  ] as const;
  callouts.forEach(([label, value, token], index) => {
    const x = px(292 + index * 510);
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y: calloutY,
      w: px(430),
      h: px(110),
      fill: { color: hex(contract, token) },
      line: { color: hex(contract, "stone"), width: 0.35 }
    });
    addLabel(slide, contract, label, x + 0.24, calloutY + 0.17, { colorToken: "ink" });
    addBodyCopy(slide, contract, value, x + 0.24, calloutY + 0.42, px(330), px(45), {
      fontSize: 13,
      bold: true
    });
  });
}

function renderRisks(
  pptx: Deck,
  slide: Slide,
  contract: BrandContract,
  slideDef: DeckSlide
) {
  addTitle(slide, contract, slideDef.title, { w: px(1066.52) });
  addBodyCopy(
    slide,
    contract,
    text(slideDef.fields.risk_summary),
    px(22.12),
    px(228.7),
    px(900),
    px(150),
    { fontSize: 15, bold: true }
  );
  const recommendations = arrayField<string>(slideDef.fields.recommendations).slice(0, 3);
  const columnXs = centeredColumnXs(recommendations.length, px(514.33), px(29));
  const iconKeys = ["warning", "insights", "project_management"];
  recommendations.forEach((recommendation, index) => {
    const x = columnXs[index];
    slide.addImage({
      path: templateIcon(contract, iconKeys[index % iconKeys.length]),
      x,
      y: px(430),
      w: px(96),
      h: px(96),
      altText: "Recommendation icon from the approved brand template"
    });
    addLabel(slide, contract, `Point 0${index + 1}`, x, px(596));
    addBodyCopy(slide, contract, recommendation, x, px(636), px(514.33), px(260), {
      fontSize: 13,
      bold: true
    });
  });
}

function renderNextSteps(
  pptx: Deck,
  slide: Slide,
  contract: BrandContract,
  slideDef: DeckSlide
) {
  const isAppendix =
    slideDef.title.toLowerCase().includes("appendix") ||
    slideDef.title.toLowerCase().includes("source");
  addTitle(slide, contract, slideDef.title, {
    w: isAppendix ? px(1500) : px(1066.52)
  });
  const steps = arrayField<string>(slideDef.fields.steps).slice(0, 3);
  const cardW = px(518.05);
  const cardH = isAppendix ? px(320) : px(420);
  const cardY = isAppendix ? px(380) : px(420);
  const cardXs = centeredColumnXs(steps.length, cardW, px(27));
  steps.forEach((step, index) => {
    const x = cardXs[index];
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y: cardY,
      w: cardW,
      h: cardH,
      fill: { color: hex(contract, index === 0 ? "warm_sand" : "light_gray") },
      line: { color: hex(contract, "stone"), width: 0.35 }
    });
    addLabel(slide, contract, String(index + 1).padStart(2, "0"), x + 0.33, cardY + 0.33);
    // Vertically centered within the card so copy never floats in dead space.
    addBodyCopy(
      slide,
      contract,
      step,
      x + 0.33,
      cardY + 0.62,
      cardW - 0.66,
      cardH - 0.95,
      {
        fontSize: 13.5,
        bold: true,
        valign: "middle"
      }
    );
  });
  if (slideDef.fields.note) {
    const noteY = cardY + cardH + 0.22;
    addBodyCopy(slide, contract, text(slideDef.fields.note), px(22.12), noteY, px(1500), px(50), {
      fontSize: 9.5,
      colorToken: "medium_gray"
    });
  }
}

function renderSlide(
  pptx: Deck,
  slide: Slide,
  contract: BrandContract,
  plan: DeckPlan,
  slideDef: DeckSlide,
  pageNumber: number
) {
  if (slideDef.layout_id === "title_client_report") {
    renderTitleSlide(pptx, slide, contract, plan, slideDef);
    return;
  }

  const dark =
    slideDef.layout_id === "agenda" || slideDef.layout_id === "statement";
  // The section kicker mirrors the slide's actual title so an appendix slide
  // reusing a layout never inherits the wrong label (e.g. "NEXT STEPS" on a
  // Source Notes slide).
  addTemplateChrome(
    pptx,
    slide,
    contract,
    pageNumber,
    slideDef.title.slice(0, 36),
    dark ? "dark" : "light",
    text(slideDef.fields.deck_label, "CLIENT REPORT")
  );

  switch (slideDef.layout_id) {
    case "agenda":
      renderAgenda(pptx, slide, contract, slideDef);
      break;
    case "statement":
      renderStatement(pptx, slide, contract, slideDef);
      break;
    case "executive_summary":
      renderExecutiveSummary(slide, contract, slideDef);
      break;
    case "adoption_kpi_scorecard":
      renderScorecard(pptx, slide, contract, slideDef);
      break;
    case "usage_trend":
      renderUsageTrend(pptx, slide, contract, slideDef);
      break;
    case "feature_adoption":
      renderFeatureAdoption(pptx, slide, contract, slideDef);
      break;
    case "risks_recommendations":
      renderRisks(pptx, slide, contract, slideDef);
      break;
    case "next_steps":
      renderNextSteps(pptx, slide, contract, slideDef);
      break;
  }
}

async function enforceApprovedPackageColors(
  buffer: Buffer,
  brandContract: BrandContract
) {
  const approved = new Set(
    Object.values(brandContract.approved_color_tokens).map((color) =>
      color.replace("#", "").toUpperCase()
    )
  );
  const fallback = hex(brandContract, "ink");
  const replacements: Record<string, string> = {
    "0563C1": hex(brandContract, "primary_orange"),
    "44546A": hex(brandContract, "ink"),
    "4472C4": hex(brandContract, "primary_orange"),
    "5B9BD5": hex(brandContract, "secondary_orange"),
    "70AD47": hex(brandContract, "medium_gray"),
    "954F72": hex(brandContract, "stone"),
    A5A5A5: hex(brandContract, "medium_gray"),
    E7E6E6: hex(brandContract, "light_gray"),
    ED7D31: hex(brandContract, "secondary_orange"),
    FFC000: hex(brandContract, "stone")
  };

  const zip = await JSZip.loadAsync(buffer);
  const xmlFiles = Object.keys(zip.files).filter(
    (fileName) => fileName.startsWith("ppt/theme/") && fileName.endsWith(".xml")
  );

  await Promise.all(
    xmlFiles.map(async (fileName) => {
      const file = zip.file(fileName);
      if (!file) {
        return;
      }

      let xml = await file.async("string");
      xml = xml.replace(
        /(srgbClr val=")([0-9A-Fa-f]{6})(")/g,
        (_match, prefix: string, value: string, suffix: string) => {
          const normalized = value.toUpperCase();
          const replacement = approved.has(normalized)
            ? normalized
            : replacements[normalized] ?? fallback;
          return `${prefix}${replacement}${suffix}`;
        }
      );
      xml = xml.replace(
        /(lastClr=")([0-9A-Fa-f]{6})(")/g,
        (_match, prefix: string, value: string, suffix: string) => {
          const normalized = value.toUpperCase();
          const replacement = approved.has(normalized)
            ? normalized
            : replacements[normalized] ?? fallback;
          return `${prefix}${replacement}${suffix}`;
        }
      );
      zip.file(fileName, xml);
    })
  );

  return zip.generateAsync({ type: "nodebuffer" });
}

export async function renderPptx(
  deckPlan: DeckPlan,
  brandContract: BrandContract
): Promise<Buffer> {
  applyContractFonts(brandContract);
  const pptx = createDeck(brandContract, deckPlan);

  deckPlan.slides.forEach((slideDef, index) => {
    const slide = pptx.addSlide();
    renderSlide(pptx, slide, brandContract, deckPlan, slideDef, index + 1);
  });

  const output = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  const buffer = Buffer.isBuffer(output) ? output : Buffer.from(output);
  return enforceApprovedPackageColors(buffer, brandContract);
}
