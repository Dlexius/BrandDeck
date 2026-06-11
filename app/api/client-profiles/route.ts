import { NextResponse } from "next/server";
import {
  deleteClientProfile,
  listClientProfiles,
  saveClientProfile
} from "@/lib/client-profile-store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    schema: "branddeck.client-profiles/v1",
    profiles: listClientProfiles()
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { profile, profiles } = saveClientProfile(body.profile ?? body);

    return NextResponse.json({
      schema: "branddeck.client-profiles/v1",
      profile,
      profiles
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save the client profile."
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const profileId = typeof body.profileId === "string" ? body.profileId : "";

    if (!profileId) {
      return NextResponse.json(
        { error: "profileId is required." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      schema: "branddeck.client-profiles/v1",
      profiles: deleteClientProfile(profileId)
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete the client profile."
      },
      { status: 400 }
    );
  }
}
