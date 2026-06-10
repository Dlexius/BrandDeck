"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ApprovedLayoutId, BrandContract } from "@/lib/deck-plan-schema";
import {
  LAYOUT_TEXT_FIELD_OPTIONS,
  type TemplateTextFieldOption
} from "@/lib/template-binding-catalog";
import type {
  TemplateGovernanceReport,
  TemplateKitSummary,
  TemplateTextFieldSlide,
  TemplateTextFieldTargetDraft
} from "@/lib/ui-types";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  MapPin,
  Wand2,
  X
} from "lucide-react";

function selectionKey(slide: TemplateTextFieldSlide, dataBinding: string) {
  return `${slide.layoutId}:${slide.sourceSlide}:${dataBinding}`;
}

function catalogForLayout(layoutId: string): TemplateTextFieldOption[] {
  return LAYOUT_TEXT_FIELD_OPTIONS[layoutId as ApprovedLayoutId] ?? [];
}

/**
 * Guided alternative to the mapping-file import: walks the admin through
 * every mapped template slide, shows the real text boxes found on it, and
 * lets them connect each content field with a dropdown. Saving feeds the
 * same governed import path as the JSON file.
 */
export function TextFieldMappingWalkthrough({
  templateKit,
  governance,
  brandContract,
  textFieldSlides,
  loadingTextFields,
  savingMapping,
  onLoadTextFields,
  onSaveMapping
}: {
  templateKit: TemplateKitSummary | null;
  governance: TemplateGovernanceReport | null;
  brandContract: BrandContract;
  textFieldSlides: TemplateTextFieldSlide[] | null;
  loadingTextFields: boolean;
  savingMapping: boolean;
  onLoadTextFields: () => void;
  onSaveMapping: (targets: TemplateTextFieldTargetDraft[]) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [prefilledFingerprint, setPrefilledFingerprint] = useState("");

  const layoutNames = useMemo(() => {
    const names: Record<string, string> = {};
    brandContract.approved_layouts.forEach((layout) => {
      names[layout.layout_id] = layout.name;
    });
    return names;
  }, [brandContract]);

  const slides = useMemo(
    () =>
      (textFieldSlides ?? []).filter(
        (slide) => catalogForLayout(slide.layoutId).length > 0
      ),
    [textFieldSlides]
  );

  // Prefill from the current governed mapping once per template, so the
  // walkthrough edits the active mapping instead of starting from zero.
  useEffect(() => {
    if (!templateKit || !textFieldSlides || !governance) {
      return;
    }

    if (prefilledFingerprint === templateKit.fingerprint) {
      return;
    }

    const next: Record<string, string> = {};

    slides.forEach((slide) => {
      const governanceSlide = governance.outputSlides.find(
        (entry) =>
          entry.layoutId === slide.layoutId &&
          entry.sourceSlide === slide.sourceSlide
      );

      catalogForLayout(slide.layoutId).forEach((field) => {
        const existing = governanceSlide?.targets.find(
          (target) => target.dataBinding === field.dataBinding
        );
        const stillExists =
          existing &&
          slide.objects.some((object) => object.objectId === existing.objectId);

        if (stillExists) {
          next[selectionKey(slide, field.dataBinding)] = existing.objectId;
        }
      });
    });

    setSelections(next);
    setPrefilledFingerprint(templateKit.fingerprint);
    setStepIndex(0);
  }, [templateKit, textFieldSlides, governance, slides, prefilledFingerprint]);

  if (!templateKit) {
    return null;
  }

  const readySlideCount = governance?.summary.readySlideCount ?? 0;
  const outputSlideCount = governance?.summary.outputSlideCount ?? 0;
  const mappedFieldCount = Object.values(selections).filter(Boolean).length;
  const reviewStep = stepIndex >= slides.length;
  const activeSlide = reviewStep ? null : slides[stepIndex];

  function fieldsMappedOnSlide(slide: TemplateTextFieldSlide) {
    return catalogForLayout(slide.layoutId).filter(
      (field) => selections[selectionKey(slide, field.dataBinding)]
    ).length;
  }

  function buildTargets(): TemplateTextFieldTargetDraft[] {
    const targets: TemplateTextFieldTargetDraft[] = [];

    slides.forEach((slide) => {
      const catalog = catalogForLayout(slide.layoutId);
      const catalogBindings = new Set(catalog.map((field) => field.dataBinding));

      catalog.forEach((field) => {
        const objectId = selections[selectionKey(slide, field.dataBinding)];

        if (!objectId) {
          return;
        }

        targets.push({
          layoutId: slide.layoutId,
          sourceSlide: slide.sourceSlide,
          objectId,
          objectType: field.objectType,
          role: field.label,
          dataBinding: field.dataBinding,
          required: field.core
        });
      });

      // Keep advanced mappings (for example KPI variants imported from a
      // mapping file) that the walkthrough does not manage.
      const governanceSlide = governance?.outputSlides.find(
        (entry) =>
          entry.layoutId === slide.layoutId &&
          entry.sourceSlide === slide.sourceSlide
      );
      governanceSlide?.targets
        .filter((target) => !catalogBindings.has(target.dataBinding))
        .forEach((target) => {
          targets.push({
            layoutId: slide.layoutId,
            sourceSlide: slide.sourceSlide,
            objectId: target.objectId,
            objectType:
              target.objectType === "table_cell" ||
              target.objectType === "slide_chrome"
                ? target.objectType
                : "text_box",
            role: target.role,
            dataBinding: target.dataBinding,
            required: target.required
          });
        });
    });

    return targets;
  }

  async function handleSave() {
    const saved = await onSaveMapping(buildTargets());

    if (saved) {
      setOpen(false);
      setStepIndex(0);
    }
  }

  if (!open) {
    return (
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              Text Field Mapping
            </h2>
            <p className="mt-1 text-sm text-[#787E89]">
              Connect each template slide&apos;s text boxes to the content
              BrandDeck writes - one slide at a time, no mapping file needed.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {governance && (
              <div className="flex items-center gap-2 rounded-md bg-[#F3F3F3] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-ink">
                <MapPin className="h-3.5 w-3.5 text-brand-orange" />
                {readySlideCount}/{outputSlideCount} slides ready
              </div>
            )}
            <Button
              className="h-9 shrink-0 whitespace-nowrap px-3"
              disabled={loadingTextFields}
              onClick={() => {
                setOpen(true);
                setStepIndex(0);
                if (!textFieldSlides) {
                  onLoadTextFields();
                }
              }}
            >
              {loadingTextFields ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {readySlideCount > 0 ? "Review Mapping" : "Start Mapping"}
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Text Field Mapping
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            {reviewStep
              ? "Review the mapping, then save it for this template."
              : `Slide ${stepIndex + 1} of ${slides.length}`}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close mapping walkthrough"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[#787E89] transition hover:bg-[#F3F3F3] hover:text-brand-charcoal"
          onClick={() => setOpen(false)}
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent>
        {loadingTextFields ? (
          <div className="flex items-center gap-3 py-8 text-sm font-semibold text-[#787E89]">
            <Loader2 className="h-4 w-4 animate-spin text-brand-orange" />
            Reading text boxes from the template…
          </div>
        ) : !textFieldSlides ? (
          <div className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm font-semibold text-[#787E89]">
              The template&apos;s text boxes could not be read.
            </p>
            <Button
              variant="secondary"
              className="h-9 px-3"
              onClick={onLoadTextFields}
            >
              Try Again
            </Button>
          </div>
        ) : slides.length === 0 ? (
          <p className="py-6 text-sm font-semibold text-[#787E89]">
            No mapped template slides found. Map approved layouts to source
            slides under Templates first.
          </p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {slides.map((slide, index) => {
                const mapped = fieldsMappedOnSlide(slide);

                return (
                  <button
                    key={`${slide.layoutId}-${slide.sourceSlide}`}
                    type="button"
                    title={layoutNames[slide.layoutId] ?? slide.layoutId}
                    onClick={() => setStepIndex(index)}
                    className={`h-2.5 w-8 rounded-full transition ${
                      index === stepIndex && !reviewStep
                        ? "bg-brand-orange"
                        : mapped > 0
                          ? "bg-[#188038]/60"
                          : "bg-[#E5E0DB]"
                    }`}
                  />
                );
              })}
              <button
                type="button"
                title="Review and save"
                onClick={() => setStepIndex(slides.length)}
                className={`h-2.5 w-8 rounded-full transition ${
                  reviewStep ? "bg-brand-orange" : "bg-[#E5E0DB]"
                }`}
              />
            </div>

            {activeSlide && (
              <div>
                <div className="flex flex-col gap-1 rounded-md bg-[#F3F3F3] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-brand-charcoal">
                      {layoutNames[activeSlide.layoutId] ?? activeSlide.layoutId}
                    </p>
                    <p className="text-xs font-semibold capitalize text-[#787E89]">
                      {activeSlide.narrativeRole}
                    </p>
                  </div>
                  <p className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                    Template slide{" "}
                    {String(activeSlide.sourceSlide).padStart(3, "0")} ·{" "}
                    {activeSlide.objects.length} text object
                    {activeSlide.objects.length === 1 ? "" : "s"}
                  </p>
                </div>

                {activeSlide.objects.length === 0 ? (
                  <p className="mt-4 text-sm font-semibold text-[#787E89]">
                    No text boxes were found on this template slide. Pick a
                    different source slide for this layout under Templates,
                    then come back.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {catalogForLayout(activeSlide.layoutId).map((field) => {
                      const key = selectionKey(activeSlide, field.dataBinding);
                      const selected = selections[key] ?? "";
                      const usedElsewhere = new Set(
                        catalogForLayout(activeSlide.layoutId)
                          .filter(
                            (other) => other.dataBinding !== field.dataBinding
                          )
                          .map(
                            (other) =>
                              selections[
                                selectionKey(activeSlide, other.dataBinding)
                              ]
                          )
                          .filter(Boolean)
                      );
                      const candidates = activeSlide.objects.filter((object) =>
                        field.objectType === "table_cell"
                          ? object.objectType === "table_cell"
                          : object.objectType === "text_box"
                      );

                      return (
                        <div
                          key={field.dataBinding}
                          className="grid gap-2 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:items-start"
                        >
                          <div>
                            <p className="flex items-center gap-2 text-sm font-bold text-brand-charcoal">
                              {field.label}
                              {field.core && (
                                <span className="rounded-sm bg-[#FFF1E8] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#6B2A00]">
                                  Core
                                </span>
                              )}
                            </p>
                            <p className="mt-0.5 text-[11px] font-semibold leading-4 text-[#787E89]">
                              {field.hint}
                            </p>
                          </div>
                          <select
                            value={selected}
                            onChange={(event) =>
                              setSelections((current) => ({
                                ...current,
                                [key]: event.currentTarget.value
                              }))
                            }
                            className="h-9 w-full rounded-sm border border-[#D7CABF] bg-white px-2 text-xs font-semibold text-brand-charcoal outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                          >
                            <option value="">Not filled by BrandDeck</option>
                            {candidates.map((object) => (
                              <option
                                key={object.objectId}
                                value={object.objectId}
                                disabled={
                                  object.objectId !== selected &&
                                  usedElsewhere.has(object.objectId)
                                }
                              >
                                {`${object.objectType === "table_cell" ? "Table" : "Text box"} ${object.objectId}${
                                  object.textPreview
                                    ? ` · "${object.textPreview.slice(0, 60)}"`
                                    : object.objectName
                                      ? ` · ${object.objectName.slice(0, 40)}`
                                      : ""
                                }${
                                  object.objectId !== selected &&
                                  usedElsewhere.has(object.objectId)
                                    ? " (already used)"
                                    : ""
                                }`}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {reviewStep && (
              <div>
                <p className="text-sm font-semibold text-[#787E89]">
                  {mappedFieldCount} text field
                  {mappedFieldCount === 1 ? "" : "s"} connected across{" "}
                  {slides.filter((slide) => fieldsMappedOnSlide(slide) > 0).length}{" "}
                  slide
                  {slides.filter((slide) => fieldsMappedOnSlide(slide) > 0)
                    .length === 1
                    ? ""
                    : "s"}
                  . Saving locks this mapping to the current template.
                </p>
                <div className="mt-3 overflow-hidden rounded-md ring-1 ring-[#EFEAE5]">
                  {slides.map((slide) => {
                    const mapped = fieldsMappedOnSlide(slide);

                    return (
                      <div
                        key={`${slide.layoutId}-${slide.sourceSlide}`}
                        className="flex items-center justify-between gap-3 border-b border-[#EFEAE5] bg-white px-4 py-2.5 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-brand-charcoal">
                            {layoutNames[slide.layoutId] ?? slide.layoutId}
                          </p>
                          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                            Template slide {String(slide.sourceSlide).padStart(3, "0")}
                          </p>
                        </div>
                        <span
                          className={`flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] ${
                            mapped > 0 ? "text-[#188038]" : "text-[#787E89]"
                          }`}
                        >
                          {mapped > 0 && <CheckCircle2 className="h-3.5 w-3.5" />}
                          {mapped} field{mapped === 1 ? "" : "s"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between border-t border-[#E5E0DB] pt-4">
              <Button
                variant="secondary"
                className="h-9 px-3"
                disabled={stepIndex === 0}
                onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              {reviewStep ? (
                <Button
                  className="h-9 px-4"
                  disabled={savingMapping || mappedFieldCount === 0}
                  onClick={handleSave}
                >
                  {savingMapping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Save Mapping
                </Button>
              ) : (
                <Button
                  className="h-9 px-4"
                  onClick={() =>
                    setStepIndex((index) => Math.min(slides.length, index + 1))
                  }
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
