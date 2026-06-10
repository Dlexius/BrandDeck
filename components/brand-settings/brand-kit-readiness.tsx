"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BrandContract } from "@/lib/deck-plan-schema";
import type { BrandAssetSummary, TemplateKitSummary } from "@/lib/ui-types";
import { FileArchive, ImageIcon, Layers3, Lock } from "lucide-react";

export function BrandKitReadiness({
  brandContract,
  templateKit,
  brandAssets,
  workspaceStatus
}: {
  brandContract: BrandContract;
  templateKit: TemplateKitSummary | null;
  brandAssets: BrandAssetSummary[];
  workspaceStatus: string;
}) {
  const readinessItems = [
    {
      label: "Template",
      value: templateKit
        ? `${templateKit.slideCount} slides indexed`
        : "Default template active",
      icon: FileArchive
    },
    {
      label: "Layouts",
      value: templateKit
        ? `${templateKit.layoutCount} layouts available`
        : `${brandContract.approved_layouts.length} approved layouts`,
      icon: Layers3
    },
    {
      label: "Assets",
      value: templateKit
        ? `${templateKit.mediaCount} template media + ${brandAssets.length} uploaded`
        : "Approved brand assets loaded",
      icon: ImageIcon
    },
    {
      label: "Drift Guard",
      value: "AI cannot choose geometry",
      icon: Lock
    }
  ];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Brand Kit Readiness
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            {templateKit
              ? `Locked to ${templateKit.templateName}`
              : "Using the bundled template contract"}
          </p>
        </div>
        <span className="rounded-sm bg-[#F3F3F3] px-2 py-1 font-mono text-xs font-semibold text-brand-ink">
          {templateKit
            ? templateKit.fingerprint.slice(0, 12)
            : "default-contract"}
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-4">
          {readinessItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="border-l-2 border-brand-orange bg-[#F3F3F3] px-3 py-3"
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#787E89]">
                  <Icon className="h-3.5 w-3.5 text-brand-orange" />
                  {item.label}
                </div>
                <p className="mt-2 text-sm font-bold leading-5 text-brand-charcoal">
                  {item.value}
                </p>
              </div>
            );
          })}
        </div>
        {brandAssets.length > 0 && (
          <p className="mt-3 text-xs font-semibold text-[#787E89]">
            Governed uploads: {brandAssets.map((asset) => asset.fileName).join(", ")}
          </p>
        )}
        <div className="mt-4 grid gap-3 border-t border-[#EFEAE5] pt-4 md:grid-cols-3">
          {[
            {
              label: "Brand Admin",
              value: "Approves templates, assets, colors, fonts, and review rules."
            },
            {
              label: "Deck Creator",
              value: "Uses prompts, business data, and source context to request a deck."
            },
            {
              label: "Deck Modes",
              value: "Predefined and ad hoc decks resolve to approved layouts."
            }
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-md bg-white px-4 py-3 ring-1 ring-[#EFEAE5]"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                {item.label}
              </p>
              <p className="mt-2 text-xs font-semibold leading-5 text-brand-ink">
                {item.value}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-md bg-[#F3F3F3] px-4 py-3 text-sm font-semibold leading-6 text-brand-ink">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
          <span>{workspaceStatus}</span>
        </div>
        {templateKit && (
          <div className="mt-4 grid gap-3 border-t border-[#EFEAE5] pt-4 md:grid-cols-2">
            <div className="rounded-md bg-[#111111] px-4 py-3 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/60">
                Prepared Template Path
              </p>
              <p className="mt-1 text-sm font-bold">
                Frame map ready
              </p>
            </div>
            <div className="rounded-md bg-[#FFF1E8] px-4 py-3 text-[#6B2A00]">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9A4A11]">
                Primary Export Renderer
              </p>
              <p className="mt-1 text-sm font-bold">
                Template-based export
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
