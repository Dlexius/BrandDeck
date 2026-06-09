import type { BusinessMetricSnapshot } from "@/lib/context-pack-schema";

export type PowerBiWorkspaceRef = {
  workspaceId: string;
  workspaceName?: string;
};

export type PowerBiDatasetRef = {
  datasetId: string;
  datasetName?: string;
  workspaceId: string;
};

export type PowerBiQueryPack = {
  id: string;
  name: string;
  workspace: PowerBiWorkspaceRef;
  dataset: PowerBiDatasetRef;
  metricKeys: string[];
};

export type PowerBiMetricExtractionResult = {
  queryPack: PowerBiQueryPack;
  snapshots: BusinessMetricSnapshot[];
  sourceRefs: string[];
};

export async function extractPowerBiMetricSnapshots(): Promise<PowerBiMetricExtractionResult> {
  throw new Error(
    "Power BI connector is a typed integration stub. OAuth, dataset selection, and query execution are intentionally out of scope for this release."
  );
}
