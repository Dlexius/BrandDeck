import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getActiveBrandContract,
  getDefaultBrandContract,
  overriddenColorTokenNames,
  saveBrandIdentity
} from "@/lib/brand-contract-store";
import { getTemplateKit } from "@/lib/template-kit-store";

export const runtime = "nodejs";

const BrandIntakeRequestSchema = z.object({
  templateKitId: z.string().min(1).max(120),
  apply: z.boolean().default(false)
});

/**
 * Brand intake: draft brand identity (company name + approved fonts) from an
 * uploaded, fingerprinted template kit. With `apply: true` the draft is
 * persisted as the active brand identity. Works for any uploaded brand
 * template - nothing here is specific to one company.
 */

function cleanCompanyName(templateName: string) {
  const cleaned = templateName
    .replace(/\.pptx?$/i, "")
    .replace(/copy of/gi, "")
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/\b(presentation|template|deck|master|slides?)\b/gi, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length >= 2 ? cleaned : templateName.trim();
}

function draftApprovedFonts(detectedFonts: string[]) {
  const usable = detectedFonts
    .map((font) => font.trim())
    .filter(
      (font) =>
        font.length > 1 &&
        !font.startsWith("+") &&
        !/wingdings|symbol|emoji|dingbat/i.test(font)
    );

  const mono = usable.filter((font) => /mono|courier|consolas|code/i.test(font));
  const heading = usable.filter(
    (font) =>
      !mono.includes(font) &&
      /semibold|extrabold|black|display|tight|condensed|bold/i.test(font)
  );
  const body = usable.filter(
    (font) => !mono.includes(font) && !heading.includes(font)
  );

  const dedupe = (fonts: string[]) => [...new Set(fonts)].slice(0, 3);

  return {
    heading: [...dedupe(heading.length > 0 ? heading : body), "Arial"].slice(0, 4),
    body: [...dedupe(body.length > 0 ? body : usable), "Arial"].slice(0, 4),
    mono: [...dedupe(mono), "Courier New"].slice(0, 4)
  };
}

export async function POST(request: Request) {
  try {
    const body = BrandIntakeRequestSchema.parse(await request.json());
    const kit = getTemplateKit(body.templateKitId);

    if (!kit) {
      return NextResponse.json(
        { error: "Upload and select a template before drafting a brand kit." },
        { status: 404 }
      );
    }

    const draft = {
      companyName: cleanCompanyName(kit.templateName),
      approved_fonts: draftApprovedFonts(kit.detectedFonts),
      detectedColors: kit.detectedColors.slice(0, 12),
      templateFingerprint: kit.fingerprint
    };

    if (!body.apply) {
      return NextResponse.json({
        schema: "branddeck.brand-intake/v1",
        applied: false,
        draft
      });
    }

    const brandContract = saveBrandIdentity({
      companyName: draft.companyName,
      approved_fonts: draft.approved_fonts
    });

    return NextResponse.json({
      schema: "branddeck.brand-intake/v1",
      applied: true,
      draft,
      brandContract,
      defaultBrandContract: getDefaultBrandContract(),
      overriddenColorTokens: overriddenColorTokenNames()
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to draft the brand kit."
      },
      { status: 400 }
    );
  }
}
