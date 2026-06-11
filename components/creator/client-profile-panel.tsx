"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { ClientProfile, PresentationMode } from "@/lib/ui-types";
import { CheckCircle2, Loader2, Save, X } from "lucide-react";

export function ClientProfilePanel({
  presentationMode,
  profiles,
  showingExamples,
  selectedProfileId,
  profileContext,
  workflowBusy,
  canSaveProfile,
  saveIsUpdate,
  savingProfile,
  deletingProfileId,
  onSelectProfile,
  onProfileContextChange,
  onClearProfile,
  onSaveCurrentClient,
  onDeleteProfile
}: {
  presentationMode: PresentationMode;
  profiles: ClientProfile[];
  showingExamples: boolean;
  selectedProfileId: string;
  profileContext: string;
  workflowBusy: boolean;
  canSaveProfile: boolean;
  saveIsUpdate: boolean;
  savingProfile: boolean;
  deletingProfileId: string;
  onSelectProfile: (profileId: string) => void;
  onProfileContextChange: (value: string) => void;
  onClearProfile: () => void;
  onSaveCurrentClient: () => void;
  onDeleteProfile: (profileId: string) => void;
}) {
  const internal = presentationMode === "internal";
  const subjectNoun = internal ? "audience" : "client";
  const selectedProfile = profiles.find(
    (profile) => profile.id === selectedProfileId
  );

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            {internal ? "Audience Profile" : "Client Profile"}
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            {internal
              ? "Pick a saved team or audience to fill the context and metrics below, so nothing is retyped between decks."
              : "Pick a saved client to fill the context and metrics below, so nothing is retyped between decks."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {selectedProfile && (
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={onClearProfile}
              disabled={workflowBusy}
            >
              Clear Selection
            </Button>
          )}
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={onSaveCurrentClient}
            disabled={workflowBusy || savingProfile || !canSaveProfile}
            title={
              canSaveProfile
                ? undefined
                : internal
                  ? "Enter who the deck is for in the metrics snapshot first."
                  : "Enter a client name in the metrics snapshot first."
            }
          >
            {savingProfile ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveIsUpdate
              ? internal
                ? "Update Saved Audience"
                : "Update Saved Client"
              : internal
                ? "Save Current Audience"
                : "Save Current Client"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showingExamples && (
          <p className="rounded-md bg-[#F3F3F3] px-3 py-2 text-xs font-semibold leading-5 text-[#787E89]">
            These are example clients. Enter your own client below and choose
            Save Current Client - saved clients replace the examples.
          </p>
        )}

        {profiles.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-3">
            {profiles.map((profile) => {
              const isSelected = profile.id === selectedProfileId;
              const deleting = deletingProfileId === profile.id;
              const segmentLine = [profile.segment, profile.stage]
                .filter(Boolean)
                .join(" | ");

              return (
                <div
                  key={profile.id}
                  className={`relative rounded-md border transition ${
                    isSelected
                      ? "border-brand-orange bg-[#FFF7F2] shadow-sm"
                      : "border-[#E5E0DB] bg-white hover:border-[#D7CABF]"
                  }`}
                >
                  <button
                    type="button"
                    disabled={workflowBusy}
                    onClick={() => onSelectProfile(profile.id)}
                    className="w-full px-4 py-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-brand-charcoal">
                          {profile.name}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[#787E89]">
                          {segmentLine ||
                            (internal ? "Saved audience" : "Saved client")}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#188038]" />
                      )}
                    </div>
                    {profile.focus && (
                      <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-brand-ink">
                        {profile.focus}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {showingExamples && (
                        <span className="rounded-sm bg-[#111111] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white">
                          Example
                        </span>
                      )}
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
                  {!showingExamples && (
                    <button
                      type="button"
                      aria-label={`Remove saved ${subjectNoun} ${profile.name}`}
                      disabled={workflowBusy || deleting}
                      onClick={() => onDeleteProfile(profile.id)}
                      className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md text-[#9AA0A6] transition hover:bg-[#F3F3F3] hover:text-brand-charcoal disabled:opacity-50"
                    >
                      {deleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-md bg-[#F3F3F3] px-3 py-3 text-sm font-semibold text-[#787E89]">
            {internal
              ? "No saved audiences yet. Fill in who the deck is for, the metrics, and the context below, then choose Save Current Audience to reuse them next time."
              : "No saved clients yet. Fill in the client name, metrics, and context below, then choose Save Current Client to reuse them next time."}
          </p>
        )}

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Continuity Context
          </span>
          <Textarea
            value={profileContext}
            disabled={workflowBusy}
            placeholder={
              internal
                ? "Add team goals, initiative status, rollout plans, stakeholders, prior decisions, or product areas this deck should account for."
                : "Add client tools, purchased modules, goals, rollout status, renewal context, stakeholders, or product areas this deck should account for."
            }
            className="min-h-[118px]"
            onChange={(event) => onProfileContextChange(event.target.value)}
          />
          <p className="mt-2 text-xs font-semibold leading-5 text-[#787E89]">
            Saved with the {subjectNoun} profile and used as evidence for what
            the deck says - never as a visual design instruction.
          </p>
        </label>
      </CardContent>
    </Card>
  );
}
