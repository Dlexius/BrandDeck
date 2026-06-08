import crypto from "node:crypto";
import { z } from "zod";
import {
  APPROVED_LAYOUT_IDS,
  type ApprovedLayoutId
} from "@/lib/deck-plan-schema";
import {
  readRuntimeJson,
  writeRuntimeJson
} from "@/lib/local-runtime-store";
import type { TemplateEditTarget } from "@/lib/template-edit-manifest";
import type { TemplateKit } from "@/lib/template-kit-store";

const OBJECT_BINDINGS_FILE = "template-object-bindings.json";

export const BUILT_IN_BINDING_TEMPLATE_FINGERPRINTS = new Set([
  "164a8abe4f05a52d587e40bf097f58407c7c20baeb4b18fc1ab6bbe773069d83"
]);

const ObjectBindingTargetSchema = z.object({
  layoutId: z.enum(APPROVED_LAYOUT_IDS),
  sourceSlide: z.number().int().min(1).max(9999),
  objectId: z.string().min(1).max(80),
  objectType: z.enum(["text_box", "table_cell", "slide_chrome"]),
  role: z.string().min(1).max(120),
  dataBinding: z.string().min(1).max(120),
  required: z.boolean()
});

const ObjectBindingSetSchema = z.object({
  schema: z.literal("branddeck.template-object-bindings/v1"),
  templateKitId: z.string().min(1),
  templateFingerprint: z.string().min(16),
  source: z.enum(["admin_import"]),
  importedAt: z.string().min(1),
  importedBy: z.string().min(1).max(80),
  bindingFingerprint: z.string().min(16),
  targets: z.array(ObjectBindingTargetSchema).min(1).max(400)
});

const ObjectBindingStoreSchema = z.record(ObjectBindingSetSchema);

export type TemplateObjectBindingSet = z.infer<typeof ObjectBindingSetSchema>;

function bindingFingerprint(targets: TemplateEditTarget[]) {
  const canonical = targets
    .map((target) => ({
      layoutId: target.layoutId,
      sourceSlide: target.sourceSlide,
      objectId: target.objectId,
      objectType: target.objectType,
      role: target.role,
      dataBinding: target.dataBinding,
      required: target.required
    }))
    .sort((a, b) =>
      `${a.layoutId}:${a.sourceSlide}:${a.objectId}:${a.dataBinding}`.localeCompare(
        `${b.layoutId}:${b.sourceSlide}:${b.objectId}:${b.dataBinding}`
      )
    );

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(canonical))
    .digest("hex");
}

function readStore() {
  const raw = readRuntimeJson<Record<string, unknown>>(OBJECT_BINDINGS_FILE, {});
  const parsed = ObjectBindingStoreSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}

function writeStore(store: Record<string, TemplateObjectBindingSet>) {
  writeRuntimeJson(OBJECT_BINDINGS_FILE, store);
}

export function normalizeTemplateEditTargets(
  targets: unknown
): TemplateEditTarget[] {
  const parsed = z.array(ObjectBindingTargetSchema).min(1).max(400).parse(targets);
  const seen = new Set<string>();

  return parsed.filter((target) => {
    const key = `${target.layoutId}:${target.sourceSlide}:${target.objectId}:${target.dataBinding}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function extractTargetsFromObjectMapPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Object map payload must be a JSON object.");
  }

  const record = payload as Record<string, unknown>;

  if (Array.isArray(record.targets)) {
    return normalizeTemplateEditTargets(record.targets);
  }

  if (Array.isArray(record.objectBindings)) {
    const targets = record.objectBindings.flatMap((binding) => {
      if (!binding || typeof binding !== "object") {
        return [];
      }

      const bindingRecord = binding as Record<string, unknown>;
      const layoutId = bindingRecord.layoutId;
      const sourceSlide = bindingRecord.sourceSlide;

      if (
        typeof layoutId !== "string" ||
        !APPROVED_LAYOUT_IDS.includes(layoutId as ApprovedLayoutId) ||
        typeof sourceSlide !== "number" ||
        !Array.isArray(bindingRecord.targets)
      ) {
        return [];
      }

      return bindingRecord.targets.map((target) => ({
        ...(target as Record<string, unknown>),
        layoutId,
        sourceSlide
      }));
    });

    return normalizeTemplateEditTargets(targets);
  }

  throw new Error(
    "Object map must include either a targets array or exported objectBindings."
  );
}

export function assertObjectMapMatchesTemplate(payload: unknown, kit: TemplateKit) {
  if (!payload || typeof payload !== "object") {
    return;
  }

  const record = payload as Record<string, unknown>;
  const template = record.template;

  if (!template || typeof template !== "object") {
    return;
  }

  const fingerprint = (template as Record<string, unknown>).fingerprint;

  if (typeof fingerprint === "string" && fingerprint !== kit.fingerprint) {
    throw new Error(
      "Object map fingerprint does not match the active template kit."
    );
  }
}

export function saveTemplateObjectBindingSet({
  kit,
  targets,
  importedBy = "Local brand admin"
}: {
  kit: TemplateKit;
  targets: TemplateEditTarget[];
  importedBy?: string;
}) {
  const normalizedTargets = normalizeTemplateEditTargets(targets);
  const store = readStore();
  const bindingSet: TemplateObjectBindingSet = {
    schema: "branddeck.template-object-bindings/v1",
    templateKitId: kit.id,
    templateFingerprint: kit.fingerprint,
    source: "admin_import",
    importedAt: new Date().toISOString(),
    importedBy,
    bindingFingerprint: bindingFingerprint(normalizedTargets),
    targets: normalizedTargets
  };

  store[kit.id] = bindingSet;
  writeStore(store);

  return bindingSet;
}

export function getTemplateObjectBindingSet(kit: TemplateKit) {
  const bindingSet = readStore()[kit.id];

  if (!bindingSet || bindingSet.templateFingerprint !== kit.fingerprint) {
    return null;
  }

  return bindingSet;
}

export function deleteTemplateObjectBindingSet(kit: TemplateKit) {
  const store = readStore();
  delete store[kit.id];
  writeStore(store);
}

export function templateObjectBindingSource(kit: TemplateKit) {
  const bindingSet = getTemplateObjectBindingSet(kit);

  if (bindingSet) {
    return {
      source: "admin_import" as const,
      fingerprint: bindingSet.bindingFingerprint,
      updatedAt: bindingSet.importedAt,
      targetCount: bindingSet.targets.length
    };
  }

  if (BUILT_IN_BINDING_TEMPLATE_FINGERPRINTS.has(kit.fingerprint)) {
    return {
      source: "built_in_procore" as const,
      fingerprint: "built-in-procore-2025",
      updatedAt: undefined,
      targetCount: 0
    };
  }

  return {
    source: "none" as const,
    fingerprint: "",
    updatedAt: undefined,
    targetCount: 0
  };
}
