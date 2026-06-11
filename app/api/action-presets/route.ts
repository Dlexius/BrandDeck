import { NextResponse } from "next/server";
import {
  addCustomActionPreset,
  listCustomActionPresets,
  removeCustomActionPreset
} from "@/lib/action-preset-store";
import type { ActionPresetType } from "@/lib/ui-types";

export const runtime = "nodejs";

function presetType(value: unknown): ActionPresetType | null {
  return value === "risks" || value === "recommendations" ? value : null;
}

export async function GET() {
  return NextResponse.json({
    schema: "branddeck.action-presets/v1",
    custom: listCustomActionPresets()
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const type = presetType(body.type);

    if (!type) {
      return NextResponse.json(
        { error: "type must be risks or recommendations." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      schema: "branddeck.action-presets/v1",
      custom: addCustomActionPreset(type, body.text)
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to save the quick pick."
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const type = presetType(body.type);

    if (!type) {
      return NextResponse.json(
        { error: "type must be risks or recommendations." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      schema: "branddeck.action-presets/v1",
      custom: removeCustomActionPreset(type, body.text)
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to remove the quick pick."
      },
      { status: 400 }
    );
  }
}
