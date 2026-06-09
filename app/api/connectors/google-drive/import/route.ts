import { NextResponse } from "next/server";
import { importGoogleDriveFiles } from "@/lib/google-drive-connector";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { fileIds?: unknown };
    const fileIds = Array.isArray(body.fileIds)
      ? body.fileIds.filter((id): id is string => typeof id === "string")
      : [];
    const documents = await importGoogleDriveFiles(fileIds, request.url);

    return NextResponse.json({
      schema: "branddeck.connector.google-drive.import/v1",
      documents
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to import Google Drive files."
      },
      { status: 400 }
    );
  }
}
