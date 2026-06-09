import crypto from "node:crypto";
import { readRuntimeJson, writeRuntimeJson } from "@/lib/local-runtime-store";
import {
  MAX_SOURCE_DOCUMENT_CHARS,
  type SourceDocument
} from "@/lib/deck-plan-schema";

const GOOGLE_TOKEN_FILE = "google-drive-token.json";
const GOOGLE_OAUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";

const DEFAULT_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

const GOOGLE_MIME_TYPES = {
  document: "application/vnd.google-apps.document",
  spreadsheet: "application/vnd.google-apps.spreadsheet",
  presentation: "application/vnd.google-apps.presentation"
} as const;

export type GoogleWorkspaceFileType =
  | "all"
  | "document"
  | "spreadsheet"
  | "presentation";

type GoogleDriveToken = {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date: number;
  connectedAt: string;
  updatedAt: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export type GoogleDriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
  iconLink?: string;
  capabilities?: {
    canDownload?: boolean;
  };
};

export type GoogleDriveSearchResult = {
  id: string;
  name: string;
  mimeType: string;
  typeLabel: "Google Doc" | "Google Sheet" | "Google Slides";
  webViewLink?: string;
  modifiedTime?: string;
};

export type GoogleDriveImportedDocument = SourceDocument & {
  characters: number;
  source: "google_drive";
  driveFileId: string;
  mimeType: string;
  webViewLink?: string;
};

export function getGoogleDriveConfig(requestUrl?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    (requestUrl
      ? new URL("/api/connectors/google-drive/callback", requestUrl).toString()
      : "");
  const scopes = (process.env.GOOGLE_DRIVE_SCOPES ?? DEFAULT_SCOPES.join(" "))
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes,
    configured: Boolean(clientId && clientSecret && redirectUri)
  };
}

export function createGoogleDriveAuthRequest(requestUrl: string) {
  const config = getGoogleDriveConfig(requestUrl);

  if (!config.configured) {
    throw new Error(
      "Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to enable Google Drive."
    );
  }

  const state = crypto.randomBytes(24).toString("hex");
  const url = new URL(GOOGLE_OAUTH_ENDPOINT);

  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes.join(" "));
  url.searchParams.set("access_type", "offline");
  // Keep BrandDeck's connector consent least-privilege. Reusing already granted
  // scopes can make Google bundle unrelated Meridi permissions into this flow.
  url.searchParams.set("include_granted_scopes", "false");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  return { state, url };
}

function readGoogleDriveToken() {
  return readRuntimeJson<GoogleDriveToken | null>(GOOGLE_TOKEN_FILE, null);
}

function writeGoogleDriveToken(token: GoogleDriveToken | null) {
  writeRuntimeJson(GOOGLE_TOKEN_FILE, token);
}

export function clearGoogleDriveToken() {
  writeGoogleDriveToken(null);
}

export function getGoogleDriveConnectionStatus(requestUrl?: string) {
  const config = getGoogleDriveConfig(requestUrl);
  const token = readGoogleDriveToken();

  return {
    configured: config.configured,
    connected: Boolean(token?.refresh_token || token?.access_token),
    scopes: config.scopes,
    redirectUri: config.redirectUri,
    connectedAt: token?.connectedAt,
    updatedAt: token?.updatedAt,
    expiresAt: token?.expiry_date ? new Date(token.expiry_date).toISOString() : null
  };
}

async function readTokenResponse(
  response: Response
): Promise<GoogleTokenResponse & { access_token: string }> {
  const result = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || result.error || !result.access_token) {
    throw new Error(
      result.error_description ||
        result.error ||
        "Google authorization failed."
    );
  }

  return {
    ...result,
    access_token: result.access_token
  };
}

