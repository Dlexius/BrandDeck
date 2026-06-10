"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CLIENT_PROFILES } from "@/lib/ui-constants";
import { CheckCircle2 } from "lucide-react";

export function ClientProfilePanel({
  selectedProfileId,
  profileContext,
  workflowBusy,
  onSelectProfile,
  onProfileContextChange,
  onClearProfile
}: {
  selectedProfileId: string;
  profileContext: string;
  workflowBusy: boolean;
  onSelectProfile: (profileId: string) => void;
  onProfileContextChange: (value: string) => void;
  onClearProfile: () => void;
}) {
  const selectedProfile = CLIENT_PROFILES.find(
    (profile) => profile.id === selectedProfileId
  );

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Client Profile
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Reuse known tools, priorities, and account context so every deck
            stays continuous.
          </p>
        </div>
        {selectedProfile && (
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={onClearProfile}
            disabled={workflowBusy}
          >
            Clear Profile
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          {CLIENT_PROFILES.map((profile) => {
            const isSelected = profile.id === selectedProfileId;

            return (
              <button
                key={profile.id}
                type="button"
                disabled={workflowBusy}
                onClick={() => onSelectProfile(profile.id)}
                className={`rounded-md border px-4 py-3 text-left transition ${
                  isSelected
                    ? "border-brand-orange bg-[#FFF7F2] shadow-sm"
                    : "border-[#E5E0DB] bg-white hover:border-[#D7CABF]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-brand-charcoal">
                      {profile.name}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#787E89]">
                      {profile.segment} | {profile.stage}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#188038]" />
                  )}
                </div>
                <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-brand-ink">
                  {profile.focus}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {profile.tools.slice(0, 4).map((tool) => (
                    <span
                      key={tool}
                      className="rounded-sm bg-[#F3F3F3] px-2 py-1 text-[10px] font-bold text-[#787E89]"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Continuity Context
          </span>
          <Textarea
            value={profileContext}
            disabled={workflowBusy}
            placeholder="Add client tools, purchased modules, goals, rollout status, renewal context, stakeholders, or product areas this deck should account for."
            className="min-h-[118px]"
            onChange={(event) => onProfileContextChange(event.target.value)}
          />
          <p className="mt-2 text-xs font-semibold leading-5 text-[#787E89]">
            This becomes planner evidence for the client, not a visual design
            instruction.
          </p>
        </label>
      </CardContent>
    </Card>
  );
}
