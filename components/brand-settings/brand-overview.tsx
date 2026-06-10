"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { DeckRecipe } from "@/lib/deck-recipes";
import type { BrandContract } from "@/lib/deck-plan-schema";
import type {
  BrandAssetSummary,
  BrandPreflightReport,
  SettingsSection,
  TemplateGovernanceReport,
  TemplateKitSummary
} from "@/lib/ui-types";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";

/**
 * Admin landing page: the brand at a glance plus a live go-live checklist.
 * Every row links into the section where the work happens, so the rest of
 * the settings views can stay focused and quiet.
 */
export function BrandOverview({
  brandContract,
  templateKit,
  brandAssets,
  brandPreflight,
  templateGovernance,
  customRecipes,
  onSectionChange
}: {
  brandContract: BrandContract;
  templateKit: TemplateKitSummary | null;
  brandAssets: BrandAssetSummary[];
  brandPreflight: BrandPreflightReport | null;
  templateGovernance: TemplateGovernanceReport | null;
  customRecipes: DeckRecipe[];
  onSectionChange: (section: SettingsSection) => void;
}) {
  const tokens = brandContract.approved_color_tokens;
  const paletteSwatches = [
    "primary_orange",
    "secondary_orange",
    "charcoal",
    "ink",
    "medium_gray",
    "stone",
    "warm_sand",
    "light_gray"
  ]
    .map((key) => tokens[key])
    .filter(Boolean);
  const unlabeledAssets = brandAssets.filter(
    (asset) => asset.status !== "approved_for_review"
  ).length;
  const frameMapApproved = templateKit?.frameMap.approval.status === "approved";
  const governanceComplete =
    templateGovernance?.summary.governanceScore === 100;
  const preflightReady = brandPreflight?.status === "ready";

  const checklist: Array<{
    label: string;
    detail: string;
    done: boolean;
    section: SettingsSection;
  }> = [
    {
      label: "Upload your presentation template",
      detail: templateKit
        ? `${templateKit.templateName} - ${templateKit.slideCount} slides indexed`
        : "Add the approved PPTX so decks inherit your real slides.",
      done: Boolean(templateKit),
      section: "brand"
    },
    {
      label: "Confirm brand colors and fonts",
      detail: `${paletteSwatches.length} colors, ${brandContract.approved_fonts.heading[0] ?? "heading"} + ${brandContract.approved_fonts.body[0] ?? "body"}`,
      done: true,
      section: "brand"
    },
    {
      label: "Label uploaded brand assets",
      detail:
        brandAssets.length === 0
          ? "Optional - add logos, photos, or textures for governed use."
          : unlabeledAssets > 0
            ? `${unlabeledAssets} upload${unlabeledAssets === 1 ? "" : "s"} still need a role.`
            : `${brandAssets.length} asset${brandAssets.length === 1 ? "" : "s"} labeled and governed.`,
      done: brandAssets.length === 0 || unlabeledAssets === 0,
      section: "brand"
    },
    {
      label: "Approve the slide mapping",
      detail: frameMapApproved
        ? "Every deck section is bound to one of your template slides."
        : "Review which template slide backs each deck section, then approve.",
      done: frameMapApproved,
      section: "templates"
    },
    {
      label: "Finish template text mapping",
      detail: governanceComplete
        ? "All editable text fields are mapped."
        : `${templateGovernance?.summary.governanceScore ?? 0}% of template text fields are mapped.`,
      done: Boolean(governanceComplete),
      section: "governance"
    },
    {
      label: "Pass the export readiness check",
      detail: preflightReady
        ? "Template-native export is unlocked."
        : "Runs automatically once the steps above are complete.",
      done: Boolean(preflightReady),
      section: "governance"
    }
  ];
  const doneCount = checklist.filter((item) => item.done).length;

  const stats = [
    {
      label: "Template slides",
      value: templateKit ? String(templateKit.slideCount) : "-"
    },
    {
      label: "Approved layouts",
      value: String(brandContract.approved_layouts.length)
    },
    {
      label: "Brand assets",
      value: String(brandAssets.length)
    },
    {
      label: "Custom deck types",
      value: String(customRecipes.length)
    }
  ];

  return (
    <div className="space-y-5">
      <section
        className="overflow-hidden rounded-lg text-white shadow-sm"
        style={{ background: tokens.charcoal ?? "#1D1B1A" }}
      >
        <div className="flex flex-col gap-6 px-7 py-7 md:flex-row md:items-end md:justify-between">
          <div>
            <p
              className="font-mono text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{ color: tokens.primary_orange ?? "#FF5200" }}
            >
              Active Brand
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">
              {brandContract.companyName}
            </h2>
            <p className="mt-1 text-sm font-semibold text-white/60">
              {brandContract.version}
              {templateKit ? ` · locked to ${templateKit.templateName}` : ""}
            </p>
          </div>
          <div>
            <div className="flex overflow-hidden rounded-md ring-1 ring-white/20">
              {paletteSwatches.map((color, index) => (
                <span
                  key={`${color}-${index}`}
                  className="h-9 w-9"
                  style={{ background: color }}
                  title={color}
                />
              ))}
            </div>
            <p className="mt-2 text-right text-[11px] font-semibold text-white/55">
              {brandContract.approved_fonts.heading[0]} ·{" "}
              {brandContract.approved_fonts.body[0]} ·{" "}
              {brandContract.approved_fonts.mono[0]}
            </p>
          </div>
        </div>
        <div
          className="grid grid-cols-2 gap-px md:grid-cols-4"
          style={{ background: "rgba(255,255,255,0.12)" }}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="px-7 py-4"
              style={{ background: tokens.charcoal ?? "#1D1B1A" }}
            >
              <p className="text-2xl font-black">{stat.value}</p>
              <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white/55">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Card>
        <CardContent className="space-y-1">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
                Go-Live Checklist
              </h3>
              <p className="mt-1 text-sm text-[#787E89]">
                Creators can already export with approved brand layouts.
                Completing this list unlocks exports built from your own
                template slides.
              </p>
            </div>
            <span className="shrink-0 rounded-sm bg-[#F3F3F3] px-2.5 py-1.5 font-mono text-xs font-black text-brand-ink">
              {doneCount}/{checklist.length}
            </span>
          </div>
          {checklist.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onSectionChange(item.section)}
              className="group flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-left transition hover:border-[#E5E0DB] hover:bg-[#FCFBFA]"
            >
              {item.done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#188038]" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-[#D7CABF]" />
              )}
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm font-bold ${
                    item.done ? "text-[#787E89]" : "text-brand-charcoal"
                  }`}
                >
                  {item.label}
                </span>
                <span className="block truncate text-xs font-semibold text-[#787E89]">
                  {item.detail}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#D7CABF] transition group-hover:text-brand-orange" />
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent>
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              How BrandDeck stays on brand
            </h3>
            <p className="mt-2 text-sm font-medium leading-6 text-[#787E89]">
              Creators describe the deck and add their data; BrandDeck writes
              the story. Your brand system - colors, fonts, layouts, logos,
              and imagery - is decided here, once, and applied to every deck
              automatically.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              Two export paths
            </h3>
            <p className="mt-2 text-sm font-medium leading-6 text-[#787E89]">
              Brand-layout export works from day one with your colors, fonts,
              and assets. Template-native export clones slides from your
              uploaded PPTX and unlocks when the checklist above is complete.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
