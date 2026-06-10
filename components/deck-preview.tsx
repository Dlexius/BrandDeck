"use client";

import { useState } from "react";
import type { BrandContract, DeckPlan, DeckSlide } from "@/lib/deck-plan-schema";

/**
 * Pre-export slide preview.
 *
 * A deterministic, read-only miniature of every planned slide, mirroring the
 * coordinate renderer's layouts with HTML/CSS. It uses only brand-contract
 * color tokens, so it previews any brand without renderer changes. It is a
 * structural preview for catching copy and sequence issues before export -
 * the PPTX renderer remains the single source of visual truth.
 */

type Tokens = Record<string, string>;

function tok(tokens: Tokens, key: string, fallback: string) {
  return tokens[key] ?? fallback;
}

function text(value: unknown, fallback = ""): string {
  if (value === undefined || value === null) {
    return fallback;
  }
  return String(value);
}

function list<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function Kicker({ tokens, label }: { tokens: Tokens; label: string }) {
  return (
    <div
      className="truncate font-mono text-[5px] font-bold uppercase tracking-[0.08em]"
      style={{ color: tok(tokens, "ink", "#3A3735") }}
    >
      {label}
    </div>
  );
}

function MiniTitle({ tokens, title }: { tokens: Tokens; title: string }) {
  return (
    <div
      className="truncate text-[11px] font-black leading-tight"
      style={{ color: tok(tokens, "charcoal", "#1D1B1A") }}
    >
      {title}
    </div>
  );
}

function TitleSlidePreview({
  slide,
  plan,
  tokens
}: {
  slide: DeckSlide;
  plan: DeckPlan;
  tokens: Tokens;
}) {
  return (
    <div
      className="flex h-full"
      style={{ background: tok(tokens, "warm_sand", "#ECE0D6") }}
    >
      <div className="flex w-[58%] flex-col justify-between p-2">
        <div>
          <Kicker
            tokens={tokens}
            label={text(slide.fields.deck_label, "CLIENT REPORT")}
          />
          <div
            className="mt-1 text-[13px] font-black leading-tight"
            style={{ color: tok(tokens, "charcoal", "#1D1B1A") }}
          >
            {text(slide.fields.client_name, plan.client_name)}
          </div>
          <div
            className="mt-1 line-clamp-2 text-[7px] font-semibold leading-snug"
            style={{ color: tok(tokens, "charcoal", "#1D1B1A") }}
          >
            {text(slide.fields.subtitle, slide.title)}
          </div>
        </div>
        <div
          className="font-mono text-[5.5px] font-bold uppercase"
          style={{ color: tok(tokens, "ink", "#3A3735") }}
        >
          {text(slide.fields.report_period, plan.report_period)}
        </div>
      </div>
      <div
        className="w-[42%]"
        style={{ background: tok(tokens, "primary_orange", "#FF5200") }}
      />
    </div>
  );
}

