import pptxgen from "pptxgenjs";
import JSZip from "jszip";
import path from "node:path";
import type { BrandContract, DeckPlan, DeckSlide } from "@/lib/deck-plan-schema";

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const PX = 1 / 144;
const FONT_HEAD = "Inter Tight SemiBold";
const FONT_BODY = "Inter";
const FONT_MONO = "DM Mono Medium";

type Deck = ReturnType<typeof createDeck>;
type Slide = ReturnType<Deck["addSlide"]>;
type ThemeMode = "light" | "warm" | "dark";

function createDeck() {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "BrandDeck Studio";
  pptx.company = "Procore Demo Brand";
  pptx.subject = "Client adoption report";
  pptx.title = "BrandDeck Studio Adoption Report";
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
  mode: ThemeMode = "light"
) {
  const isDark = mode === "dark";
  addBackground(pptx, slide, contract, mode);

  slide.addText("CLIENT REPORT", {
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
    altText: "Procore wordmark from approved template"
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
  slide.addText(title, {
    x: options.x ?? px(22.12),
    y: options.y ?? px(119.32),
    w: options.w ?? px(1332.76),
    h: px(90),
    margin: 0,
    fontFace: FONT_HEAD,
    fontSize: 36,
    bold: true,
    breakLine: false,
    color: hex(contract, options.colorToken ?? "charcoal"),
    fit: "shrink"
  });
}

function addBodyCopy(
  slide: Slide,
  contract: BrandContract,
  value: string,
  x: number,
  y: number,
  w: number,
  h: number,
  options: { fontSize?: number; bold?: boolean; colorToken?: string } = {}
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
    breakLine: false
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
  const thickness = 0.03;
  const midX = to.x;
  const minY = Math.min(from.y, to.y);

  addPositiveRect(pptx, slide, contract, {
    x: from.x,
    y: from.y - thickness / 2,
    w: to.x - from.x,
    h: thickness,
    token: "primary_orange"
  });
  addPositiveRect(pptx, slide, contract, {
    x: midX - thickness / 2,
    y: minY,
    w: thickness,
    h: Math.abs(to.y - from.y),
    token: "primary_orange"
  });
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
    altText: "Approved Procore title texture"
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
    altText: "Construction workers from approved Procore template"
  });
  slide.addText("CLIENT ADOPTION REPORT", {
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
  slide.addText(`${slideDef.title}. ${text(slideDef.fields.subtitle)}`, {
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
  slide.addText(text(slideDef.fields.report_period, plan.report_period), {
    x: px(293.84),
    y: px(689.17),
    w: px(690.2),
    h: px(73.54),
    margin: 0,
    fontFace: FONT_HEAD,
    fontSize: 16,
    bold: true,
    color: hex(contract, "charcoal")
  });
  slide.addImage({
    path: templateAsset(contract, "wordmark_black"),
    x: px(22.12),
    y: px(980.71),
    w: px(516.88),
    h: px(66.63),
    altText: "Procore wordmark from approved template"
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
    altText: "Approved Procore agenda texture"
  });
  const items = arrayField<string>(slideDef.fields.agenda_items).slice(0, 6);
  items.forEach((item, index) => {
    const y = px(80 + index * 128);
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
    px(228.7),
    px(793.13),
    px(160),
    { fontSize: 13 }
  );
  const summaryPoints = arrayField<string>(slideDef.fields.summary_points);
  summaryPoints.forEach((point, index) => {
    const x = px(838.13);
    const y = px(230 + index * 170);
    addLabel(slide, contract, `Point 0${index + 1}`, x, y);
    addBodyCopy(slide, contract, point, x, y + 0.28, px(720), px(110), {
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
  const positions = [
    [px(22.12), px(402), px(435.31), px(255)],
    [px(488.72), px(402), px(435.31), px(255)],
    [px(955.31), px(402), px(435.31), px(255)],
    [px(22.12), px(704), px(435.31), px(230)],
    [px(488.72), px(704), px(435.31), px(230)]
  ];

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
      altText: `${label} Procore template icon`
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

  slide.addShape(pptx.ShapeType.rect, {
    x: chartX,
    y: chartY,
    w: chartW,
    h: chartH,
    fill: { color: hex(contract, "warm_sand") },
    line: { color: hex(contract, "stone"), width: 0.35 }
  });
  [0, 25, 50, 75, 100].forEach((value) => {
    const y = chartY + chartH - (value / 100) * chartH;
    slide.addShape(pptx.ShapeType.line, {
      x: chartX,
      y,
      w: chartW,
      h: 0,
      line: { color: hex(contract, "stone"), width: 0.35 }
    });
    slide.addText(String(value), {
      x: chartX - 0.3,
      y: y - 0.07,
      w: 0.2,
      h: 0.15,
      margin: 0,
      fontFace: FONT_BODY,
      fontSize: 6.2,
      align: "right",
      color: hex(contract, "ink")
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
      x: coord.x - 0.18,
      y: coord.y - 0.28,
      w: 0.36,
      h: 0.16,
      margin: 0,
      fontFace: FONT_HEAD,
      fontSize: 7,
      bold: true,
      align: "center",
      color: hex(contract, "charcoal")
    });
    slide.addText(coord.label, {
      x: coord.x - 0.38,
      y: chartY + chartH + 0.12,
      w: 0.76,
      h: 0.16,
      margin: 0,
      fontFace: FONT_BODY,
      fontSize: 6,
      align: "center",
      color: hex(contract, "ink")
    });
  });

  addBodyCopy(
    slide,
    contract,
    "Adoption score trend generated from the approved local CSV data.",
    px(1484.31),
    px(507.09),
    px(376.13),
    px(201.98),
    { fontSize: 15, colorToken: "primary_orange" }
  );
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
  metrics.forEach((metric, index) => {
    const y = px(410 + index * 135);
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
      altText: `${metric.feature} Procore template icon`
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

  const callouts = [
    ["Top feature", text(slideDef.fields.top_feature), "warm_sand"],
    ["Focus area", text(slideDef.fields.lowest_feature), "light_gray"]
  ] as const;
  callouts.forEach(([label, value, token], index) => {
    const x = px(292 + index * 510);
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y: px(790),
      w: px(430),
      h: px(110),
      fill: { color: hex(contract, token) },
      line: { color: hex(contract, "stone"), width: 0.35 }
    });
    addLabel(slide, contract, label, x + 0.24, px(815), { colorToken: "ink" });
    addBodyCopy(slide, contract, value, x + 0.24, px(850), px(330), px(45), {
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
  const cardXs = [px(23.46), px(566.89), px(1111.66)];
  recommendations.forEach((recommendation, index) => {
    const x = cardXs[index];
    slide.addImage({
      path: templateIcon(contract, index === 0 ? "warning" : "insights"),
      x,
      y: px(377.07),
      w: px(96),
      h: px(96),
      altText: "Recommendation icon from approved Procore template"
    });
    addLabel(slide, contract, `Point 0${index + 1}`, x, px(540));
    addBodyCopy(slide, contract, recommendation, x, px(580.79), px(514.33), px(220), {
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
  const isAppendix = slideDef.title.toLowerCase().includes("appendix");
  addTitle(slide, contract, slideDef.title, {
    w: isAppendix ? px(1500) : px(1066.52)
  });
  const steps = arrayField<string>(slideDef.fields.steps).slice(0, 3);
  const cardXs = [px(22.12), px(565.55), px(1108.99)];
  steps.forEach((step, index) => {
    const x = cardXs[index];
    const y = isAppendix ? px(365) : px(402);
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w: px(518.05),
      h: isAppendix ? px(300) : px(494.02),
      fill: { color: hex(contract, index === 0 ? "warm_sand" : "light_gray") },
      line: { color: hex(contract, "stone"), width: 0.35 }
    });
    addLabel(slide, contract, String(index + 1).padStart(2, "0"), x + 0.33, y + 0.35);
    addBodyCopy(slide, contract, step, x + 0.33, y + 0.82, px(423.43), isAppendix ? px(140) : px(238), {
      fontSize: 13.5,
      bold: true
    });
  });
  if (slideDef.fields.note) {
    addBodyCopy(slide, contract, text(slideDef.fields.note), px(22.12), px(900), px(1200), px(70), {
      fontSize: 9,
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

  const dark = slideDef.layout_id === "agenda";
  addTemplateChrome(
    pptx,
    slide,
    contract,
    pageNumber,
    slideDef.layout_id.replaceAll("_", " "),
    dark ? "dark" : "light"
  );

  switch (slideDef.layout_id) {
    case "agenda":
      renderAgenda(pptx, slide, contract, slideDef);
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
  const pptx = createDeck();

  deckPlan.slides.forEach((slideDef, index) => {
    const slide = pptx.addSlide();
    renderSlide(pptx, slide, brandContract, deckPlan, slideDef, index + 1);
  });

  const output = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  const buffer = Buffer.isBuffer(output) ? output : Buffer.from(output);
  return enforceApprovedPackageColors(buffer, brandContract);
}
