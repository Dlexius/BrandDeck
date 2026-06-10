"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BRAND_ASSET_ROLE_OPTIONS } from "@/lib/ui-constants";
import { formatBytes } from "@/lib/ui-helpers";
import type { BrandAssetSummary } from "@/lib/ui-types";
import { ImageIcon, Upload } from "lucide-react";

export function BrandAssetInventory({
  assets,
  updatingAssetId,
  onUpdateRole
}: {
  assets: BrandAssetSummary[];
  updatingAssetId: string;
  onUpdateRole: (assetId: string, role: BrandAssetSummary["role"]) => void;
}) {
  if (assets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Brand Asset Inventory
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Upload logos, icons, textures, or approved imagery to fingerprint
            them before use. Visual previews appear here after intake.
          </p>
        </CardHeader>
      </Card>
    );
  }

  const approvedCount = assets.filter(
    (asset) => asset.status === "approved_for_review"
  ).length;
  const roleSummary = Array.from(new Set(assets.map((asset) => asset.role)))
    .map((role) => `${role.replaceAll("_", " ")}:${assets.filter((asset) => asset.role === role).length}`)
    .join(" | ");

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Brand Asset Inventory
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Fingerprinted assets available for admin review and renderer mapping.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md bg-[#F3F3F3] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-ink">
          <ImageIcon className="h-3.5 w-3.5 text-brand-orange" />
          {approvedCount}/{assets.length} review ready
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-md bg-[#F3F3F3] px-3 py-2 text-xs font-semibold text-[#787E89]">
          {roleSummary}
        </div>
        <div className="overflow-hidden border-t border-[#EFEAE5]">
          {assets.slice(0, 6).map((asset) => (
            <div
              key={asset.id}
              className="grid gap-3 border-b border-[#EFEAE5] py-3 last:border-b-0 md:grid-cols-[76px_minmax(0,1fr)_132px_96px]"
            >
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-[#E5E0DB] bg-[#F3F3F3]">
                <img
                  src={`/api/brand-assets?id=${encodeURIComponent(asset.id)}`}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="min-w-0 self-center">
                <p className="truncate text-sm font-bold text-brand-charcoal">
                  {asset.fileName}
                </p>
                <p className="mt-1 truncate font-mono text-[11px] font-semibold text-[#787E89]">
                  {asset.fingerprint.slice(0, 16)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-sm bg-[#F3F3F3] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-brand-ink">
                    {asset.role.replaceAll("_", " ")}
                  </span>
                  <span
                    className={`rounded-sm px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${
                      asset.status === "approved_for_review"
                        ? "bg-[#ECF7EF] text-[#188038]"
                        : "bg-[#FFF1E8] text-[#B43C00]"
                    }`}
                  >
                    {asset.status === "approved_for_review"
                      ? "Review ready"
                      : "Needs label"}
                  </span>
                </div>
              </div>
              <div className="self-center">
                <label
                  htmlFor={`asset-role-${asset.id}`}
                  className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]"
                >
                  Role
                </label>
                <select
                  id={`asset-role-${asset.id}`}
                  value={asset.role}
                  disabled={updatingAssetId === asset.id}
                  onChange={(event) =>
                    onUpdateRole(
                      asset.id,
                      event.currentTarget.value as BrandAssetSummary["role"]
                    )
                  }
                  className="mt-1 h-8 w-full rounded-md border border-[#D7CABF] bg-white px-2 text-xs font-bold text-brand-charcoal outline-none focus:border-brand-orange"
                >
                  {BRAND_ASSET_ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="self-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                  Asset Proof
                </p>
                <p className="mt-1 text-xs font-black text-brand-charcoal">
                  {asset.width && asset.height
                    ? `${asset.width}x${asset.height}`
                    : `${Math.round(asset.bytes / 1024)} KB`}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-[#787E89]">
                  {formatBytes(asset.bytes)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
