"use client";

import { DeckRecipe } from "@/lib/deck-recipes";
import type { BrandPreflightReport, SettingsSection, TemplateGovernanceReport, TemplateKitSummary } from "@/lib/ui-types";
import { FileArchive, Layers3, Lock, Palette, Upload } from "lucide-react";

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
      id: "brand" as const,
      label: "Brand",
      detail:
        overriddenColorTokens.length > 0
          ? `${overriddenColorTokens.length} custom color${overriddenColorTokens.length === 1 ? "" : "s"}`
          : "Colors and assets",
      icon: Palette
    },
    {
      id: "templates" as const,
      label: "Templates",
      detail: templateKit ? `${templateKit.slideCount} slides indexed` : "Upload PPTX",
      icon: FileArchive
    },
    {
      id: "governance" as const,
      label: "Governance",
      detail: templateGovernance
        ? `${templateGovernance.summary.governanceScore}% object map`
        : brandPreflight
          ? `${brandPreflight.readinessScore}% preflight`
          : "Preflight and maps",
      icon: Lock
    },
    {
      id: "recipes" as const,
      label: "Recipes",
      detail: `${customRecipes.length} custom`,
      icon: Layers3
    }
  ];

  return (
    <nav
      aria-label="Brand settings sections"
      className="grid gap-3 md:grid-cols-4"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeSection === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
            className={`min-h-[86px] rounded-md border px-4 py-3 text-left transition ${
              active
                ? "border-brand-orange bg-white shadow-sm"
                : "border-[#E5E0DB] bg-white hover:border-brand-orange"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
                {item.label}
              </span>
              <Icon
                className={`h-4 w-4 ${active ? "text-brand-orange" : "text-[#787E89]"}`}
              />
            </div>
            <p className="mt-3 text-xs font-semibold leading-5 text-[#787E89]">
              {item.detail}
            </p>
          </button>
        );
      })}
    </nav>
  );
}
