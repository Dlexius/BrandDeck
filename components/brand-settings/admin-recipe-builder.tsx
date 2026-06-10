"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApprovedLayoutId, BrandContract } from "@/lib/deck-plan-schema";
import { DeckRecipe } from "@/lib/deck-recipes";
import { MAX_ADMIN_RECIPE_LAYOUTS } from "@/lib/ui-constants";
import { layoutDefinition } from "@/lib/ui-helpers";
import type { RecipeBuilderState } from "@/lib/ui-types";
import { Layers3, ShieldCheck } from "lucide-react";

export function AdminRecipeBuilder({
  brandContract,
  customRecipes,
  builder,
  onBuilderChange,
  onAddLayout,
  onRemoveLayout,
  onCreateRecipe,
  onDeleteRecipe
}: {
  brandContract: BrandContract;
  customRecipes: DeckRecipe[];
  builder: RecipeBuilderState;
  onBuilderChange: (builder: RecipeBuilderState) => void;
  onAddLayout: (layoutId: ApprovedLayoutId) => void;
  onRemoveLayout: (index: number) => void;
  onCreateRecipe: () => void;
  onDeleteRecipe: (recipeId: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Governed Recipe Builder
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Admin-created deck structures for new topics and audiences. Every
            slide still resolves to an approved template layout.
          </p>
        </div>
        <div className="rounded-sm bg-[#F3F3F3] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-ink">
          {customRecipes.length} custom
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              Recipe Name
            </span>
            <Input
              value={builder.name}
              onChange={(event) =>
                onBuilderChange({ ...builder, name: event.target.value })
              }
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              Audience
            </span>
            <Input
              value={builder.audience}
              onChange={(event) =>
                onBuilderChange({ ...builder, audience: event.target.value })
              }
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              Description
            </span>
            <Input
              value={builder.description}
              onChange={(event) =>
                onBuilderChange({
                  ...builder,
                  description: event.target.value
                })
              }
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              Routing Keywords
            </span>
            <Input
              value={builder.keywords}
              onChange={(event) =>
                onBuilderChange({ ...builder, keywords: event.target.value })
              }
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              Approved Layout Sequence
            </p>
            <div className="space-y-2 rounded-md border border-[#E5E0DB] bg-white p-3">
              {builder.layoutIds.map((layoutId, index) => {
                const layout = layoutDefinition(layoutId, brandContract);

                return (
                  <div
                    key={`${layoutId}-${index}`}
                    className="grid grid-cols-[28px_minmax(0,1fr)_72px] items-center gap-3 border-b border-[#EFEAE5] pb-2 last:border-b-0 last:pb-0"
                  >
                    <span className="font-mono text-xs font-bold text-[#787E89]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-brand-charcoal">
                        {layout?.name ?? layoutId}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[11px] font-semibold text-[#787E89]">
                        {layoutId}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      className="h-8 px-2 text-xs"
                      disabled={builder.layoutIds.length <= 3}
                      onClick={() => onRemoveLayout(index)}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              Add Layout
            </p>
            <div className="space-y-2">
              {brandContract.approved_layouts.map((layout) => (
                <button
                  key={layout.layout_id}
                  type="button"
                  disabled={builder.layoutIds.length >= MAX_ADMIN_RECIPE_LAYOUTS}
                  onClick={() => onAddLayout(layout.layout_id)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-[#E5E0DB] bg-white px-3 py-2 text-left text-xs font-bold text-brand-charcoal transition hover:border-brand-orange disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="truncate">{layout.name}</span>
                  <Layers3 className="h-3.5 w-3.5 shrink-0 text-brand-orange" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#E5E0DB] pt-4 md:flex-row md:items-center md:justify-between">
          <div className="text-xs font-semibold leading-5 text-[#787E89]">
            Custom recipes are saved to workspace storage. Exported manifests
            still prove the selected deck used approved layout IDs.
          </div>
          <Button onClick={onCreateRecipe}>
            <ShieldCheck className="h-4 w-4" />
            Save Governed Recipe
          </Button>
        </div>

        {customRecipes.length > 0 && (
          <div className="border-t border-[#E5E0DB] pt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              Admin Recipe Registry
            </p>
            <div className="space-y-2">
              {customRecipes.map((recipe) => (
                <div
                  key={recipe.recipe_id}
                  className="grid gap-3 rounded-md bg-[#F3F3F3] px-3 py-3 md:grid-cols-[minmax(0,1fr)_112px_84px]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-brand-charcoal">
                      {recipe.name}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-[#787E89]">
                      {recipe.audience}
                    </p>
                  </div>
                  <p className="self-center text-xs font-black uppercase tracking-[0.08em] text-brand-ink">
                    {recipe.slide_sequence.length} layouts
                  </p>
                  <Button
                    variant="secondary"
                    className="h-8 px-2 text-xs"
                    onClick={() => onDeleteRecipe(recipe.recipe_id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
