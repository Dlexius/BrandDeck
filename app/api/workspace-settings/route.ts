import { NextResponse } from "next/server";
import {
  getWorkspaceSettings,
  saveWorkspaceSettings
} from "@/lib/workspace-settings-store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    schema: "branddeck.workspace-settings/v1",
    settings: getWorkspaceSettings()
  });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    return NextResponse.json({
      schema: "branddeck.workspace-settings/v1",
      settings: saveWorkspaceSettings(body.settings ?? body)
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save workspace settings."
      },
      { status: 400 }
    );
  }
}
