import type { SourceDocument } from "@/lib/deck-plan-schema";

/**
 * NotebookLM Enterprise connector (typed scaffold).
 *
 * Target API surface (NotebookLM Enterprise, Google Cloud Agentspace):
 *   - notebooks.sources.batchCreate / uploadFile to register sources
 *   - notebook query returning grounded answers with citations
 *
 * The integration follows the Google Drive connector pattern: NotebookLM
 * answers and cited passages become bounded SourceDocuments in the context
 * pack - planner evidence only, never renderer instructions. Wiring requires
 * NotebookLM Enterprise credentials (service account + project + location);
 * until they are configured this adapter reports itself unconfigured and
 * every call fails closed.
 */

export type NotebookLmConfig = {
  projectId: string;
  location: string;
  notebookId: string;
  /** Path to a service-account JSON or ADC is used when omitted. */
  credentialsFile?: string;
};

export type NotebookLmCitation = {
  sourceId: string;
  sourceTitle: string;
  snippet: string;
};

export type NotebookLmQueryResult = {
  answer: string;
  citations: NotebookLmCitation[];
  /** Bounded documents ready for the governed context pack. */
  sourceDocuments: SourceDocument[];
};

export function notebookLmConfigFromEnv(): NotebookLmConfig | null {
  const projectId = process.env.NOTEBOOKLM_PROJECT_ID;
  const location = process.env.NOTEBOOKLM_LOCATION;
  const notebookId = process.env.NOTEBOOKLM_NOTEBOOK_ID;

  if (!projectId || !location || !notebookId) {
    return null;
  }

  return {
    projectId,
    location,
    notebookId,
    credentialsFile: process.env.GOOGLE_APPLICATION_CREDENTIALS
  };
}

export function notebookLmStatus() {
  const config = notebookLmConfigFromEnv();

  return {
    configured: Boolean(config),
    detail: config
      ? `NotebookLM Enterprise configured for notebook ${config.notebookId}.`
      : "Set NOTEBOOKLM_PROJECT_ID, NOTEBOOKLM_LOCATION, and NOTEBOOKLM_NOTEBOOK_ID (plus service-account credentials) to enable the connector."
  };
}

export async function queryNotebookLm(): Promise<NotebookLmQueryResult> {
  throw new Error(
    "NotebookLM Enterprise connector is a typed scaffold. Add NotebookLM Enterprise credentials and the API wiring before querying notebooks."
  );
}

export async function uploadSourceToNotebookLm(): Promise<never> {
  throw new Error(
    "NotebookLM Enterprise connector is a typed scaffold. Source upload (sources.batchCreate / uploadFile) activates once credentials are configured."
  );
}
