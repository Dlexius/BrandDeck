import { NextResponse } from "next/server";
import {
  createTemplateKit,
  listTemplateKits,
  summarizeTemplateKit
} from "@/lib/template-kit-store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    schema: "branddeck.template-kits/v1",
    templateKits: listTemplateKits()
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const templateFile = formData.get("template");

    if (!(templateFile instanceof File)) {
      return NextResponse.json(
        { error: "Upload a .pptx template file." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await templateFile.arrayBuffer());
    const kit = await createTemplateKit(templateFile.name, buffer);

    return NextResponse.json(summarizeTemplateKit(kit));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to inspect the PPTX template."
      },
      { status: 400 }
    );
  }
}