export async function exchangeGoogleDriveCode(code: string, requestUrl: string) {
  const config = getGoogleDriveConfig(requestUrl);

  if (!config.configured) {
    throw new Error("Google Drive is not configured.");
  }

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code"
    })
  });
  const result = await readTokenResponse(response);
  const now = Date.now();
  const priorToken = readGoogleDriveToken();
  const token: GoogleDriveToken = {
    access_token: result.access_token,
    refresh_token: result.refresh_token ?? priorToken?.refresh_token,
    scope: result.scope,
    token_type: result.token_type,
    expiry_date: now + (result.expires_in ?? 3600) * 1000,
    connectedAt: priorToken?.connectedAt ?? new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString()
  };

  writeGoogleDriveToken(token);
  return token;
}

async function refreshGoogleDriveToken(token: GoogleDriveToken, requestUrl?: string) {
  if (!token.refresh_token) {
    throw new Error("Reconnect Google Drive to refresh access.");
  }

  const config = getGoogleDriveConfig(requestUrl);
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      refresh_token: token.refresh_token,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token"
    })
  });
  const result = await readTokenResponse(response);
  const now = Date.now();
  const refreshed: GoogleDriveToken = {
    ...token,
    access_token: result.access_token,
    scope: result.scope ?? token.scope,
    token_type: result.token_type ?? token.token_type,
    expiry_date: now + (result.expires_in ?? 3600) * 1000,
    updatedAt: new Date(now).toISOString()
  };

  writeGoogleDriveToken(refreshed);
  return refreshed;
}

async function getGoogleDriveAccessToken(requestUrl?: string) {
  const config = getGoogleDriveConfig(requestUrl);

  if (!config.configured) {
    throw new Error("Google Drive is not configured.");
  }

  const token = readGoogleDriveToken();

  if (!token?.access_token) {
    throw new Error("Connect Google Drive before searching files.");
  }

  if (token.expiry_date > Date.now() + 60_000) {
    return token.access_token;
  }

  const refreshed = await refreshGoogleDriveToken(token, requestUrl);
  return refreshed.access_token;
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function googleWorkspaceFilter(fileType: GoogleWorkspaceFileType = "all") {
  if (fileType !== "all") {
    return `mimeType='${GOOGLE_MIME_TYPES[fileType]}'`;
  }

  return [
    `mimeType='${GOOGLE_MIME_TYPES.document}'`,
    `mimeType='${GOOGLE_MIME_TYPES.spreadsheet}'`,
    `mimeType='${GOOGLE_MIME_TYPES.presentation}'`
  ].join(" or ");
}

function typeLabelForMime(mimeType: string): GoogleDriveSearchResult["typeLabel"] {
  if (mimeType === GOOGLE_MIME_TYPES.spreadsheet) {
    return "Google Sheet";
  }

  if (mimeType === GOOGLE_MIME_TYPES.presentation) {
    return "Google Slides";
  }

  return "Google Doc";
}

async function googleDriveRequest<T>(
  pathName: string,
  requestUrl: string,
  searchParams?: URLSearchParams
) {
  const token = await getGoogleDriveAccessToken(requestUrl);
  const url = new URL(`${GOOGLE_DRIVE_API}/${pathName}`);

  if (searchParams) {
    searchParams.forEach((value, key) => url.searchParams.set(key, value));
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      detail ? `Google Drive request failed: ${detail}` : "Google Drive request failed."
    );
  }

  return (await response.json()) as T;
}

async function exportGoogleDriveText(
  fileId: string,
  mimeType: string,
  requestUrl: string
) {
  const token = await getGoogleDriveAccessToken(requestUrl);
  const exportMimeType =
    mimeType === GOOGLE_MIME_TYPES.spreadsheet ? "text/csv" : "text/plain";
  const url = new URL(`${GOOGLE_DRIVE_API}/files/${fileId}/export`);

  url.searchParams.set("mimeType", exportMimeType);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      detail ? `Google Drive export failed: ${detail}` : "Google Drive export failed."
    );
  }

  return response.text();
}

