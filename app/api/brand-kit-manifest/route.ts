import { NextResponse } from "next/server";
import { getActiveBrandContract } from "@/lib/brand-contract-store";
import { listBrandAssets } from "@/lib/brand-asset-store";
import { buildBrandKitManifest } from "@/lib/brand-kit-manifest";
import { DeckPlanSchema } from "@/lib/deck-plan-schema";
import { getTemplateKit } from "@/lib/template-kit-store";

export const runtime = "nodejs";

function safeFileName(value: string) {
  return value
    .trim()
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 90);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const templateKitId =
      typeof body.templateKitId === "string" ? body.templateKitId : "";
    const templateKit = getTemplateKit(templateKitId);

    if (!templateKit) {
      return NextResponse.json(
        { error: "Template kit not found. Upload a PPTX template first." },
        { status: 404 }
      );
    }

    const deckPlan = body.deckPlan ? DeckPlanSchema.parse(body.deckPlan) : undefined;
    const brandContract = getActiveBrandContract();
    const manifest = buildBrandKitManifest({
      brandContract,
      templateKit,
      brandAssets: listBrandAssets(),
      deckPlan
    });
    const fileName = safeFileName(
      `${templateKit.templateName.replace(/\.pptx$/i, "")}_brand_kit_manifest`
    );

    return new Response(JSON.stringify(manifest, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}.json"`,
        "X-BrandDeck-Manifest-Schema": manifest.schema,
        "X-BrandDeck-Preflight-Status": manifest.preflight.status,
        "X-BrandDeck-Readiness-Score": String(manifest.preflight.readinessScore),
        "X-BrandDeck-Frame-Map-Approval":
          manifest.controlCertificate.frameMapApproval.status,
        "X-BrandDeck-Control-Certificate":
          manifest.controlCertificate.schema
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to export brand kit manifest."
      },
      { status: 400 }
    );
  }
}
