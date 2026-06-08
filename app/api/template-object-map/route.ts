import { NextResponse } from "next/server";
import { DeckPlanSchema } from "@/lib/deck-plan-schema";
import { buildTemplateObjectMapManifest } from "@/lib/template-edit-manifest";
import {
  assertObjectMapMatchesTemplate,
  deleteTemplateObjectBindingSet,
  extractTargetsFromObjectMapPayload,
  saveTemplateObjectBindingSet
} from "@/lib/template-object-binding-store";
import { buildTemplateEditGovernance } from "@/lib/template-edit-manifest";
import {
  buildTemplateFrameMapArtifact,
  getTemplateKit
} from "@/lib/template-kit-store";

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
    const frameMapArtifact = buildTemplateFrameMapArtifact(templateKit, deckPlan);
    const manifest = buildTemplateObjectMapManifest(
      templateKit,
      frameMapArtifact
    );
    const fileName = safeFileName(
      `${templateKit.templateName.replace(/\.pptx$/i, "")}_template_object_map`
    );

    return new Response(JSON.stringify(manifest, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}.json"`,
        "X-BrandDeck-Object-Map-Schema": manifest.schema,
        "X-BrandDeck-Editable-Objects": String(
          manifest.editableObjectGovernance.editableObjectCount
        ),
        "X-BrandDeck-Governance-Score": String(
          manifest.editableObjectGovernance.governanceScore
        )
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to export template object map."
      },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
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

    const objectMapPayload = body.objectMap ?? body.manifest ?? body;
    assertObjectMapMatchesTemplate(objectMapPayload, templateKit);
    const targets = extractTargetsFromObjectMapPayload(objectMapPayload);
    const bindingSet = saveTemplateObjectBindingSet({
      kit: templateKit,
      targets,
      importedBy:
        typeof body.importedBy === "string" && body.importedBy.trim()
          ? body.importedBy.trim()
          : "Local brand admin"
    });
    const deckPlan = body.deckPlan ? DeckPlanSchema.parse(body.deckPlan) : undefined;
    const frameMapArtifact = buildTemplateFrameMapArtifact(templateKit, deckPlan);
    const governance = buildTemplateEditGovernance(
      templateKit,
      frameMapArtifact
    );

    return NextResponse.json(
      {
        schema: "branddeck.template-object-map-import/v1",
        importedAt: bindingSet.importedAt,
        bindingSet,
        governance
      },
      {
        headers: {
          "X-BrandDeck-Object-Binding-Source": bindingSet.source,
          "X-BrandDeck-Object-Binding-Fingerprint":
            bindingSet.bindingFingerprint,
          "X-BrandDeck-Editable-Objects": String(
            governance.summary.editableObjectCount
          ),
          "X-BrandDeck-Governance-Score": String(
            governance.summary.governanceScore
          )
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to import template object map."
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
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

    deleteTemplateObjectBindingSet(templateKit);
    const deckPlan = body.deckPlan ? DeckPlanSchema.parse(body.deckPlan) : undefined;
    const frameMapArtifact = buildTemplateFrameMapArtifact(templateKit, deckPlan);
    const governance = buildTemplateEditGovernance(
      templateKit,
      frameMapArtifact
    );

    return NextResponse.json(
      {
        schema: "branddeck.template-object-map-reset/v1",
        resetAt: new Date().toISOString(),
        governance
      },
      {
        headers: {
          "X-BrandDeck-Object-Binding-Source":
            governance.summary.bindingSource,
          "X-BrandDeck-Editable-Objects": String(
            governance.summary.editableObjectCount
          ),
          "X-BrandDeck-Governance-Score": String(
            governance.summary.governanceScore
          )
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to reset template object map."
      },
      { status: 400 }
    );
  }
}
