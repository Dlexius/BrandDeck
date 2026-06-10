"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SourceDocumentSummary } from "@/lib/ui-types";
import { Lock, Upload } from "lucide-react";

export function SourcePackPanel({
  sourceDocuments,
  sourceNotes,
  ingestingSources,
  onSourceUpload,
  onSourceNotesChange,
  onClearSources
}: {
  sourceDocuments: SourceDocumentSummary[];
  sourceNotes: string;
  ingestingSources: boolean;
  onSourceUpload: (files: FileList | null) => void;
  onSourceNotesChange: (value: string) => void;
  onClearSources: () => void;
}) {
  const attachedCount = sourceDocuments.length + (sourceNotes.trim() ? 1 : 0);
  const totalCharacters =
    sourceDocuments.reduce((sum, document) => sum + document.characters, 0) +
    sourceNotes.trim().length;

  return (
    <Card>
      <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Manual Context
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Add one-off notes or files that should shape claims, risks, and
            recommendations.
          </p>
        </div>
        <div className="rounded-sm bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-ink ring-1 ring-[#EFEAE5]">
          {attachedCount} context source{attachedCount === 1 ? "" : "s"}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-md bg-[#F3F3F3] p-4 ring-1 ring-[#EFEAE5]">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
                Upload Docs
              </span>
              <Input
                type="file"
                multiple
                accept=".txt,.md,.markdown,.text,text/plain,text/markdown"
                disabled={ingestingSources}
                onChange={(event) => onSourceUpload(event.currentTarget.files)}
              />
            </label>
            <p className="mt-3 text-xs font-semibold leading-5 text-[#787E89]">
              Useful for meeting notes, briefs, transcripts, and source excerpts
              that are not yet connected.
            </p>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              Context Notes
            </span>
            <Textarea
              value={sourceNotes}
              maxLength={4000}
              onChange={(event) => onSourceNotesChange(event.target.value)}
              placeholder="Paste meeting notes, audience priorities, implementation context, or excerpts the deck should cite."
              className="min-h-[138px]"
            />
            <div className="mt-2 flex items-center justify-between text-xs font-medium text-[#787E89]">
              <span>
                {totalCharacters.toLocaleString()} characters available
              </span>
              <span>{sourceNotes.length} / 4000</span>
            </div>
          </label>
        </div>

        <div className="flex items-start gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold leading-5 text-[#787E89] ring-1 ring-[#EFEAE5]">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-orange" />
          <span>
            Context shapes deck claims only. Layouts, colors, fonts, and assets
            stay locked to the active brand contract.
          </span>
        </div>

        <div className="border-t border-[#E5E0DB] pt-3">
          {sourceDocuments.length === 0 ? (
            <div className="rounded-md border border-dashed border-[#D7CABF] px-3 py-4 text-center text-sm font-medium text-[#787E89]">
              No docs uploaded yet. Notes can still be used as source context.
            </div>
          ) : (
            <div className="space-y-2">
              {sourceDocuments.map((document) => (
                <div
                  key={document.id}
                  className="grid gap-3 rounded-md bg-white px-3 py-2 ring-1 ring-[#EFEAE5] md:grid-cols-[minmax(0,1fr)_100px]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-brand-charcoal">
                      {document.name}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-[#787E89]">
                      {document.type} context for slide-level evidence refs
                    </p>
                  </div>
                  <p className="self-center text-right font-mono text-xs font-bold text-brand-ink">
                    {document.characters.toLocaleString()} chars
                  </p>
                </div>
              ))}
            </div>
          )}
          {(sourceDocuments.length > 0 || sourceNotes.trim()) && (
            <Button
              variant="secondary"
              className="mt-3 h-9 px-3"
              onClick={onClearSources}
            >
              Clear Source Context
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
