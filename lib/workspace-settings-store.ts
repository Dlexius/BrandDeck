import { z } from "zod";
import {
  readRuntimeJson,
  writeRuntimeJson
} from "@/lib/local-runtime-store";

const WORKSPACE_SETTINGS_FILE = "workspace-settings.json";

/**
 * Workspace-level presentation mode. "client" frames step two around
 * external clients and accounts (the default); "internal" reframes the same
 * intake around the company's own teams - audience profiles instead of
 * client profiles, and no bundled example clients.
 */
export const PRESENTATION_MODES = ["client", "internal"] as const;

/**
 * Which connectors creators see in step two. Live and coming-soon connectors
 * default to visible; NotebookLM defaults off because it currently runs in
 * preview mode with example sources until Enterprise credentials exist.
 */
export const ConnectorSettingsSchema = z.object({
  googleDrive: z.boolean().default(true),
  notebooklm: z.boolean().default(false),
  dropbox: z.boolean().default(true),
  box: z.boolean().default(true),
  salesforce: z.boolean().default(true),
  github: z.boolean().default(true)
});

export const WorkspaceSettingsSchema = z.object({
  presentationMode: z.enum(PRESENTATION_MODES).default("client"),
  connectors: ConnectorSettingsSchema.default({})
});

export type WorkspaceSettings = z.infer<typeof WorkspaceSettingsSchema>;
export type PresentationMode = WorkspaceSettings["presentationMode"];

export function getWorkspaceSettings(): WorkspaceSettings {
  const raw = readRuntimeJson<unknown>(WORKSPACE_SETTINGS_FILE, {});
  const parsed = WorkspaceSettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : WorkspaceSettingsSchema.parse({});
}

export function saveWorkspaceSettings(update: unknown): WorkspaceSettings {
  const current = getWorkspaceSettings();
  const incoming =
    typeof update === "object" && update !== null
      ? (update as Record<string, unknown>)
      : {};
  const settings = WorkspaceSettingsSchema.parse({
    ...current,
    ...incoming,
    // Partial connector updates merge instead of resetting the other toggles.
    connectors: {
      ...current.connectors,
      ...(typeof incoming.connectors === "object" && incoming.connectors !== null
        ? incoming.connectors
        : {})
    }
  });

  writeRuntimeJson(WORKSPACE_SETTINGS_FILE, settings);

  return settings;
}
