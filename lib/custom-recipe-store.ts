import type { DeckRecipe } from "@/lib/deck-recipes";
import { validateCustomDeckRecipes } from "@/lib/deck-recipes";
import {
  readRuntimeJson,
  writeRuntimeJson
} from "@/lib/local-runtime-store";

const CUSTOM_RECIPE_LIMIT = 24;
const CUSTOM_RECIPE_GLOBAL_KEY = Symbol.for("branddeck.customRecipes");

type CustomRecipeGlobal = {
  recipes: DeckRecipe[];
  hydrated: boolean;
};

function getGlobalStore() {
  const globalWithRecipes = globalThis as typeof globalThis & {
    [CUSTOM_RECIPE_GLOBAL_KEY]?: CustomRecipeGlobal;
  };

  if (!globalWithRecipes[CUSTOM_RECIPE_GLOBAL_KEY]) {
    globalWithRecipes[CUSTOM_RECIPE_GLOBAL_KEY] = {
      recipes: [],
      hydrated: false
    };
  }

  const store = globalWithRecipes[CUSTOM_RECIPE_GLOBAL_KEY];

  if (!store.hydrated) {
    store.recipes = validateCustomDeckRecipes(
      readRuntimeJson<DeckRecipe[]>("custom-recipes.json", [])
    );
    store.hydrated = true;
  }

  return store;
}

function persistCustomRecipes(store: CustomRecipeGlobal) {
  writeRuntimeJson("custom-recipes.json", store.recipes);
}

export function listCustomDeckRecipes() {
  return getGlobalStore().recipes;
}

export function upsertCustomDeckRecipe(recipe: DeckRecipe) {
  const store = getGlobalStore();
  const validatedRecipe = validateCustomDeckRecipes([recipe])[0];
  const existingIndex = store.recipes.findIndex(
    (item) => item.recipe_id === validatedRecipe.recipe_id
  );

  if (existingIndex >= 0) {
    store.recipes[existingIndex] = validatedRecipe;
  } else {
    store.recipes = [...store.recipes, validatedRecipe].slice(
      -CUSTOM_RECIPE_LIMIT
    );
  }

  persistCustomRecipes(store);

  return validatedRecipe;
}

export function deleteCustomDeckRecipe(recipeId: string) {
  const store = getGlobalStore();
  const before = store.recipes.length;
  store.recipes = store.recipes.filter(
    (recipe) => recipe.recipe_id !== recipeId
  );

  if (store.recipes.length === before) {
    throw new Error("Custom recipe not found.");
  }

  persistCustomRecipes(store);

  return store.recipes;
}