export async function searchGoogleDriveFiles(
  query: string,
  requestUrl: string,
  fileType: GoogleWorkspaceFileType = "all"
) {
  const trimmedQuery = query.trim().slice(0, 120);
  const clauses = [`trashed=false`, `(${googleWorkspaceFilter(fileType)})`];

  if (trimmedQuery) {
    const escaped = escapeDriveQueryValue(trimmedQuery);
    clauses.push(`(name contains '${escaped}' or fullText contains '${escaped}')`);
  }

  const searchParams = new URLSearchParams({
    q: clauses.join(" and "),
    pageSize: "12",
    orderBy: "modifiedTime desc",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    fields:
      "nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink,iconLink)"
  });
  const result = await googleDriveRequest<{
    files?: GoogleDriveFile[];
    nextPageToken?: string;
  }>("files", requestUrl, searchParams);

  return {
    files: (result.files ?? []).map((file) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      modifiedTime: file.modifiedTime,
      webViewLink: file.webViewLink,
      typeLabel: typeLabelForMime(file.mimeType)
    })),
    nextPageToken: result.nextPageToken
  };
}

function normalizeImportedText(file: GoogleDriveFile, exportedText: string) {
  const sourceLine = file.webViewLink
    ? `Source: ${file.webViewLink}`
    : `Source: Google Drive file ${file.id}`;
  return `${sourceLine}\nDocument: ${file.name}\n\n${exportedText}`
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SOURCE_DOCUMENT_CHARS);
}

function sourceDocumentTypeForMime(
  mimeType: string
): SourceDocument["type"] {
  if (mimeType === GOOGLE_MIME_TYPES.spreadsheet) {
    return "spreadsheet";
  }

  if (mimeType === GOOGLE_MIME_TYPES.presentation) {
    return "presentation";
  }

  return "document";
}

export async function importGoogleDriveFiles(
  fileIds: string[],
  requestUrl: string
): Promise<GoogleDriveImportedDocument[]> {
  const uniqueIds = Array.from(new Set(fileIds.map((id) => id.trim()).filter(Boolean)));
  const boundedIds = uniqueIds.slice(0, 6);

  if (boundedIds.length === 0) {
    throw new Error("Select at least one Google Drive file.");
  }

  const documents: GoogleDriveImportedDocument[] = [];

  for (const fileId of boundedIds) {
    const metadata = await googleDriveRequest<GoogleDriveFile>(
      `files/${encodeURIComponent(fileId)}`,
      requestUrl,
      new URLSearchParams({
        fields: "id,name,mimeType,modifiedTime,webViewLink,capabilities"
      })
    );

    if (
      metadata.mimeType !== GOOGLE_MIME_TYPES.document &&
      metadata.mimeType !== GOOGLE_MIME_TYPES.spreadsheet &&
      metadata.mimeType !== GOOGLE_MIME_TYPES.presentation
    ) {
      throw new Error(`${metadata.name} is not a supported Google Workspace file.`);
    }

    if (metadata.capabilities?.canDownload === false) {
      throw new Error(`${metadata.name} cannot be downloaded by this account.`);
    }

    const exportedText = await exportGoogleDriveText(
      metadata.id,
      metadata.mimeType,
      requestUrl
    );
    const normalizedText = normalizeImportedText(metadata, exportedText);

    if (!normalizedText) {
      continue;
    }

    documents.push({
      id: `google_drive_${metadata.id}`.replace(/[^a-z0-9_-]+/gi, "_"),
      name: metadata.name.slice(0, 120),
      type: sourceDocumentTypeForMime(metadata.mimeType),
      text: normalizedText,
      characters: normalizedText.length,
      source: "google_drive",
      driveFileId: metadata.id,
      mimeType: metadata.mimeType,
      webViewLink: metadata.webViewLink
    });
  }

  if (documents.length === 0) {
    throw new Error("Selected Google Drive files did not export readable text.");
  }

  return documents;
}
