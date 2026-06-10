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
  companyName?: string;
  approved_fonts?: {
    heading: string[];
    body: string[];
    mono: string[];
  };
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
    companyName: overrides.companyName ?? defaultBrandContract.companyName,
    approved_fonts:
      overrides.approved_fonts ?? defaultBrandContract.approved_fonts,
    approved_color_tokens: approvedColorTokens,
    chart_color_rules: chartColorRulesFor(approvedColorTokens)
  } satisfies BrandContract;
}

const FontListSchema = z.array(z.string().trim().min(1).max(64)).min(1).max(4);

export const BrandIdentityUpdateSchema = z.object({
  companyName: z.string().trim().min(1).max(80).optional(),
  approved_fonts: z
    .object({
      heading: FontListSchema,
      body: FontListSchema,
      mono: FontListSchema
    })
    .optional()
});

/**
 * Persist brand identity drafted from an uploaded template (company name and
 * approved fonts). Used by the brand-intake flow so a new brand can be set up
 * from its own template without hand-editing the contract file.
 */
export function saveBrandIdentity(
  update: z.infer<typeof BrandIdentityUpdateSchema>
) {
  const parsed = BrandIdentityUpdateSchema.parse(update);
  const currentOverrides = getBrandContractOverrides();

  writeRuntimeJson(BRAND_CONTRACT_OVERRIDES_FILE, {
    ...currentOverrides,
    companyName: parsed.companyName ?? currentOverrides.companyName,
    approved_fonts: parsed.approved_fonts ?? currentOverrides.approved_fonts,
    updatedAt: new Date().toISOString()
  } satisfies BrandContractOverrides);

  return getActiveBrandContract();
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
    ...currentOverrides,
    approved_color_tokens: nextTokens,
    updatedAt: new Date().toISOString()
  } satisfies BrandContractOverrides);

  return getActiveBrandContract();
}

export function resetBrandColorTokens() {
  const currentOverrides = getBrandContractOverrides();
  const { approved_color_tokens: _tokens, ...identity } = currentOverrides;
  const hasIdentity = Boolean(identity.companyName || identity.approved_fonts);
  const filePath = runtimePath(BRAND_CONTRACT_OVERRIDES_FILE);

  if (hasIdentity) {
    writeRuntimeJson(BRAND_CONTRACT_OVERRIDES_FILE, {
      ...identity,
      updatedAt: new Date().toISOString()
    } satisfies BrandContractOverrides);
  } else if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  return getActiveBrandContract();
}

export function overriddenColorTokenNames() {
  return Object.keys(getBrandContractOverrides().approved_color_tokens ?? {});
}
