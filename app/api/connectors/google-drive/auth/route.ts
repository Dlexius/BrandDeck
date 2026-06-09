import { NextResponse } from "next/server";
import { createGoogleDriveAuthRequest } from "@/lib/google-drive-connector";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { state, url } = createGoogleDriveAuthRequest(request.url);
    const response = NextResponse.redirect(url);

    response.cookies.set("branddeck_google_drive_state", state, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 10,
      path: "/"
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start Google Drive authorization."
      },
      { status: 400 }
    );
  }
}
