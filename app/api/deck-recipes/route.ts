import { NextResponse } from "next/server";
import {
  deleteCustomDeckRecipe,
  listCustomDeckRecipes,
  upsertCustomDeckRecipe
} from "@/lib/custom-recipe-store";
import { DeckRecipeSchema } from "@/lib/deck-recipes";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    schema: "branddeck.custom-deck-recipes/v1",
    recipes: listCustomDeckRecipes()
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const recipe = DeckRecipeSchema.parse(body.recipe);
    const savedRecipe = upsertCustomDeckRecipe(recipe);

    return NextResponse.json({
      schema: "branddeck.custom-deck-recipes/v1",
      recipe: savedRecipe,
      recipes: listCustomDeckRecipes()
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save custom deck recipe."
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const recipeId = typeof body.recipeId === "string" ? body.recipeId : "";

    if (!recipeId) {
      return NextResponse.json(
        { error: "Custom recipe id is required." },
        { status: 400 }
      );
    }

    const recipes = deleteCustomDeckRecipe(recipeId);

    return NextResponse.json({
      schema: "branddeck.custom-deck-recipes/v1",
      recipes
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete custom deck recipe."
      },
      { status: 400 }
    );
  }
}
