import { z } from "zod";
import brandContractData from "@/data/brand-contract.json";
import type { BrandContract } from "@/lib/deck-plan-schema";
import {
  readRuntimeJson,
  runtimePath,
  writeRuntimeJson
} from "@/lib/local-runtime-store";
import fs from "node:fs";

const BRAND_CONTRACT_OVERRIDES_FILE = "brand-contract-overrides.json";

const HexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color like #FF5200.")
  .transform((value) => value.toUpperCase());

export const BrandColorTokenUpdateSchema = z.record(HexColorSchema);

type BrandContractOverrides = {
  approved_color_tokens?: Record<string, string>;
  updatedAt?: string;
};

const defaultBrandContract = brandContractData as unknown as BrandContract;

function chartColorRulesFor(tokens: Record<string, string>) {
  return {
    ...defaultBrandContract.chart_color_rules,
    palette: [
      tokens.primary_orange,
      tokens.ink,
      tokens.medium_gray,
      tokens.secondary_orange,
      tokens.stone
    ].filter(Boolean),
    neutral_gridline:
      tokens.stone ?? defaultBrandContract.chart_color_rules.neutral_gridline,
    axis_label: tokens.ink ?? defaultBrandContract.chart_color_rules.axis_label
  };
}

function normalizeOverrides(overrides: BrandContractOverrides) {
  const approved_color_tokens = overrides.approved_color_tokens
    ? BrandColorTokenUpdateSchema.parse(overrides.approved_color_tokens)
    : undefined;

  return {
    ...overrides,
    approved_color_tokens
  } satisfies BrandContractOverrides;
}

export function getDefaultBrandContract() {
  return defaultBrandContract;
}

export function getBrandContractOverrides() {
  const overrides = readRuntimeJson<BrandContractOverrides>(
    BRAND_CONTRACT_OVERRIDES_FILE,
    {}
  );

  return normalizeOverrides(overrides);
}

export function getActiveBrandContract() {
  const overrides = getBrandContractOverrides();
  const approvedColorTokens = {
    ...defaultBrandContract.approved_color_tokens,
    ...(overrides.approved_color_tokens ?? {})
  };

  return {
    ...defaultBrandContract,
    approved_color_tokens: approvedColorTokens,
    chart_color_rules: chartColorRulesFor(approvedColorTokens)
  } satisfies BrandContract;
}

export function saveBrandColorTokens(tokens: Record<string, string>) {
  const allowedTokens = new Set(
    Object.keys(defaultBrandContract.approved_color_tokens)
  );
  const parsed = BrandColorTokenUpdateSchema.parse(tokens);
  const filtered = Object.fromEntries(
    Object.entries(parsed).filter(([key]) => allowedTokens.has(key))
  );
  const currentOverrides = getBrandContractOverrides();
  const mergedTokens = {
    ...defaultBrandContract.approved_color_tokens,
    ...(currentOverrides.approved_color_tokens ?? {}),
    ...filtered
  };
  const nextTokens = Object.fromEntries(
    Object.entries(mergedTokens).filter(
      ([key, value]) => value !== defaultBrandContract.approved_color_tokens[key]
    )
  );

  if (Object.keys(nextTokens).length === 0) {
    return resetBrandColorTokens();
  }

  writeRuntimeJson(BRAND_CONTRACT_OVERRIDES_FILE, {
    approved_color_tokens: nextTokens,
    updatedAt: new Date().toISOString()
  } satisfies BrandContractOverrides);

  return getActiveBrandContract();
}

export function resetBrandColorTokens() {
  const filePath = runtimePath(BRAND_CONTRACT_OVERRIDES_FILE);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  return getActiveBrandContract();
}

export function overriddenColorTokenNames() {
  return Object.keys(getBrandContractOverrides().approved_color_tokens ?? {});
}