function AgendaPreview({ slide, tokens }: { slide: DeckSlide; tokens: Tokens }) {
  const items = list<string>(slide.fields.agenda_items).slice(0, 6);
  return (
    <div
      className="flex h-full flex-col justify-center gap-[3px] px-3"
      style={{ background: tok(tokens, "black", "#000000") }}
    >
      {items.map((item, index) => (
        <div key={index} className="flex items-baseline gap-1.5">
          <span
            className="font-mono text-[6px] font-bold"
            style={{ color: tok(tokens, "primary_orange", "#FF5200") }}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="truncate text-[7px] font-bold text-white">
            {item}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatementPreview({
  slide,
  tokens
}: {
  slide: DeckSlide;
  tokens: Tokens;
}) {
  const statement = text(slide.fields.statement_text, slide.title);
  const match = statement.match(/\*([^*]+)\*/);
  const before = match && match.index !== undefined
    ? statement.slice(0, match.index)
    : statement;
  const after = match && match.index !== undefined
    ? statement.slice(match.index + match[0].length)
    : "";

  return (
    <div
      className="flex h-full items-center px-4"
      style={{ background: tok(tokens, "black", "#000000") }}
    >
      <p className="line-clamp-4 text-[10px] font-black leading-snug text-white">
        {before}
        {match ? (
          <span style={{ color: tok(tokens, "primary_orange", "#FF5200") }}>
            {match[1]}
          </span>
        ) : null}
        {after}
      </p>
    </div>
  );
}

function PhotoDividerPreview({
  slide,
  tokens,
  heroPhoto
}: {
  slide: DeckSlide;
  tokens: Tokens;
  heroPhoto?: string;
}) {
  return (
    <div
      className="flex h-full"
      style={{ background: tok(tokens, "black", "#000000") }}
    >
      <div className="flex w-[62%] flex-col justify-center px-3">
        <div
          className="truncate font-mono text-[5px] font-bold uppercase tracking-[0.08em]"
          style={{ color: tok(tokens, "primary_orange", "#FF5200") }}
        >
          {text(slide.fields.section_label)}
        </div>
        <div className="mt-0.5 line-clamp-2 text-[11px] font-black leading-tight text-white">
          {slide.title}
        </div>
      </div>
      {heroPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroPhoto}
          alt="Approved template imagery"
          className="w-[38%] object-cover"
        />
      ) : (
        <div
          className="w-[38%]"
          style={{ background: tok(tokens, "primary_orange", "#FF5200") }}
        />
      )}
    </div>
  );
}

const PREVIEW_STATUS_CHIPS: Record<string, { label: string; token: string; textToken: string }> = {
  on_track: { label: "ON TRACK", token: "ink", textToken: "white" },
  at_risk: { label: "AT RISK", token: "primary_orange", textToken: "white" },
  needs_owner: { label: "NEEDS OWNER", token: "stone", textToken: "charcoal" },
  complete: { label: "COMPLETE", token: "medium_gray", textToken: "white" }
};

function ActionPlanPreview({
  slide,
  tokens
}: {
  slide: DeckSlide;
  tokens: Tokens;
}) {
  const items = list<{
    action?: unknown;
    owner?: unknown;
    timing?: unknown;
    status?: unknown;
  }>(slide.fields.action_items).slice(0, 5);

  return (
    <div className="flex h-full flex-col bg-white p-2">
      <MiniTitle tokens={tokens} title={slide.title} />
      <div className="mt-auto flex flex-col gap-[3px] pb-1">
        {items.map((item, index) => {
          const chip =
            PREVIEW_STATUS_CHIPS[String(item.status ?? "").toLowerCase()] ?? {
              label: text(item.status, "PLANNED").toUpperCase(),
              token: "light_gray",
              textToken: "charcoal"
            };

          return (
            <div
              key={index}
              className="flex items-center gap-1 rounded-[1px] px-1 py-[2px]"
              style={{
                background:
                  index % 2 === 0
                    ? tok(tokens, "light_gray", "#F3F3F3")
                    : "#FFFFFF"
              }}
            >
              <span
                className="flex-1 truncate text-[5.5px] font-bold"
                style={{ color: tok(tokens, "ink", "#3A3735") }}
              >
                {text(item.action)}
              </span>
              <span
                className="w-[18%] truncate text-[5px]"
                style={{ color: tok(tokens, "medium_gray", "#787E89") }}
              >
                {text(item.owner)}
              </span>
              <span
                className="w-[11%] truncate text-[5px]"
                style={{ color: tok(tokens, "medium_gray", "#787E89") }}
              >
                {text(item.timing)}
              </span>
              <span
                className="shrink-0 rounded-[2px] px-1 py-[1px] font-mono text-[4px] font-bold"
                style={{
                  background: tok(tokens, chip.token, "#3A3735"),
                  color: tok(tokens, chip.textToken, "#FFFFFF")
                }}
              >
                {chip.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExecutiveSummaryPreview({
  slide,
  tokens
}: {
  slide: DeckSlide;
  tokens: Tokens;
}) {
  const points = list<string>(slide.fields.summary_points);
  return (
    <div className="flex h-full gap-2 bg-white p-2">
      <div className="w-[45%]">
        <MiniTitle tokens={tokens} title={slide.title} />
        <p
          className="mt-1 line-clamp-4 text-[6.5px] font-bold leading-snug"
          style={{ color: tok(tokens, "charcoal", "#1D1B1A") }}
        >
          {text(slide.fields.business_impact)}
        </p>
      </div>
      <div className="flex w-[55%] flex-col justify-center gap-1">
        {points.slice(0, 5).map((point, index) => (
          <div key={index}>
            <div
              className="font-mono text-[4.5px] font-bold uppercase"
              style={{ color: tok(tokens, "primary_orange", "#FF5200") }}
            >
              Point 0{index + 1}
            </div>
            <div
              className="truncate text-[6.5px] font-bold"
              style={{ color: tok(tokens, "ink", "#3A3735") }}
            >
              {point}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScorecardPreview({
  slide,
  tokens
}: {
  slide: DeckSlide;
  tokens: Tokens;
}) {
  const metrics = [
    ["Adoption", `${text(slide.fields.adoption_score)}%`],
    ["Active", text(slide.fields.active_users)],
    ["Licensed", text(slide.fields.licensed_users)],
    ["Projects", text(slide.fields.projects_active)],
    ["Mobile", `${text(slide.fields.mobile_usage_rate)}%`]
  ];
  return (
    <div className="flex h-full flex-col bg-white p-2">
      <MiniTitle tokens={tokens} title={slide.title} />
      <p
        className="mt-0.5 truncate text-[6px]"
        style={{ color: tok(tokens, "ink", "#3A3735") }}
      >
        {text(slide.fields.metric_context)}
      </p>
      <div className="mt-auto grid grid-cols-3 gap-1 pb-1">
        {metrics.map(([label, value], index) => (
          <div
            key={label}
            className={`rounded-[2px] p-1 ${index === 4 ? "col-start-2" : ""}`}
            style={{
              background:
                index === 0
                  ? tok(tokens, "warm_sand", "#ECE0D6")
                  : tok(tokens, "light_gray", "#F3F3F3")
            }}
          >
            <div
              className="font-mono text-[4.5px] font-bold uppercase"
              style={{ color: tok(tokens, "ink", "#3A3735") }}
            >
              {label}
            </div>
            <div
              className="text-[9px] font-black"
              style={{ color: tok(tokens, "charcoal", "#1D1B1A") }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendPreview({ slide, tokens }: { slide: DeckSlide; tokens: Tokens }) {
  const points = list<{ label: string; adoption_score: number }>(
    slide.fields.trend_points
  );
  const width = 100;
  const height = 40;
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points.map((point, index) => ({
    x: index * step,
    y: height - (Math.max(0, Math.min(100, point.adoption_score)) / 100) * height
  }));
  const path = coords
    .map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x},${coord.y}`)
    .join(" ");

  return (
    <div className="flex h-full flex-col bg-white p-2">
      <MiniTitle tokens={tokens} title={slide.title} />
      <p
        className="mt-0.5 truncate text-[6px]"
        style={{ color: tok(tokens, "ink", "#3A3735") }}
      >
        {text(slide.fields.trend_summary)}
      </p>
      <div className="mt-auto flex items-end gap-2 pb-1">
        <svg
          viewBox={`-2 -3 ${width + 4} ${height + 6}`}
          className="h-[52%] w-[70%] rounded-[2px] border"
          style={{ borderColor: tok(tokens, "stone", "#D7CABF") }}
          preserveAspectRatio="none"
        >
          {[0.25, 0.5, 0.75].map((fraction) => (
            <line
              key={fraction}
              x1={0}
              x2={width}
              y1={height * fraction}
              y2={height * fraction}
              stroke={tok(tokens, "stone", "#D7CABF")}
              strokeWidth={0.4}
            />
          ))}
          {coords.length > 1 && (
            <path
              d={path}
              fill="none"
              stroke={tok(tokens, "primary_orange", "#FF5200")}
              strokeWidth={1.6}
            />
          )}
          {coords.map((coord, index) => (
            <circle
              key={index}
              cx={coord.x}
              cy={coord.y}
              r={1.6}
              fill={tok(tokens, "primary_orange", "#FF5200")}
            />
          ))}
        </svg>
        {points.length > 1 && (
          <div
            className="text-[8px] font-black leading-tight"
            style={{ color: tok(tokens, "primary_orange", "#FF5200") }}
          >
            {points[points.length - 1].adoption_score -
              points[0].adoption_score >=
            0
              ? "+"
              : ""}
            {points[points.length - 1].adoption_score -
              points[0].adoption_score}{" "}
            pts
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureBarsPreview({
  slide,
  tokens
}: {
  slide: DeckSlide;
  tokens: Tokens;
}) {
  const metrics = list<{ feature: string; count: number }>(
    slide.fields.feature_metrics
  ).slice(0, 5);
  const max = Math.max(...metrics.map((metric) => metric.count), 1);
  return (
    <div className="flex h-full flex-col bg-white p-2">
      <MiniTitle tokens={tokens} title={slide.title} />
      <p
        className="mt-0.5 truncate text-[6px]"
        style={{ color: tok(tokens, "ink", "#3A3735") }}
      >
        Top feature: {text(slide.fields.top_feature)}. Focus:{" "}
        {text(slide.fields.lowest_feature)}.
      </p>
      <div className="mt-auto flex flex-col gap-1 pb-1">
        {metrics.map((metric, index) => (
          <div key={metric.feature} className="flex items-center gap-1">
            <span
              className="w-[26%] truncate text-[5.5px] font-bold"
              style={{ color: tok(tokens, "ink", "#3A3735") }}
            >
              {metric.feature}
            </span>
            <div
              className="h-[6px] flex-1 overflow-hidden rounded-[1px]"
              style={{ background: tok(tokens, "light_gray", "#F3F3F3") }}
            >
              <div
                className="h-full"
                style={{
                  width: `${(metric.count / max) * 100}%`,
                  background:
                    index === 0
                      ? tok(tokens, "primary_orange", "#FF5200")
                      : tok(tokens, "ink", "#3A3735")
                }}
              />
            </div>
            <span
              className="w-7 text-right text-[5.5px] font-bold"
              style={{ color: tok(tokens, "charcoal", "#1D1B1A") }}
            >
              {metric.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RisksPreview({ slide, tokens }: { slide: DeckSlide; tokens: Tokens }) {
  const recommendations = list<string>(slide.fields.recommendations).slice(0, 3);
  return (
    <div className="flex h-full flex-col bg-white p-2">
      <MiniTitle tokens={tokens} title={slide.title} />
      <p
        className="mt-0.5 line-clamp-2 text-[6px] font-bold leading-snug"
        style={{ color: tok(tokens, "ink", "#3A3735") }}
      >
        {text(slide.fields.risk_summary)}
      </p>
      <div className="mt-auto flex justify-center gap-1.5 pb-1">
        {recommendations.map((recommendation, index) => (
          <div key={index} className="w-[31%]">
            <div
              className="font-mono text-[4.5px] font-bold uppercase"
              style={{ color: tok(tokens, "primary_orange", "#FF5200") }}
            >
              Point 0{index + 1}
            </div>
            <div
              className="line-clamp-3 text-[5.5px] font-bold leading-snug"
              style={{ color: tok(tokens, "ink", "#3A3735") }}
            >
              {recommendation}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepsPreview({ slide, tokens }: { slide: DeckSlide; tokens: Tokens }) {
  const steps = list<string>(slide.fields.steps).slice(0, 3);
  return (
    <div className="flex h-full flex-col bg-white p-2">
      <MiniTitle tokens={tokens} title={slide.title} />
      <div className="mt-auto flex justify-center gap-1.5 pb-1">
        {steps.map((step, index) => (
          <div
            key={index}
            className="flex h-14 w-[31%] flex-col rounded-[2px] p-1"
            style={{
              background:
                index === 0
                  ? tok(tokens, "warm_sand", "#ECE0D6")
                  : tok(tokens, "light_gray", "#F3F3F3")
            }}
          >
            <div
              className="font-mono text-[4.5px] font-bold"
              style={{ color: tok(tokens, "primary_orange", "#FF5200") }}
            >
              {String(index + 1).padStart(2, "0")}
            </div>
            <div
              className="my-auto line-clamp-3 text-[5.5px] font-bold leading-snug"
              style={{ color: tok(tokens, "ink", "#3A3735") }}
            >
              {step}
            </div>
          </div>
        ))}
      </div>
      {Boolean(slide.fields.note) && (
        <p
          className="truncate text-[4.5px]"
          style={{ color: tok(tokens, "medium_gray", "#787E89") }}
        >
          {text(slide.fields.note)}
        </p>
      )}
    </div>
  );
}

function SlideThumb({
  slide,
  plan,
  tokens,
  pageNumber,
  heroPhoto,
  showNotes
}: {
  slide: DeckSlide;
  plan: DeckPlan;
  tokens: Tokens;
  pageNumber: number;
  heroPhoto?: string;
  showNotes?: boolean;
}) {
  const isTitle = slide.layout_id === "title_client_report";
  const isAgenda =
    slide.layout_id === "agenda" ||
    slide.layout_id === "statement" ||
    slide.layout_id === "photo_section_divider";

  return (
    <figure className="workflow-soft-raise m-0">
      <div
        className="relative aspect-video w-full overflow-hidden rounded-md border shadow-sm transition-shadow hover:shadow-md"
        style={{ borderColor: tok(tokens, "stone", "#D7CABF") }}
      >
        {!isTitle && (
          <div className="absolute left-1.5 top-1 z-10">
            <Kicker
              tokens={isAgenda ? { ink: "#FFFFFF" } : tokens}
              label={`${text(slide.fields.deck_label, "CLIENT REPORT")}  ·  ${slide.title}`}
            />
          </div>
        )}
        <div className="h-full pt-0">
          <LayoutBody
            slide={slide}
            plan={plan}
            tokens={tokens}
            heroPhoto={heroPhoto}
          />
        </div>
      </div>
      <figcaption className="mt-1 flex items-center justify-between text-[10px] font-semibold text-[#787E89]">
        <span className="truncate">{slide.title}</span>
        <span className="font-mono">{String(pageNumber).padStart(2, "0")}</span>
      </figcaption>
      {showNotes && slide.speaker_notes ? (
        <p className="mt-1 rounded-sm bg-[#FCFBFA] px-2 py-1.5 text-[10px] font-medium leading-4 text-[#69707D] ring-1 ring-[#EFEAE5]">
          {slide.speaker_notes}
        </p>
      ) : null}
    </figure>
  );
}

function LayoutBody({
  slide,
  plan,
  tokens,
  heroPhoto
}: {
  slide: DeckSlide;
  plan: DeckPlan;
  tokens: Tokens;
  heroPhoto?: string;
}) {
  return (
    <>
          {slide.layout_id === "title_client_report" && (
            <TitleSlidePreview slide={slide} plan={plan} tokens={tokens} />
          )}
          {slide.layout_id === "agenda" && (
            <AgendaPreview slide={slide} tokens={tokens} />
          )}
          {slide.layout_id === "statement" && (
            <StatementPreview slide={slide} tokens={tokens} />
          )}
          {slide.layout_id === "photo_section_divider" && (
            <PhotoDividerPreview
              slide={slide}
              tokens={tokens}
              heroPhoto={heroPhoto}
            />
          )}
          {slide.layout_id === "executive_summary" && (
            <ExecutiveSummaryPreview slide={slide} tokens={tokens} />
          )}
          {slide.layout_id === "adoption_kpi_scorecard" && (
            <ScorecardPreview slide={slide} tokens={tokens} />
          )}
          {slide.layout_id === "usage_trend" && (
            <TrendPreview slide={slide} tokens={tokens} />
          )}
          {slide.layout_id === "feature_adoption" && (
            <FeatureBarsPreview slide={slide} tokens={tokens} />
          )}
          {slide.layout_id === "risks_recommendations" && (
            <RisksPreview slide={slide} tokens={tokens} />
          )}
          {slide.layout_id === "action_plan_table" && (
            <ActionPlanPreview slide={slide} tokens={tokens} />
          )}
          {slide.layout_id === "next_steps" && (
            <StepsPreview slide={slide} tokens={tokens} />
          )}
    </>
  );
}

/** Canned sample content so admins can SEE each approved layout. */
const SAMPLE_PLAN = {
  client_name: "Client Name",
  report_period: "This Quarter"
} as DeckPlan;

const SAMPLE_SLIDES: Record<string, DeckSlide> = {
  title_client_report: {
    layout_id: "title_client_report",
    title: "Title",
    fields: {
      deck_label: "CLIENT REPORT",
      client_name: "Client Name",
      subtitle: "Decision-ready update for your audience",
      report_period: "This Quarter"
    }
  },
  agenda: {
    layout_id: "agenda",
    title: "Agenda",
    fields: {
      agenda_items: ["Where we stand", "Momentum", "Risks", "Next steps"]
    }
  },
  statement: {
    layout_id: "statement",
    title: "Statement",
    fields: {
      statement_text: "Make adoption *a system, not a one-time push*."
    }
  },
  photo_section_divider: {
    layout_id: "photo_section_divider",
    title: "The Next Chapter",
    fields: { section_label: "SECTION" }
  },
  executive_summary: {
    layout_id: "executive_summary",
    title: "Executive Summary",
    fields: {
      business_impact: "The headline takeaway for leadership.",
      summary_points: ["Key point one", "Key point two", "Key point three"]
    }
  },
  adoption_kpi_scorecard: {
    layout_id: "adoption_kpi_scorecard",
    title: "KPI Scorecard",
    fields: {
      adoption_score: 76,
      active_users: 244,
      licensed_users: 325,
      projects_active: 24,
      mobile_usage_rate: 61,
      metric_context: "Current health at a glance"
    }
  },
  usage_trend: {
    layout_id: "usage_trend",
    title: "Usage Trend",
    fields: {
      trend_summary: "Adoption keeps climbing.",
      trend_points: [
        { label: "Apr", adoption_score: 64, active_users: 190 },
        { label: "May", adoption_score: 70, active_users: 215 },
        { label: "Jun", adoption_score: 76, active_users: 244 }
      ]
    }
  },
  feature_adoption: {
    layout_id: "feature_adoption",
    title: "Feature Adoption",
    fields: {
      feature_metrics: [
        { feature: "Daily Logs", count: 1840 },
        { feature: "RFIs", count: 286 },
        { feature: "Submittals", count: 350 }
      ],
      top_feature: "Daily Logs",
      lowest_feature: "Submittals"
    }
  },
  risks_recommendations: {
    layout_id: "risks_recommendations",
    title: "Risks & Recommendations",
    fields: {
      risk_summary: "The one risk to address before the next review.",
      recommendations: ["Assign an owner", "Set the cadence"]
    }
  },
  action_plan_table: {
    layout_id: "action_plan_table",
    title: "Action Plan",
    fields: {
      action_items: [
        { action: "Confirm the owner", owner: "Sponsor", timing: "30 days", status: "on_track" },
        { action: "Close the gap", owner: "Team lead", timing: "60 days", status: "at_risk" },
        { action: "Review progress", owner: "Account team", timing: "90 days", status: "needs_owner" }
      ]
    }
  },
  next_steps: {
    layout_id: "next_steps",
    title: "Next Steps",
    fields: {
      steps: ["First action", "Second action", "Third action"]
    }
  }
};

/** Tiny schematic of an approved layout for pickers and builders. */
export function LayoutMiniature({
  layoutId,
  tokens,
  heroPhoto
}: {
  layoutId: string;
  tokens: Tokens;
  heroPhoto?: string;
}) {
  const slide = SAMPLE_SLIDES[layoutId];

  if (!slide) {
    return null;
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none aspect-video w-full overflow-hidden rounded-sm border bg-white"
      style={{ borderColor: tok(tokens, "stone", "#D7CABF") }}
    >
      <LayoutBody
        slide={slide}
        plan={SAMPLE_PLAN}
        tokens={tokens}
        heroPhoto={heroPhoto}
      />
    </div>
  );
}

export function DeckPreview({
  deckPlan,
  brandContract
}: {
  deckPlan: DeckPlan;
  brandContract: BrandContract;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const tokens = brandContract.approved_color_tokens ?? {};
  const heroPhoto = brandContract.template_assets?.hero_photo;
  const slides = deckPlan.slides ?? [];
  const notesCount = slides.filter((slide) => slide.speaker_notes).length;

  return (
    <section className="rounded-lg border border-[#E5E0DB] bg-white">
      <header className="flex items-center justify-between px-5 py-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Deck Preview
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            {slides.length} slides · review the story before exporting
          </p>
        </div>
        <div className="flex items-center gap-1">
          {notesCount > 0 && (
            <button
              type="button"
              onClick={() => setShowNotes((value) => !value)}
              className={`rounded-sm px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors ${
                showNotes
                  ? "bg-[#FFF7F2] text-brand-orange"
                  : "text-[#787E89] hover:text-brand-charcoal"
              }`}
            >
              {showNotes ? "Hide Notes" : `Notes (${notesCount})`}
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="rounded-sm px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#787E89] transition-colors hover:text-brand-charcoal"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </header>
      {expanded && (
        <div className="grid grid-cols-2 gap-4 px-5 pb-5 md:grid-cols-3">
          {slides.map((slide, index) => (
            <SlideThumb
              key={`${slide.layout_id}-${index}`}
              slide={slide}
              plan={deckPlan}
              tokens={tokens}
              pageNumber={index + 1}
              heroPhoto={heroPhoto}
              showNotes={showNotes}
            />
          ))}
        </div>
      )}
      <footer className="border-t border-[#F0EBE6] px-5 py-2.5 text-[11px] font-medium text-[#787E89]">
        Structural preview - the exported PPTX is rendered from approved brand
        layouts and may differ in fine detail.
      </footer>
    </section>
  );
}
