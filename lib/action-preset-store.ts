import { z } from "zod";
import {
  readRuntimeJson,
  writeRuntimeJson
} from "@/lib/local-runtime-store";
import type { ActionPresetType } from "@/lib/ui-types";

const ACTION_PRESETS_FILE = "action-presets.json";
const MAX_PRESETS_PER_TYPE = 24;

const presetText = z.string().min(1).max(220);

const CustomActionPresetsSchema = z.object({
  risks: z.array(presetText).max(MAX_PRESETS_PER_TYPE).default([]),
  recommendations: z.array(presetText).max(MAX_PRESETS_PER_TYPE).default([])
});

export type CustomActionPresets = z.infer<typeof CustomActionPresetsSchema>;

function readStore(): CustomActionPresets {
  const raw = readRuntimeJson<unknown>(ACTION_PRESETS_FILE, {});
  const parsed = CustomActionPresetsSchema.safeParse(raw);
  return parsed.success ? parsed.data : CustomActionPresetsSchema.parse({});
}

function normalizePresetText(text: unknown) {
  return presetText.parse(String(text ?? "").replace(/\s+/g, " ").trim());
}

export function listCustomActionPresets() {
  return readStore();
}

export function addCustomActionPreset(type: ActionPresetType, text: unknown) {
  const cleaned = normalizePresetText(text);
  const store = readStore();
  const existing = store[type];

  if (
    !existing.some((entry) => entry.toLowerCase() === cleaned.toLowerCase())
  ) {
    store[type] = [...existing, cleaned].slice(0, MAX_PRESETS_PER_TYPE);
    writeRuntimeJson(ACTION_PRESETS_FILE, store);
  }

  return store;
}

export function removeCustomActionPreset(type: ActionPresetType, text: unknown) {
  const cleaned = String(text ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  const store = readStore();

  store[type] = store[type].filter(
    (entry) => entry.toLowerCase() !== cleaned
  );
  writeRuntimeJson(ACTION_PRESETS_FILE, store);

  return store;
}
