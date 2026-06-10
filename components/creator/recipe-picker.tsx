"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DeckPlan } from "@/lib/deck-plan-schema";
import { DeckRecipe, approvedDeckRecipes } from "@/lib/deck-recipes";
import { MIN_SELECTED_RECIPE_SLIDES } from "@/lib/generateDeckPlan";
import { Check, Layers3, Lock, Sparkles } from "lucide-react";

export function CompactDeckRecipePicker({
  selectedRecipeId,
  deckPlan,
  customRecipes,
  deselectedSlideRoles,
  onSelectedRecipeIdChange,
  onToggleSlideRole
}: {
  selectedRecipeId: string;
  deckPlan: DeckPlan | null;
  customRecipes: DeckRecipe[];
  deselectedSlideRoles: string[];
  onSelectedRecipeIdChange: (recipeId: string) => void;
  onToggleSlideRole: (slideRole: string) => void;
}) {
  const recipeLibrary = [...approvedDeckRecipes, ...customRecipes];
  const generatedRecipe =
    deckPlan?.deck_recipe_id
      ? recipeLibrary.find((recipe) => recipe.recipe_id === deckPlan.deck_recipe_id)
      : undefined;
  const autoSelected = selectedRecipeId === "auto";
  const selectedRecipe = autoSelected
    ? undefined
    : recipeLibrary.find((recipe) => recipe.recipe_id === selectedRecipeId);
  const selectedSlideCount = selectedRecipe
    ? selectedRecipe.slide_sequence.filter(
        (slide) => !deselectedSlideRoles.includes(slide.slide_role)
      ).length
    : 0;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Deck Type
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Choose auto-selection or one approved preset for this deck.
          </p>
        </div>
        <div className="rounded-sm bg-[#F3F3F3] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-ink">
          {recipeLibrary.length} approved
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => onSelectedRecipeIdChange("auto")}
            className={`rounded-md border px-4 py-3 text-left transition ${
              autoSelected
                ? "border-brand-orange bg-[#FFF7F2] shadow-sm"
                : "border-[#E5E0DB] bg-white hover:border-[#D7CABF]"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-black text-brand-charcoal">
                  Auto-select from prompt
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-[#787E89]">
                  BrandDeck chooses the best approved structure after it reads the
                  request.
                </p>
              </div>
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
            </div>
            <p className="mt-3 text-xs font-bold text-brand-ink">
              {generatedRecipe && autoSelected
                ? `Generated with ${generatedRecipe.name}`
                : "Recommended for most decks"}
            </p>
          </button>

          {recipeLibrary.map((recipe) => {
            const isSelected = selectedRecipeId === recipe.recipe_id;
            const isCustom = recipe.recipe_id.startsWith("admin_custom_");

            return (
              <button
                key={recipe.recipe_id}
                type="button"
                onClick={() => onSelectedRecipeIdChange(recipe.recipe_id)}
                className={`rounded-md border px-4 py-3 text-left transition ${
                  isSelected
                    ? "border-brand-orange bg-[#FFF7F2] shadow-sm"
                    : "border-[#E5E0DB] bg-white hover:border-[#D7CABF]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-brand-charcoal">
                      {recipe.name}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#787E89]">
                      {recipe.description}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-sm px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${
                      isCustom
                        ? "bg-[#FFF1E8] text-[#6B2A00]"
                        : recipe.mode === "predefined"
                          ? "bg-[#F3F3F3] text-brand-ink"
                          : "bg-[#111111] text-white"
                    }`}
                  >
                    {isCustom
                      ? "Admin"
                      : recipe.mode === "predefined"
                        ? "Preset"
                        : "Ad hoc"}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-brand-ink">
                  <Layers3 className="h-3.5 w-3.5 text-brand-orange" />
                  Baseline {recipe.slide_sequence.length} slides; expands with context
                </div>
              </button>
            );
          })}
        </div>

        {selectedRecipe && (
          <div className="mt-4 border-t border-[#E5E0DB] pt-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
                Slides in this deck type
              </h3>
              <p className="text-xs font-bold text-brand-ink">
                {selectedSlideCount} of {selectedRecipe.slide_sequence.length} selected
              </p>
            </div>
            <p className="mt-1 text-xs font-semibold leading-5 text-[#787E89]">
              Uncheck any slide you want left out of this deck. The opening
              slide always stays, and at least {MIN_SELECTED_RECIPE_SLIDES}{" "}
              slides stay selected.
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {selectedRecipe.slide_sequence.map((slide, index) => {
                const isTitleSlide = slide.slide_role === "title";
                const isDeselected = deselectedSlideRoles.includes(
                  slide.slide_role
                );
                const atMinimum =
                  selectedSlideCount <= MIN_SELECTED_RECIPE_SLIDES;
                const locked = isTitleSlide || (!isDeselected && atMinimum);

                return (
                  <button
                    key={`${slide.slide_role}-${index}`}
                    type="button"
                    disabled={locked}
                    aria-pressed={!isDeselected}
                    onClick={() => onToggleSlideRole(slide.slide_role)}
                    className={`flex items-start gap-3 rounded-md border px-3 py-2.5 text-left transition ${
                      isDeselected
                        ? "border-[#E5E0DB] bg-[#FAFAF9] opacity-70"
                        : "border-[#E5E0DB] bg-white"
                    } ${locked ? "cursor-default" : "hover:border-[#D7CABF]"}`}
                  >
                    <span
                      className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-sm ${
                        isTitleSlide
                          ? "bg-[#F3F3F3] text-[#787E89]"
                          : isDeselected
                            ? "border border-[#D7CABF] bg-white"
                            : "bg-brand-orange text-white"
                      }`}
                    >
                      {isTitleSlide ? (
                        <Lock className="h-3 w-3" />
                      ) : isDeselected ? null : (
                        <Check className="h-3 w-3" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block truncate text-sm font-bold ${
                          isDeselected
                            ? "text-[#787E89] line-through"
                            : "text-brand-charcoal"
                        }`}
                      >
                        {slide.title}
                      </span>
                      <span className="mt-0.5 line-clamp-1 block text-[11px] font-semibold text-[#787E89]">
                        {slide.content_focus}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
