import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import brandContractData from "@/data/brand-contract.json";
import type { BrandContract } from "@/lib/deck-plan-schema";
import { generateDeckPlan, type AdoptionCsvRow } from "@/lib/generateDeckPlan";
import { renderPptx } from "@/lib/renderPptx";

const brandContract = brandContractData as unknown as BrandContract;

// 1x1 transparent PNG.
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

function loadFixtureRows() {
  const csv = fs.readFileSync(
    path.join(process.cwd(), "data", "branddeck-test-client-adoption.csv"),
    "utf8"
  );
  return Papa.parse<AdoptionCsvRow>(csv, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true
  }).data;
}

function buildPlan() {
  return generateDeckPlan(
    "Prepare the quarterly business review.",
    loadFixtureRows(),
    brandContract,
    { recipeId: "quarterly_business_review" }
  );
}

async function mediaEntries(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  return Object.keys(zip.files).filter(
    (name) => name.startsWith("ppt/media/") && !zip.files[name].dir
  );
}

describe("white-label asset resolution", () => {
  it("suppresses every bundled demo image when another identity is active", async () => {
    const buffer = await renderPptx(buildPlan(), brandContract, {
      suppressDefaultAssets: true
    });
    const media = await mediaEntries(buffer);

    expect(media).toHaveLength(0);
  });

  it("uses governed uploaded imagery instead of bundled assets", async () => {
    const buffer = await renderPptx(buildPlan(), brandContract, {
      suppressDefaultAssets: true,
      brandImages: {
        wordmark_black: { data: TINY_PNG },
        wordmark_white: { data: TINY_PNG },
        hero_photo: { data: TINY_PNG }
      }
    });
    const media = await mediaEntries(buffer);

    expect(media.length).toBeGreaterThan(0);

    // None of the media should be the bundled demo brand files (data URIs
    // become generated image names, never the bundled asset names).
    const zip = await JSZip.loadAsync(buffer);
    const bundledWordmark = fs.readFileSync(
      path.join(
        process.cwd(),
        "public",
        "brand-assets",
        "procore-template",
        "procore-wordmark-black.png"
      )
    );
    for (const entry of media) {
      const bytes = await zip.file(entry)!.async("nodebuffer");
      expect(bytes.equals(bundledWordmark)).toBe(false);
    }
  });

  it("keeps bundled assets for the bundled demo identity", async () => {
    const buffer = await renderPptx(buildPlan(), brandContract);
    const media = await mediaEntries(buffer);

    expect(media.length).toBeGreaterThan(0);
  });
});
