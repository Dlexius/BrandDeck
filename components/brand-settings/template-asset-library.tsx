"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BRAND_ASSET_ROLE_OPTIONS } from "@/lib/ui-constants";
import { formatBytes } from "@/lib/ui-helpers";
import type { BrandAssetSummary, TemplateKitSummary } from "@/lib/ui-types";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

export function TemplateAssetLibrary({
  templateKit,
  brandAssets,
  templateAssetRoles,
  promotingEntry,
  onRoleChange,
  onPromote
}: {
  templateKit: TemplateKitSummary | null;
  brandAssets: BrandAssetSummary[];
  templateAssetRoles: Record<string, BrandAssetSummary["role"]>;
  promotingEntry: string;
  onRoleChange: (entry: string, role: BrandAssetSummary["role"]) => void;
  onPromote: (entry: string, role: BrandAssetSummary["role"]) => void;
}) {
  if (!templateKit) {
    return null;
  }

  // Already-promoted media (matched by fingerprint) shows as done in place,
  // so approval feedback never depends on a notice elsewhere on the page.
  const promotedFingerprints = new Set(
    brandAssets.map((asset) => asset.fingerprint)
  );

  const promotableAssets = templateKit.topAssets.filter((asset) =>
    ["png", "jpg", "jpeg", "svg"].includes(asset.extension)
  );

  if (promotableAssets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Template Asset Library
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            No promotable PNG, JPG, or SVG media was found in this template.
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Template Asset Library
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Promote media already inside the approved PPTX into governed brand assets.
          </p>
        </div>
        <div className="rounded-md bg-[#F3F3F3] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-ink">
          {promotableAssets.length} promotable
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden border-t border-[#EFEAE5]">
          {promotableAssets.slice(0, 6).map((asset) => {
            const role = templateAssetRoles[asset.entry] ?? "supporting_image";
            const previewUrl = `/api/template-assets?templateKitId=${encodeURIComponent(
              templateKit.id
            )}&entry=${encodeURIComponent(asset.entry)}`;
            const dimensions =
              asset.width && asset.height
                ? `${asset.width}x${asset.height}`
                : "Dimensions pending";

            return (
              <div
                key={asset.entry}
                className="grid gap-3 border-b border-[#EFEAE5] py-3 last:border-b-0 md:grid-cols-[72px_minmax(0,1fr)_140px_116px_112px]"
              >
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-[#E5E0DB] bg-[#F3F3F3]">
                  <img
                    src={previewUrl}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-brand-charcoal">
                    {asset.entry.replace(/^ppt\/media\//, "")}
                  </p>
                  <p className="mt-1 truncate font-mono text-[11px] font-semibold text-[#787E89]">
                    {asset.entry}
                  </p>
                  <p className="mt-1 truncate font-mono text-[11px] font-semibold text-[#787E89]">
                    {asset.fingerprint.slice(0, 16)}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                    Role
                  </label>
                  <select
                    value={role}
                    disabled={promotingEntry === asset.entry}
                    onChange={(event) =>
                      onRoleChange(
                        asset.entry,
                        event.currentTarget.value as BrandAssetSummary["role"]
                      )
                    }
                    className="mt-1 h-8 w-full rounded-md border border-[#D7CABF] bg-white px-2 text-xs font-bold text-brand-charcoal outline-none focus:border-brand-orange disabled:opacity-60"
                  >
                    {BRAND_ASSET_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                    Asset Proof
                  </p>
                  <p className="mt-1 text-xs font-black text-brand-charcoal">
                    {formatBytes(asset.bytes)}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-[#787E89]">
                    {dimensions}
                  </p>
                </div>
                {promotedFingerprints.has(asset.fingerprint) ? (
                  <div className="flex h-9 items-center justify-center gap-1.5 self-end rounded-md bg-[#ECF7EF] px-3 text-xs font-bold text-[#188038]">
                    <CheckCircle2 className="h-4 w-4" />
                    In Brand Library
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    className="h-9 self-end px-3"
                    disabled={promotingEntry === asset.entry}
                    onClick={() => onPromote(asset.entry, role)}
                  >
                    {promotingEntry === asset.entry ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    Add to Brand
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
