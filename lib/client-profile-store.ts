import { z } from "zod";
import {
  readRuntimeJson,
  writeRuntimeJson
} from "@/lib/local-runtime-store";

const CLIENT_PROFILES_FILE = "client-profiles.json";
const CLIENT_PROFILE_LIMIT = 24;

const snapshotText = z.string().max(500).default("");

const WorkflowMetricSchema = z.object({
  label: z.string().max(60),
  count: z.string().max(24)
});

const SavedSnapshotSchema = z.object({
  client_name: snapshotText,
  report_period: snapshotText,
  previous_report_period: snapshotText,
  active_users: snapshotText,
  licensed_users: snapshotText,
  adoption_score: snapshotText,
  previous_active_users: snapshotText,
  previous_adoption_score: snapshotText,
  projects_active: snapshotText,
  mobile_usage_rate: snapshotText,
  previous_mobile_usage_rate: snapshotText,
  workflow_metrics: z.array(WorkflowMetricSchema).max(32).default([]),
  top_feature: snapshotText,
  lowest_feature: snapshotText,
  risk_summary: snapshotText,
  recommendation_1: snapshotText,
  recommendation_2: snapshotText,
  recommendation_3: snapshotText
});

export const SavedClientProfileSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  segment: z.string().max(120).default(""),
  stage: z.string().max(120).default(""),
  tools: z.array(z.string().min(1).max(80)).max(12).default([]),
  focus: z.string().max(260).default(""),
  snapshot: SavedSnapshotSchema,
  context: z.string().max(8000).default(""),
  updatedAt: z.string().max(80).optional()
});

export type SavedClientProfile = z.infer<typeof SavedClientProfileSchema>;

function readStore(): SavedClientProfile[] {
  const raw = readRuntimeJson<unknown>(CLIENT_PROFILES_FILE, []);
  const parsed = z.array(SavedClientProfileSchema).safeParse(raw);
  return parsed.success ? parsed.data : [];
}

export function listClientProfiles() {
  return readStore();
}

/** Upsert by id: re-saving a client updates its snapshot and context. */
export function saveClientProfile(profile: unknown) {
  const parsed = SavedClientProfileSchema.parse(profile);
  const saved: SavedClientProfile = {
    ...parsed,
    updatedAt: new Date().toISOString()
  };
  const others = readStore().filter((entry) => entry.id !== saved.id);
  const profiles = [saved, ...others].slice(0, CLIENT_PROFILE_LIMIT);

  writeRuntimeJson(CLIENT_PROFILES_FILE, profiles);

  return { profile: saved, profiles };
}

export function deleteClientProfile(profileId: string) {
  const profiles = readStore().filter((entry) => entry.id !== profileId);

  writeRuntimeJson(CLIENT_PROFILES_FILE, profiles);

  return profiles;
}
