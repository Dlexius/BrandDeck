import { NextResponse } from "next/server";
import {
  createBrandAsset,
  getBrandAsset,
  isBrandAssetRole,
  listBrandAssets,
  summarizeBrandAsset,
  updateBrandAssetRole
} from "@/lib/brand-asset-store";

export const runtime = "nodejs";

const ACCEPTED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/svg+xml"
]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const asset = getBrandAsset(id);

    if (!asset) {
      return NextResponse.json(
        { error: "Brand asset not found." },
        { status: 404 }
      );
    }

    return new Response(new Uint8Array(asset.buffer), {
      headers: {
        "Content-Type": asset.mimeType,
        "Cache-Control": "no-store",
        "X-BrandDeck-Asset-Fingerprint": asset.fingerprint,
        "X-BrandDeck-Asset-Role": asset.role,
        "X-BrandDeck-Asset-Status": asset.status
      }
    });
  }

  return NextResponse.json({
    schema: "branddeck.brand-assets/v1",
    assets: listBrandAssets()
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("assets").filter((value): value is File => {
      return value instanceof File;
    });

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Upload at least one brand asset." },
        { status: 400 }
      );
    }

    const assets = await Promise.all(
      files.map(async (file) => {
        if (!ACCEPTED_MIME_TYPES.has(file.type)) {
          throw new Error(
            `${file.name} is not an approved asset type. Use PNG, JPG, or SVG.`
          );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const asset = await createBrandAsset(file.name, file.type, buffer);

        return summarizeBrandAsset(asset);
      })
    );

    return NextResponse.json({
      schema: "branddeck.brand-assets/v1",
      assets,
      inventory: listBrandAssets()
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to ingest brand assets."
      },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    const role = body.role;

    if (!id) {
      return NextResponse.json(
        { error: "Brand asset id is required." },
        { status: 400 }
      );
    }

    if (!isBrandAssetRole(role)) {
      return NextResponse.json(
        { error: "A valid brand asset role is required." },
        { status: 400 }
      );
    }

    const asset = updateBrandAssetRole(id, role);

    return NextResponse.json({
      schema: "branddeck.brand-assets/v1",
      asset: summarizeBrandAsset(asset),
      inventory: listBrandAssets()
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update brand asset."
      },
      { status: 400 }
    );
  }
}
