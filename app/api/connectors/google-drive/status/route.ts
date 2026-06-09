import { NextResponse } from "next/server";
import {
  clearGoogleDriveToken,
  getGoogleDriveConnectionStatus
} from "@/lib/google-drive-connector";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return NextResponse.json({
    schema: "branddeck.connector.google-drive.status/v1",
    ...getGoogleDriveConnectionStatus(request.url)
  });
}

export async function DELETE() {
  clearGoogleDriveToken();

  return NextResponse.json({
    schema: "branddeck.connector.google-drive.status/v1",
    connected: false
  });
}
