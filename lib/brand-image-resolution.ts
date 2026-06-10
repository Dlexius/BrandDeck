import { getBrandAsset, listBrandAssets } from "@/lib/brand-asset-store";
import { getBrandContractOverrides } from "@/lib/brand-contract-store";

/**
 * White-label image resolution for the coordinate renderer.
 *
 * The bundled contract ships demo-brand imagery (wordmarks, hero photo,
 * textures). Once an admin adopts another brand's identity, that imagery must
 * never appear in an export. Resolution order per slot:
 *
 *   1. a governed uploaded asset with the matching role (any brand), else
 *   2. the contract's bundled asset - but ONLY while the bundled identity is
 *      still active, else
 *   3. nothing: the renderer omits the image rather than leaking the wrong
 *      brand's marks.
 */

export type BrandImageSlot =
  | "wordmark_black"
  | "wordmark_white"
  | "hero_photo"
  | "texture_title"
  | "texture_agenda";

export type BrandImageSource = { data: string };

export type ResolvedBrandImages = {
  /** True when a non-bundled brand identity is active. */
  identityOverridden: boolean;
  images: Partial<Record<BrandImageSlot, BrandImageSource>>;
};

function toDataUri(assetId: string): BrandImageSource | undefined {
  const asset = getBrandAsset(assetId);

  if (!asset) {
    return undefined;
  }

  return {
    data: `data:${asset.mimeType};base64,${asset.buffer.toString("base64")}`
  };
}

export function resolveGovernedBrandImages(): ResolvedBrandImages {
  const identityOverridden = Boolean(getBrandContractOverrides().companyName);
  const approved = listBrandAssets().filter(
    (asset) => asset.status === "approved_for_review"
  );
  const logos = approved.filter((asset) => asset.role === "logo");
  const heroes = approved.filter((asset) => asset.role === "hero_image");
  const textures = approved.filter((asset) => asset.role === "texture");

  // Light-on-dark wordmarks are only used when the file clearly says so; a
  // dark wordmark on a dark slide is worse than no wordmark.
  const whiteLogo = logos.find((asset) =>
    /white|light|reverse|inverse|knockout/i.test(asset.fileName)
  );
  const darkLogo =
    logos.find((asset) => /black|dark|charcoal/i.test(asset.fileName)) ??
    logos.find((asset) => asset !== whiteLogo);

  const images: ResolvedBrandImages["images"] = {};
  const darkSource = darkLogo ? toDataUri(darkLogo.id) : undefined;
  const whiteSource = whiteLogo ? toDataUri(whiteLogo.id) : undefined;
  const heroSource = heroes[0] ? toDataUri(heroes[0].id) : undefined;
  const titleTexture = textures[0] ? toDataUri(textures[0].id) : undefined;
  const agendaTexture = textures[1]
    ? toDataUri(textures[1].id)
    : titleTexture;

  if (darkSource) {
    images.wordmark_black = darkSource;
  }

  if (whiteSource) {
    images.wordmark_white = whiteSource;
  }

  if (heroSource) {
    images.hero_photo = heroSource;
  }

  if (titleTexture) {
    images.texture_title = titleTexture;
  }

  if (agendaTexture) {
    images.texture_agenda = agendaTexture;
  }

  return { identityOverridden, images };
}
