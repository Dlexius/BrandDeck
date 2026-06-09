import { NextResponse } from "next/server";
import { exchangeGoogleDriveCode } from "@/lib/google-drive-connector";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const cookieState = request.headers
    .get("cookie")
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith("branddeck_google_drive_state="))
    ?.split("=")[1];
  const redirectUrl = new URL("/", request.url);

  redirectUrl.searchParams.set("connector", "google-drive");

  if (error) {
    redirectUrl.searchParams.set("connector_error", error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !state || !cookieState || state !== decodeURIComponent(cookieState)) {
    redirectUrl.searchParams.set("connector_error", "invalid_state");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    await exchangeGoogleDriveCode(code, request.url);
    redirectUrl.searchParams.set("connector_status", "connected");
  } catch (exchangeError) {
    redirectUrl.searchParams.set(
      "connector_error",
      exchangeError instanceof Error
        ? exchangeError.message
        : "authorization_failed"
    );
  }

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.delete("branddeck_google_drive_state");

  return response;
}
