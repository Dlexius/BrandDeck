import { NextResponse } from "next/server";
import {
  getActiveBrandContract,
  getDefaultBrandContract,
  overriddenColorTokenNames,
  resetBrandColorTokens,
  saveBrandColorTokens
} from "@/lib/brand-contract-store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    brandContract: getActiveBrandContract(),
    defaultBrandContract: getDefaultBrandContract(),
    overriddenColorTokens: overriddenColorTokenNames()
  });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const brandContract = saveBrandColorTokens(
      body.approved_color_tokens ?? body.colorTokens ?? {}
    );

    return NextResponse.json({
      brandContract,
      defaultBrandContract: getDefaultBrandContract(),
      overriddenColorTokens: overriddenColorTokenNames()
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update brand colors."
      },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const brandContract = resetBrandColorTokens();

  return NextResponse.json({
    brandContract,
    defaultBrandContract: getDefaultBrandContract(),
    overriddenColorTokens: []
  });
}
