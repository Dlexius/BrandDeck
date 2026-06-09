import { NextResponse } from "next/server";
import {
  searchGoogleDriveFiles,
  type GoogleWorkspaceFileType
} from "@/lib/google-drive-connector";

export const runtime = "nodejs";

const GOOGLE_WORKSPACE_FILE_TYPES = new Set([
  "all",
  "document",
  "spreadsheet",
  "presentation"
]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const requestedType = searchParams.get("type") ?? "all";
  const fileType = GOOGLE_WORKSPACE_FILE_TYPES.has(requestedType)
    ? (requestedType as GoogleWorkspaceFileType)
    : "all";

  try {
    const result = await searchGoogleDriveFiles(query, request.url, fileType);

    return NextResponse.json({
      schema: "branddeck.connector.google-drive.search/v1",
      fileType,
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to search Google Drive."
      },
      { status: 400 }
    );
  }
}
