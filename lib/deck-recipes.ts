import { z } from "zod";
import deckRecipeData from "@/data/deck-recipes.json";
import { APPROVED_LAYOUT_IDS, type ApprovedLayoutId } from "@/lib/deck-plan-schema";

export const DeckRecipeSlideSchema = z.object({
  slide_role: z.string().min(1).max(64),
  layout_id: z.enum(APPROVED_LAYOUT_IDS),
  title: z.string().min(1).max(120),
  content_focus: z.string().min(1).max(220),
  template_variant_key: z.string().min(1).max(80).optional()
});

export const DeckRecipeSchema = z.object({
  recipe_id: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  mode: z.enum(["predefined", "ad_hoc_blueprint"]),
  description: z.string().min(1).max(260),
  audience: z.string().min(1).max(120),
  intent_keywords: z.array(z.string().min(1).max(40)).min(1),
  slide_sequence: z.array(DeckRecipeSlideSchema).min(3).max(16)
});

const DeckRecipeLibrarySchema = z.object({
  schema: z.literal("branddeck.deck-recipes/v1"),
  recipes: z.array(DeckRecipeSchema).min(1)
});

export type DeckRecipeSlide = z.infer<typeof DeckRecipeSlideSchema>;
export type DeckRecipe = z.infer<typeof DeckRecipeSchema>;

export const deckRecipeLibrary = DeckRecipeLibrarySchema.parse(deckRecipeData);
export const approvedDeckRecipes = deckRecipeLibrary.recipes;

export function recipeLayoutIds(recipe: DeckRecipe): ApprovedLayoutId[] {
  return recipe.slide_sequence.map((slide) => slide.layout_id);
}

export function getDeckRecipe(recipeId: string) {
  return approvedDeckRecipes.find((recipe) => recipe.recipe_id === recipeId);
}

export function validateCustomDeckRecipes(recipes: unknown[]) {
  return z.array(DeckRecipeSchema).max(12).parse(recipes);
}

function phraseScore(prompt: string, phrase: string) {
  const normalizedPhrase = phrase.toLowerCase();

  if (normalizedPhrase.includes(" ")) {
    return prompt.includes(normalizedPhrase) ? 3 : 0;
  }

  return new RegExp(`\\b${normalizedPhrase}\\b`, "i").test(prompt) ? 2 : 0;
}

export function selectDeckRecipe(
  userPrompt: string,
  preferredRecipeId?: string,
  customRecipes: DeckRecipe[] = []
) {
  const recipeLibrary = [...approvedDeckRecipes, ...customRecipes];
  const preferred = preferredRecipeId
    ? recipeLibrary.find((recipe) => recipe.recipe_id === preferredRecipeId)
    : undefined;

  if (preferred) {
    return {
      recipe: preferred,
      confidence: 100,
      reason: preferred.recipe_id.startsWith("admin_custom_")
        ? "Creator selected an admin-governed custom recipe."
        : "Creator selected an approved recipe."
    };
  }

  const normalizedPrompt = userPrompt.toLowerCase();
  const scored = recipeLibrary.map((recipe) => {
    const score = recipe.intent_keywords.reduce(
      (sum, keyword) => sum + phraseScore(normalizedPrompt, keyword),
      recipe.recipe_id === "client_adoption_report" ? 1 : 0
    );

    return { recipe, score };
  });
  const best = scored.sort((a, b) => b.score - a.score)[0];

  if (!best || best.score <= 1) {
    const fallback =
      recipeLibrary.find(
        (recipe) => recipe.recipe_id === "ad_hoc_brand_safe_deck"
      ) ?? recipeLibrary[0];

    return {
      recipe: fallback,
      confidence: 72,
      reason:
        "Prompt did not strongly match a predefined recipe, so BrandDeck used the approved ad hoc blueprint."
    };
  }

  return {
    recipe: best.recipe,
    confidence: Math.min(96, 72 + best.score * 4),
    reason: "Prompt matched approved recipe keywords."
  };
}
