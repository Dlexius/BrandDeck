"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BrandContract } from "@/lib/deck-plan-schema";
import { defaultBrandContract } from "@/lib/ui-constants";
import { brandColorTokenLabel, isHexColor } from "@/lib/ui-helpers";
import { Loader2, Palette, RotateCcw, ShieldCheck } from "lucide-react";

const CORE_BRAND_COLOR_TOKENS = [
  "primary_orange",
  "secondary_orange",
  "charcoal",
  "ink",
  "medium_gray",
  "light_gray"
];

export function BrandColorSettingsPanel({
  brandContract,
  defaultBrandContract,
  colorDraft,
  overriddenColorTokens,
  saving,
  resetting,
  onDraftChange,
  onSave,
  onReset
}: {
  brandContract: BrandContract;
  defaultBrandContract: BrandContract;
  colorDraft: Record<string, string>;
  overriddenColorTokens: string[];
  saving: boolean;
  resetting: boolean;
  onDraftChange: (token: string, value: string) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const tokenNames = Object.keys(defaultBrandContract.approved_color_tokens);
  const supportingTokens = tokenNames.filter(
    (token) => !CORE_BRAND_COLOR_TOKENS.includes(token)
  );
  const invalidTokens = tokenNames.filter(
    (token) => !isHexColor(colorDraft[token] ?? "")
  );
  const hasOverrides = overriddenColorTokens.length > 0;
  const previewAccent = isHexColor(colorDraft.primary_orange ?? "")
    ? colorDraft.primary_orange
    : brandContract.approved_color_tokens.primary_orange;
  const previewSoft = isHexColor(colorDraft.secondary_orange ?? "")
    ? colorDraft.secondary_orange
    : brandContract.approved_color_tokens.secondary_orange;
  const previewInk = isHexColor(colorDraft.ink ?? "")
    ? colorDraft.ink
    : brandContract.approved_color_tokens.ink;
  const previewFog = isHexColor(colorDraft.light_gray ?? "")
    ? colorDraft.light_gray
    : brandContract.approved_color_tokens.light_gray;
  const previewStone = isHexColor(colorDraft.stone ?? "")
    ? colorDraft.stone
    : brandContract.approved_color_tokens.stone;

  const renderTokenEditor = (token: string) => {
    const value =
      colorDraft[token] ??
      defaultBrandContract.approved_color_tokens[token] ??
      "#000000";
    const defaultValue =
      defaultBrandContract.approved_color_tokens[token] ?? "#000000";
    const safePickerValue = isHexColor(value) ? value : defaultValue;
    const isOverridden = overriddenColorTokens.includes(token);
    const invalid = !isHexColor(value);

    return (
      <div
        key={token}
        className={`grid gap-3 rounded-md bg-white p-3 ring-1 ${
          invalid ? "ring-[#B43C00]" : "ring-[#EFEAE5]"
        } sm:grid-cols-[minmax(0,1fr)_118px_42px] sm:items-center`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="h-5 w-5 shrink-0 rounded-sm border border-[#D7CABF]"
              style={{ backgroundColor: isHexColor(value) ? value : "#FFFFFF" }}
            />
            <p className="truncate text-sm font-black capitalize text-brand-charcoal">
              {brandColorTokenLabel(token)}
            </p>
          </div>
          <p className="mt-1 truncate text-[11px] font-semibold text-[#787E89]">
            Default {defaultValue}
            {isOverridden ? " - customized" : ""}
          </p>
        </div>
        <Input
          value={value}
          aria-label={`${brandColorTokenLabel(token)} hex value`}
          className="h-9 font-mono text-xs font-bold uppercase"
          onChange={(event) =>
            onDraftChange(token, event.currentTarget.value.toUpperCase())
          }
        />
        <input
          type="color"
          value={safePickerValue}
          aria-label={`${brandColorTokenLabel(token)} color picker`}
          className="h-9 w-full cursor-pointer rounded-sm border border-[#D7CABF] bg-white p-1"
          onChange={(event) =>
            onDraftChange(token, event.currentTarget.value.toUpperCase())
          }
        />
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Brand Colors
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#787E89]">
            Admin-managed tokens used by the app theme, validation, manifests,
            and governed renderer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={onReset}
            disabled={resetting || saving || !hasOverrides}
          >
            {resetting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Reset
          </Button>
          <Button
            onClick={onSave}
            disabled={saving || resetting || invalidTokens.length > 0}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Save Colors
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
                  Core Palette
                </p>
                <span className="text-xs font-bold text-brand-orange">
                  {invalidTokens.length > 0
                    ? `${invalidTokens.length} invalid`
                    : `${hasOverrides ? overriddenColorTokens.length : 0} custom`}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {CORE_BRAND_COLOR_TOKENS.map(renderTokenEditor)}
              </div>
            </div>

            <details className="rounded-md bg-[#F3F3F3] p-3">
              <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
                Supporting Tokens
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {supportingTokens.map(renderTokenEditor)}
              </div>
            </details>
          </div>

          <div
            className="min-h-[260px] rounded-md p-4 ring-1 ring-[#EFEAE5]"
            style={{ backgroundColor: previewFog }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
              Live Preview
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {tokenNames.slice(0, 8).map((token) => {
                const value =
                  colorDraft[token] ??
                  defaultBrandContract.approved_color_tokens[token];

                return (
                  <span
                    key={token}
                    title={`${brandColorTokenLabel(token)} ${value}`}
                    className="h-7 w-7 rounded-sm border border-white/80 shadow-sm"
                    style={{
                      backgroundColor: isHexColor(value) ? value : "#FFFFFF"
                    }}
                  />
                );
              })}
            </div>
            <div
              className="mt-5 rounded-md bg-white p-4"
              style={{ borderLeft: `4px solid ${previewAccent}` }}
            >
              <p
                className="text-lg font-black leading-6"
                style={{ color: previewInk }}
              >
                {brandContract.companyName}
              </p>
              <p className="mt-2 text-xs font-semibold leading-5 text-[#787E89]">
                Saved colors become the active contract for generated deck
                plans and renderer tokens.
              </p>
              <div className="mt-4 flex gap-2">
                <span
                  className="rounded-sm px-3 py-2 text-xs font-black text-white"
                  style={{ backgroundColor: previewAccent }}
                >
                  Primary
                </span>
                <span
                  className="rounded-sm px-3 py-2 text-xs font-black"
                  style={{
                    backgroundColor: previewSoft,
                    color: previewInk
                  }}
                >
                  Secondary
                </span>
              </div>
            </div>
            <div
              className="mt-4 rounded-md bg-white px-3 py-2 text-xs font-semibold leading-5"
              style={{ border: `1px solid ${previewStone}`, color: previewInk }}
            >
              Decks built from an uploaded template inherit its artwork.
              Otherwise exports use these brand colors directly.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
