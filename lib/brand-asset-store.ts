import crypto from "node:crypto";
import {
  readRuntimeJson,
  writeRuntimeJson
} from "@/lib/local-runtime-store";

export type BrandAssetRole = "logo" | "icon" | "hero_image" | "texture" | "supporting_image";

export type BrandAsset = {
  id: string;
  fileName: string;
  role: BrandAssetRole;
  mimeType: string;
  extension: string;
  bytes: number;
  fingerprint: string;
  width?: number;
  height?: number;
  status: "approved_for_review" | "needs_admin_label";
  driftGuards: {
    fingerprintLocked: boolean;
    rendererPlacementRequired: boolean;
    aiMayNotInventReplacement: boolean;
  };
  buffer: Buffer;
};

export type BrandAssetSummary = Omit<BrandAsset, "buffer">;

const BRAND_ASSET_LIMIT = 48;
const BRAND_ASSET_GLOBAL_KEY = Symbol.for("branddeck.brandAssets");

type BrandAssetGlobal = {
  assets: Map<string, BrandAsset>;
  hydrated: boolean;
};

type PersistedBrandAsset = Omit<BrandAsset, "buffer"> & {
  bufferBase64: string;
};

function getGlobalStore() {
  const globalWithAssets = globalThis as typeof globalThis & {
    [BRAND_ASSET_GLOBAL_KEY]?: BrandAssetGlobal;
  };

  if (!globalWithAssets[BRAND_ASSET_GLOBAL_KEY]) {
    globalWithAssets[BRAND_ASSET_GLOBAL_KEY] = {
      assets: new Map(),
      hydrated: false
    };
  }

  const store = globalWithAssets[BRAND_ASSET_GLOBAL_KEY];

  if (!store.hydrated) {
    hydrateBrandAssets(store);
  }

  return store;
}

function hydrateBrandAssets(store: BrandAssetGlobal) {
  const persisted = readRuntimeJson<PersistedBrandAsset[]>(
    "brand-assets.json",
    []
  );

  store.assets = new Map(
    persisted.map((asset) => {
      const { bufferBase64, ...summary } = asset;

      return [
        summary.id,
        {
          ...summary,
          buffer: Buffer.from(bufferBase64, "base64")
        }
      ];
    })
  );
  store.hydrated = true;
}

function persistBrandAssets(store: BrandAssetGlobal) {
  const persisted = Array.from(store.assets.values()).map((asset) => {
    const { buffer, ...summary } = asset;

    return {
      ...summary,
      bufferBase64: buffer.toString("base64")
    };
  });

  writeRuntimeJson("brand-assets.json", persisted);
}

function inferRole(fileName: string): BrandAssetRole {
  const normalized = fileName.toLowerCase();

  if (/logo|wordmark|brandmark/.test(normalized)) {
    return "logo";
  }

  if (/icon|glyph|symbol/.test(normalized)) {
    return "icon";
  }

  if (/hero|cover|banner|photo/.test(normalized)) {
    return "hero_image";
  }

  if (/texture|pattern|background/.test(normalized)) {
    return "texture";
  }

  return "supporting_image";
}

function extensionFromName(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function readPngDimensions(buffer: Buffer) {
  if (
    buffer.length >= 24 &&
    buffer.toString("hex", 0, 8) === "89504e470d0a1a0a"
  ) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    };
  }

  return {};
}

function readJpegDimensions(buffer: Buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return {};
  }

  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const blockLength = buffer.readUInt16BE(offset + 2);

    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      };
    }

    offset += 2 + blockLength;
  }

  return {};
}

function readSvgDimensions(buffer: Buffer) {
  const svgText = buffer.toString("utf8", 0, Math.min(buffer.length, 4096));
  const width = svgText.match(/\bwidth="([\d.]+)(?:px)?"/i)?.[1];
  const height = svgText.match(/\bheight="([\d.]+)(?:px)?"/i)?.[1];
  const viewBox = svgText.match(/\bviewBox="[^"]*?[\s,]+[^"]*?[\s,]+([\d.]+)[\s,]+([\d.]+)"/i);

  if (width && height) {
    return {
      width: Math.round(Number(width)),
      height: Math.round(Number(height))
    };
  }

  if (viewBox) {
    return {
      width: Math.round(Number(viewBox[1])),
      height: Math.round(Number(viewBox[2]))
    };
  }

  return {};
}

export function readImageDimensions(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/png") {
    return readPngDimensions(buffer);
  }

  if (mimeType === "image/jpeg") {
    return readJpegDimensions(buffer);
  }

  if (mimeType === "image/svg+xml") {
    return readSvgDimensions(buffer);
  }

  return {};
}

export function summarizeBrandAsset(asset: BrandAsset): BrandAssetSummary {
  const { buffer: _buffer, ...summary } = asset;
  return summary;
}

export function listBrandAssets() {
  return Array.from(getGlobalStore().assets.values()).map(summarizeBrandAsset);
}

export function getBrandAsset(id: string) {
  return getGlobalStore().assets.get(id);
}

export function isBrandAssetRole(value: unknown): value is BrandAssetRole {
  return (
    value === "logo" ||
    value === "icon" ||
    value === "hero_image" ||
    value === "texture" ||
    value === "supporting_image"
  );
}

export function updateBrandAssetRole(id: string, role: BrandAssetRole) {
  const store = getGlobalStore();
  const asset = store.assets.get(id);

  if (!asset) {
    throw new Error("Brand asset not found.");
  }

  const updatedAsset: BrandAsset = {
    ...asset,
    role,
    status: "approved_for_review"
  };

  store.assets.set(id, updatedAsset);
  persistBrandAssets(store);

  return updatedAsset;
}

export async function createBrandAsset(
  fileName: string,
  mimeType: string,
  buffer: Buffer,
  approvedRole?: BrandAssetRole
) {
  const fingerprint = crypto.createHash("sha256").update(buffer).digest("hex");
  const id = `asset_${fingerprint.slice(0, 16)}`;
  const role = approvedRole ?? inferRole(fileName);
  const dimensions = readImageDimensions(buffer, mimeType);
  const asset: BrandAsset = {
    id,
    fileName,
    role,
    mimeType,
    extension: extensionFromName(fileName),
    bytes: buffer.length,
    fingerprint,
    ...dimensions,
    status:
      approvedRole || role !== "supporting_image"
        ? "approved_for_review"
        : "needs_admin_label",
    driftGuards: {
      fingerprintLocked: true,
      rendererPlacementRequired: true,
      aiMayNotInventReplacement: true
    },
    buffer
  };
  const store = getGlobalStore();

  store.assets.set(id, asset);

  if (store.assets.size > BRAND_ASSET_LIMIT) {
    const oldestAssetId = store.assets.keys().next().value as string | undefined;
    if (oldestAssetId) {
      store.assets.delete(oldestAssetId);
    }
  }

  persistBrandAssets(store);

  return asset;
}
