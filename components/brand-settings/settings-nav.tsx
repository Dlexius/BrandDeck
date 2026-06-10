"use client";

import { DeckRecipe } from "@/lib/deck-recipes";
import type { BrandPreflightReport, SettingsSection, TemplateGovernanceReport, TemplateKitSummary } from "@/lib/ui-types";
import { FileArchive, Layers3, LayoutDashboard, Lock, Palette } from "lucide-react";

export function SettingsSectionNav({
  activeSection,
  onSectionChange,
  templateKit,
  brandPreflight,
  templateGovernance,
  customRecipes,
  overriddenColorTokens
}: {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  templateKit: TemplateKitSummary | null;
  brandPreflight: BrandPreflightReport | null;
  templateGovernance: TemplateGovernanceReport | null;
  customRecipes: DeckRecipe[];
  overriddenColorTokens: string[];
}) {
  const items = [
    {
      id: "overview" as const,
      label: "Overview",
      detail: "Brand at a glance",
      icon: LayoutDashboard
    },
    {
      id: "brand" as const,
      label: "Brand",
      detail:
        overriddenColorTokens.length > 0
          ? `${overriddenColorTokens.length} custom color${overriddenColorTokens.length === 1 ? "" : "s"}`
          : "Colors, fonts, assets",
      icon: Palette
    },
    {
      id: "templates" as const,
      label: "Templates",
      detail: templateKit
        ? `${templateKit.slideCount} slides indexed`
        : "Upload PPTX",
      icon: FileArchive
    },
    {
      id: "governance" as const,
      label: "Governance",
      detail: templateGovernance
        ? `${templateGovernance.summary.governanceScore}% slides mapped`
        : brandPreflight
          ? `${brandPreflight.readinessScore}% export ready`
          : "Approvals and checks",
      icon: Lock
    },
    {
      id: "recipes" as const,
      label: "Deck Types",
      detail:
        customRecipes.length > 0
          ? `${customRecipes.length} custom`
          : "Approved deck types",
      icon: Layers3
    }
  ];

  return (
    <nav
      aria-label="Brand settings sections"
      className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1.5 lg:overflow-visible"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeSection === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
            className={`flex min-w-[150px] shrink-0 items-center gap-3 rounded-md border px-3 py-2.5 text-left transition lg:min-w-0 lg:shrink ${
              active
                ? "border-brand-orange bg-[#FFF7F2] shadow-sm"
                : "border-transparent bg-transparent hover:bg-white"
            }`}
          >
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${
                active
                  ? "bg-brand-orange text-white"
                  : "bg-white text-[#787E89] ring-1 ring-[#E5E0DB]"
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span
                className={`block text-sm font-black ${
                  active ? "text-brand-charcoal" : "text-brand-ink"
                }`}
              >
                {item.label}
              </span>
              <span className="block truncate text-[11px] font-semibold text-[#787E89]">
                {item.detail}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
