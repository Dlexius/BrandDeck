import { NextResponse } from "next/server";
import { getActiveBrandContract } from "@/lib/brand-contract-store";
import { resolveGovernedBrandImages } from "@/lib/brand-image-resolution";
import { auditDeckFit } from "@/lib/auditDeckFit";
import { DeckPlanSchema } from "@/lib/deck-plan-schema";
import {
  approvedTypefacesFromContract,
  embedContractFonts,
  embedTemplateFonts
} from "@/lib/font-embedder";
import { renderPptx } from "@/lib/renderPptx";
import {
  buildTemplateFrameMapArtifact,
  getTemplateKit,
  listTemplateKits
} from "@/lib/template-kit-store";
import { validateDeckPlan } from "@/lib/validateDeckPlan";

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
    const deckPlan = DeckPlanSchema.parse(body.deckPlan ?? body);
    const templateKitId =
      typeof body.templateKitId === "string" ? body.templateKitId : undefined;
    const templateKit = templateKitId ? getTemplateKit(templateKitId) : undefined;
    const fidelityMode =
      typeof body.fidelityMode === "string"
        ? body.fidelityMode
        : "default_coordinate_export";
    const frameMapArtifact = templateKit
      ? buildTemplateFrameMapArtifact(templateKit, deckPlan)
      : undefined;
    const frameMapCoverage = frameMapArtifact?.validation.coverage ?? "0/0";
    const brandContract = getActiveBrandContract();
    const validationReport = validateDeckPlan(deckPlan, brandContract);

    if (!validationReport.passed) {
      return NextResponse.json(
        {
          error: "Deck plan failed brand validation.",
          validationReport
        },
        { status: 422 }
      );
    }

    const fitAudit = auditDeckFit({ deckPlan, brandContract });

    if (!fitAudit.passed) {
      return NextResponse.json(
        {
          error: "Deck plan failed layout fit audit.",
          fitAudit
        },
        { status: 422 }
      );
    }

    // White-label: governed uploaded imagery beats bundled demo assets, and
    // once another brand's identity is active the bundled marks are
    // suppressed entirely rather than leaking into the export.
    const resolvedImages = resolveGovernedBrandImages();
    let pptxBuffer = await renderPptx(deckPlan, brandContract, {
      brandImages: resolvedImages.images,
      suppressDefaultAssets: resolvedImages.identityOverridden
    });

    // Embed the approved brand fonts from the uploaded template so the deck
    // renders identically on machines that do not have the fonts installed.
    // Falls back to the most recent uploaded kit when none was specified.
    const fontSourceKit =
      templateKit ??
      (() => {
        const kits = listTemplateKits();
        const latest = kits[kits.length - 1];
        return latest ? getTemplateKit(latest.id) : undefined;
      })();
    let fontsEmbedded = "none";

    if (fontSourceKit) {
      const { buffer, report } = await embedTemplateFonts(
        pptxBuffer,
        fontSourceKit.buffer,
        approvedTypefacesFromContract(brandContract)
      );
      pptxBuffer = buffer;
      fontsEmbedded = report.embedded
        ? report.embeddedTypefaces.join(", ")
        : "none";
    }

    if (fontsEmbedded === "none") {
      // No uploaded template available in this session - embed the fonts the
      // brand kit ships with so the deck still renders true on any machine.
      const { buffer, report } = await embedContractFonts(
        pptxBuffer,
        brandContract.template_assets?.embedded_fonts ?? {}
      );
      pptxBuffer = buffer;
      fontsEmbedded = report.embedded
        ? report.embeddedTypefaces.join(", ")
        : "none";
    }

    const fileName = safeFileName(
      `${deckPlan.client_name}_${deckPlan.report_period}_${
        deckPlan.deck_recipe_id ?? deckPlan.deck_type
      }_coordinate_export`
    );

    return new Response(new Uint8Array(pptxBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${fileName}.pptx"`,
        "Content-Length": String(pptxBuffer.length),
        "X-BrandDeck-Renderer": "deterministic-template-coordinate",
        "X-BrandDeck-Template-Kit": templateKit?.id ?? "procore-default",
        "X-BrandDeck-Template-Fingerprint":
          templateKit?.fingerprint ?? "procore-default-contract",
        "X-BrandDeck-Fidelity-Mode": fidelityMode,
        "X-BrandDeck-Fonts-Embedded": fontsEmbedded,
        "X-BrandDeck-Frame-Map-Coverage": frameMapCoverage,
        "X-BrandDeck-Frame-Map-Min-Confidence": String(
          frameMapArtifact?.validation.minimumConfidence ?? 0
        )
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to export the deck."
      },
      { status: 400 }
    );
  }
}
