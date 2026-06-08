import { NextResponse } from "next/server";
import { getActiveBrandContract } from "@/lib/brand-contract-store";
import { listBrandAssets } from "@/lib/brand-asset-store";
import { buildBrandPreflightReport } from "@/lib/brand-preflight";
import { DeckPlanSchema } from "@/lib/deck-plan-schema";
import { getTemplateKit } from "@/lib/template-kit-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const templateKitId =
      typeof body.templateKitId === "string" ? body.templateKitId : "";
    const templateKit = templateKitId ? getTemplateKit(templateKitId) : undefined;
    const deckPlan = body.deckPlan ? DeckPlanSchema.parse(body.deckPlan) : undefined;
    const brandContract = getActiveBrandContract();
    const report = buildBrandPreflightReport({
      brandContract,
      templateKit,
      brandAssets: listBrandAssets(),
      deckPlan
    });

    return NextResponse.json(report, {
      headers: {
        "X-BrandDeck-Preflight-Status": report.status,
        "X-BrandDeck-Readiness-Score": String(report.readinessScore)
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to build brand preflight report."
      },
      { status: 400 }
    );
  }
}
