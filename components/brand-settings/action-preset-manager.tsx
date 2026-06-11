"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BUILT_IN_ACTION_PRESETS } from "@/lib/ui-constants";
import type { ActionPresetType, ActionPresets } from "@/lib/ui-types";
import { Loader2, Plus, X } from "lucide-react";

const TYPE_LABELS: Record<ActionPresetType, string> = {
  risks: "Risk",
  recommendations: "Recommendation"
};

export function ActionPresetManager({
  customPresets,
  savingPreset,
  removingPreset,
  onAddPreset,
  onRemovePreset
}: {
  customPresets: ActionPresets;
  savingPreset: boolean;
  removingPreset: string;
  onAddPreset: (type: ActionPresetType, text: string) => void;
  onRemovePreset: (type: ActionPresetType, text: string) => void;
}) {
  const [draftType, setDraftType] = useState<ActionPresetType>("risks");
  const [draftText, setDraftText] = useState("");

  const sections: Array<{
    type: ActionPresetType;
    title: string;
  }> = [
    { type: "risks", title: "Risk quick picks" },
    { type: "recommendations", title: "Recommendation quick picks" }
  ];

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
          Risk & Action Quick Picks
        </h2>
        <p className="mt-1 text-sm text-[#787E89]">
          One-click lines creators can drop into the Risks and actions fields
          in step two. Built-in picks stay generic; add your workspace&apos;s
          own common risks and follow-ups here.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {sections.map((section) => (
          <div key={section.type}>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
              {section.title}
            </h3>
            <div className="mt-2 space-y-1.5">
              {BUILT_IN_ACTION_PRESETS[section.type].map((preset) => (
                <div
                  key={preset}
                  className="flex items-center justify-between gap-3 rounded-md bg-[#F3F3F3] px-3 py-2"
                >
                  <p className="min-w-0 text-xs font-semibold leading-5 text-brand-ink">
                    {preset}
                  </p>
                  <span className="shrink-0 rounded-sm bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#787E89]">
                    Built-in
                  </span>
                </div>
              ))}
              {customPresets[section.type].map((preset) => (
                <div
                  key={preset}
                  className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 ring-1 ring-[#EFEAE5]"
                >
                  <p className="min-w-0 text-xs font-semibold leading-5 text-brand-ink">
                    {preset}
                  </p>
                  <button
                    type="button"
                    aria-label={`Remove quick pick: ${preset.slice(0, 40)}`}
                    disabled={removingPreset === `${section.type}:${preset}`}
                    onClick={() => onRemovePreset(section.type, preset)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#9AA0A6] transition hover:bg-[#F3F3F3] hover:text-brand-charcoal disabled:opacity-50"
                  >
                    {removingPreset === `${section.type}:${preset}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="grid gap-2 border-t border-[#E5E0DB] pt-4 sm:grid-cols-[170px_minmax(0,1fr)_auto]">
          <select
            value={draftType}
            disabled={savingPreset}
            onChange={(event) =>
              setDraftType(event.currentTarget.value as ActionPresetType)
            }
            className="h-10 rounded-sm border border-[#D7CABF] bg-white px-2 text-sm font-bold text-brand-charcoal outline-none transition focus:border-brand-orange"
          >
            {sections.map((section) => (
              <option key={section.type} value={section.type}>
                {TYPE_LABELS[section.type]}
              </option>
            ))}
          </select>
          <Input
            value={draftText}
            maxLength={220}
            disabled={savingPreset}
            placeholder="Add a reusable line, e.g. Confirm rollout owners before the next checkpoint"
            onChange={(event) => setDraftText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && draftText.trim()) {
                event.preventDefault();
                onAddPreset(draftType, draftText.trim());
                setDraftText("");
              }
            }}
          />
          <Button
            className="h-10 px-4"
            disabled={savingPreset || !draftText.trim()}
            onClick={() => {
              onAddPreset(draftType, draftText.trim());
              setDraftText("");
            }}
          >
            {savingPreset ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
