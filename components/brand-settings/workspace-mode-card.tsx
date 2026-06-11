"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { PresentationMode } from "@/lib/ui-types";
import { Briefcase, Building2, CheckCircle2, Loader2 } from "lucide-react";

const MODE_OPTIONS: Array<{
  mode: PresentationMode;
  label: string;
  description: string;
  icon: typeof Briefcase;
}> = [
  {
    mode: "client",
    label: "Client presentations",
    description:
      "Decks are prepared for external clients and accounts. Creators pick from saved client profiles with account metrics.",
    icon: Briefcase
  },
  {
    mode: "internal",
    label: "Internal presentations",
    description:
      "Decks are prepared for your own teams. Creators save audiences instead of clients, and no example client data is shown.",
    icon: Building2
  }
];

export function WorkspaceModeCard({
  presentationMode,
  saving,
  onSelectMode
}: {
  presentationMode: PresentationMode;
  saving: boolean;
  onSelectMode: (mode: PresentationMode) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
          Who You Present To
        </h2>
        <p className="mt-1 text-sm text-[#787E89]">
          Sets how the creator workflow talks about the people each deck is
          for. It changes wording and examples only - brand rules and approved
          layouts stay the same.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {MODE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = presentationMode === option.mode;

            return (
              <button
                key={option.mode}
                type="button"
                disabled={saving}
                onClick={() => {
                  if (!selected) {
                    onSelectMode(option.mode);
                  }
                }}
                className={`rounded-md border px-4 py-3 text-left transition ${
                  selected
                    ? "border-brand-orange bg-[#FFF7F2] shadow-sm"
                    : "border-[#E5E0DB] bg-white hover:border-[#D7CABF]"
                } ${saving ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${
                      selected
                        ? "bg-brand-orange text-white"
                        : "bg-[#F3F3F3] text-[#787E89]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  {selected &&
                    (saving ? (
                      <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-brand-orange" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#188038]" />
                    ))}
                </div>
                <p className="mt-3 text-sm font-black text-brand-charcoal">
                  {option.label}
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-[#787E89]">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
