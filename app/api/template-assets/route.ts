import { NextResponse } from "next/server";
import {
  createBrandAsset,
  isBrandAssetRole,
  listBrandAssets,
  summarizeBrandAsset
} from "@/lib/brand-asset-store";
import { readTemplateMediaAsset } from "@/lib/template-kit-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const templateKitId = searchParams.get("templateKitId") ?? "";
    const entry = searchParams.get("entry") ?? "";

    if (!templateKitId || !entry) {
      return NextResponse.json(
        { error: "Template kit id and media entry are required." },
        { status: 400 }
      );
    }

    const media = await readTemplateMediaAsset(templateKitId, entry);

    return new Response(new Uint8Array(media.buffer), {
      headers: {
        "Content-Type": media.mimeType,
        "Content-Length": String(media.buffer.length),
        "Cache-Control": "no-store",
        "X-BrandDeck-Template-Media": entry
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to preview template media asset."
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const templateKitId =
      typeof body.templateKitId === "string" ? body.templateKitId : "";
    const entry = typeof body.entry === "string" ? body.entry : "";
    const role = body.role;

    if (!templateKitId || !entry) {
      return NextResponse.json(
        { error: "Template kit id and media entry are required." },
        { status: 400 }
      );
    }

    if (!isBrandAssetRole(role)) {
      return NextResponse.json(
        { error: "A valid brand asset role is required." },
        { status: 400 }
      );
    }

    const media = await readTemplateMediaAsset(templateKitId, entry);
    const asset = await createBrandAsset(
      `template-${media.fileName}`,
      media.mimeType,
      media.buffer,
      role
    );

    return NextResponse.json({
      schema: "branddeck.template-assets/v1",
      asset: summarizeBrandAsset(asset),
      inventory: listBrandAssets()
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to promote template media asset."
      },
      { status: 400 }
    );
  }
}
