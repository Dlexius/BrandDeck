"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { GoogleDriveConnectorStatus, GoogleDriveFileOption, GoogleWorkspaceSourceType } from "@/lib/ui-types";
import { ArrowRight, ExternalLink, FileCheck2, FileSpreadsheet, FileText, Loader2, Presentation, Search, X } from "lucide-react";

export const GOOGLE_WORKSPACE_SOURCE_TYPES: Array<{
  type: GoogleWorkspaceSourceType;
  name: string;
  repoLabel: string;
  detail: string;
  logoUrl: string;
  searchPlaceholder: string;
  emptyState: string;
}> = [
  {
    type: "document",
    name: "Google Docs",
    repoLabel: "Docs repo",
    detail: "Briefs, meeting notes, success plans, and account narratives",
    logoUrl: "/connector-logos/googledocs.svg",
    searchPlaceholder: "Search Docs for QBR notes, account briefs, or meeting recaps",
    emptyState: "Search for a customer brief, QBR narrative, meeting recap, or implementation plan."
  },
  {
    type: "spreadsheet",
    name: "Google Sheets",
    repoLabel: "Sheets repo",
    detail: "Metrics, scorecards, adoption snapshots, and workflow signals",
    logoUrl: "/connector-logos/googlesheets.svg",
    searchPlaceholder: "Search Sheets for metrics, scorecards, or account snapshots",
    emptyState: "Search for adoption metrics, product usage, risk scoring, or account snapshots."
  },
  {
    type: "presentation",
    name: "Google Slides",
    repoLabel: "Slides repo",
    detail: "Existing decks, product updates, QBRs, and approved narratives",
    logoUrl: "/connector-logos/googleslides.svg",
    searchPlaceholder: "Search Slides for product updates, QBRs, or prior decks",
    emptyState: "Search for product update decks, business reviews, kickoff decks, or narrative examples."
  }
];

export function googleWorkspaceSourceType(type: GoogleWorkspaceSourceType) {
  return GOOGLE_WORKSPACE_SOURCE_TYPES.find((sourceType) => sourceType.type === type);
}

function GoogleWorkspaceSourcePickerModal({
  activeSourceType,
  googleDriveStatus,
  googleDriveQuery,
  googleDriveResults,
  selectedGoogleDriveFileIds,
  searchingGoogleDrive,
  importingGoogleDrive,
  onClose,
  onConnectGoogleDrive,
  onGoogleDriveQueryChange,
  onSearchGoogleDrive,
  onToggleGoogleDriveFile,
  onImportGoogleDriveFiles
}: {
  activeSourceType: GoogleWorkspaceSourceType | null;
  googleDriveStatus: GoogleDriveConnectorStatus | null;
  googleDriveQuery: string;
  googleDriveResults: GoogleDriveFileOption[];
  selectedGoogleDriveFileIds: string[];
  searchingGoogleDrive: boolean;
  importingGoogleDrive: boolean;
  onClose: () => void;
  onConnectGoogleDrive: () => void;
  onGoogleDriveQueryChange: (value: string) => void;
  onSearchGoogleDrive: () => void;
  onToggleGoogleDriveFile: (fileId: string) => void;
  onImportGoogleDriveFiles: () => void;
}) {
  if (!activeSourceType) {
    return null;
  }

  const sourceType = googleWorkspaceSourceType(activeSourceType);

  if (!sourceType) {
    return null;
  }

  const googleDriveConfigured = googleDriveStatus?.configured ?? false;
  const googleDriveConnected = googleDriveStatus?.connected ?? false;
  const selectedCount = selectedGoogleDriveFileIds.length;
  const SourceIcon =
    activeSourceType === "spreadsheet"
      ? FileSpreadsheet
      : activeSourceType === "presentation"
        ? Presentation
        : FileText;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${sourceType.name} source picker`}
    >
      <div className="workflow-soft-raise flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/10">
        <div className="flex items-start justify-between gap-4 border-b border-[#E5E0DB] px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-[#F3F3F3] ring-1 ring-[#EFEAE5]">
              <img
                src={sourceType.logoUrl}
                alt={`${sourceType.name} logo`}
                className="h-7 w-7 object-contain"
              />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-brand-charcoal">
                  Select {sourceType.name}
                </h2>
                <span className="rounded-sm bg-[#F3F3F3] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-brand-ink">
                  {sourceType.repoLabel}
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-[#787E89]">
                Choose trusted files to use as source context. BrandDeck extracts
                evidence from the content while the brand contract keeps slide
                design locked.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-[#787E89] transition hover:bg-[#F3F3F3] hover:text-brand-charcoal"
            onClick={onClose}
            aria-label="Close source picker"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {!googleDriveConfigured ? (
            <div className="rounded-md border border-[#FFD3BE] bg-[#FFF7F2] px-4 py-4 text-sm font-semibold leading-6 text-[#69707D]">
              Google OAuth credentials are required before BrandDeck can search
              this repository.
            </div>
          ) : !googleDriveConnected ? (
            <div className="grid gap-4 rounded-md border border-[#E5E0DB] bg-[#FCFBFA] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <p className="text-sm font-black text-brand-charcoal">
                  Connect Google Drive first
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-[#787E89]">
                  Docs, Sheets, and Slides are selected through the Drive
                  connector so permissions stay centralized.
                </p>
              </div>
              <Button className="h-10 px-4" onClick={onConnectGoogleDrive}>
                Connect Google Drive
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#787E89]" />
                  <Input
                    value={googleDriveQuery}
                    onChange={(event) =>
                      onGoogleDriveQueryChange(event.currentTarget.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onSearchGoogleDrive();
                      }
                    }}
                    placeholder={sourceType.searchPlaceholder}
                    className="pl-9"
                    disabled={searchingGoogleDrive || importingGoogleDrive}
                  />
                </div>
                <Button
                  variant="secondary"
                  className="h-10 px-4"
                  onClick={onSearchGoogleDrive}
                  disabled={searchingGoogleDrive || importingGoogleDrive}
                >
                  {searchingGoogleDrive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  {searchingGoogleDrive ? "Searching" : "Search"}
                </Button>
              </div>

              {googleDriveResults.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#D7CABF] bg-[#FCFBFA] px-4 py-8 text-center">
                  <SourceIcon className="mx-auto h-8 w-8 text-[#787E89]" />
                  <p className="mt-3 text-sm font-black text-brand-charcoal">
                    No {sourceType.name} selected yet
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-xs font-semibold leading-5 text-[#787E89]">
                    {sourceType.emptyState}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {googleDriveResults.map((file) => {
                    const selected = selectedGoogleDriveFileIds.includes(file.id);

                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => onToggleGoogleDriveFile(file.id)}
                        className={`w-full rounded-md border px-3 py-3 text-left transition ${
                          selected
                            ? "border-brand-orange bg-[#FFF7F2]"
                            : "border-[#E5E0DB] bg-white hover:bg-[#FCFBFA]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${
                              selected
                                ? "bg-brand-orange text-white"
                                : "bg-[#F3F3F3] text-brand-ink"
                            }`}
                          >
                            <SourceIcon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-brand-charcoal">
                                  {file.name}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-[#787E89]">
                                  {file.typeLabel}
                                  {file.modifiedTime
                                    ? ` | Modified ${new Date(file.modifiedTime).toLocaleDateString()}`
                                    : ""}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 rounded-sm px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${
                                  selected
                                    ? "bg-brand-orange text-white"
                                    : "bg-[#F3F3F3] text-brand-ink"
                                }`}
                              >
                                {selected ? "Selected" : "Select"}
                              </span>
                            </div>
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-orange"
                                onClick={(event) => event.stopPropagation()}
                              >
                                Open source
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-[#E5E0DB] bg-[#FCFBFA] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-[#787E89]">
            {selectedCount} file{selectedCount === 1 ? "" : "s"} selected
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              className="h-10 px-4"
              onClick={onClose}
              disabled={importingGoogleDrive}
            >
              Cancel
            </Button>
            <Button
              className="h-10 px-4"
              onClick={onImportGoogleDriveFiles}
              disabled={
                !googleDriveConnected ||
                selectedCount === 0 ||
                importingGoogleDrive
              }
            >
              {importingGoogleDrive ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileCheck2 className="h-4 w-4" />
              )}
              {importingGoogleDrive ? "Attaching" : "Attach Sources"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConnectedContextPanel({
  googleDriveStatus,
  activeGoogleSourceType,
  googleDriveQuery,
  googleDriveResults,
  selectedGoogleDriveFileIds,
  searchingGoogleDrive,
  importingGoogleDrive,
  onOpenGoogleSourcePicker,
  onCloseGoogleSourcePicker,
  onConnectGoogleDrive,
  onDisconnectGoogleDrive,
  onGoogleDriveQueryChange,
  onSearchGoogleDrive,
  onToggleGoogleDriveFile,
  onImportGoogleDriveFiles
}: {
  googleDriveStatus: GoogleDriveConnectorStatus | null;
  activeGoogleSourceType: GoogleWorkspaceSourceType | null;
  googleDriveQuery: string;
  googleDriveResults: GoogleDriveFileOption[];
  selectedGoogleDriveFileIds: string[];
  searchingGoogleDrive: boolean;
  importingGoogleDrive: boolean;
  onOpenGoogleSourcePicker: (sourceType: GoogleWorkspaceSourceType) => void;
  onCloseGoogleSourcePicker: () => void;
  onConnectGoogleDrive: () => void;
  onDisconnectGoogleDrive: () => void;
  onGoogleDriveQueryChange: (value: string) => void;
  onSearchGoogleDrive: () => void;
  onToggleGoogleDriveFile: (fileId: string) => void;
  onImportGoogleDriveFiles: () => void;
}) {
  const googleDriveConfigured = googleDriveStatus?.configured ?? false;
  const googleDriveConnected = googleDriveStatus?.connected ?? false;
  const futureConnectors = [
    {
      name: "Dropbox",
      detail: "Shared files and account folders",
      logoUrl: "/connector-logos/dropbox.svg"
    },
    {
      name: "Box",
      detail: "Governed folders and enterprise content",
      logoUrl: "/connector-logos/box.svg"
    },
    {
      name: "Salesforce",
      detail: "Renewals, opportunities, and stakeholder context",
      logoUrl: "/connector-logos/salesforce.svg"
    },
    {
      name: "GitHub",
      detail: "Product repositories, release notes, and roadmap issues",
      logoUrl: "/connector-logos/github.svg"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Connected Context
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Connect files and systems that already hold the client story.
            BrandDeck turns them into governed context for the deck plan.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="rounded-md border border-[#E5E0DB] bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#F3F3F3] ring-1 ring-[#EFEAE5]">
                <img
                  src="/connector-logos/googledrive.svg"
                  alt="Google Drive logo"
                  className="h-6 w-6 object-contain"
                  loading="lazy"
                />
              </span>
              <div>
                <p className="text-sm font-black text-brand-charcoal">
                  Google Drive
                </p>
                <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-[#787E89]">
                  Centralized access for Google Docs, Sheets, and Slides. Source
                  selection happens from the file-type cards below.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`w-fit rounded-sm px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${
                      googleDriveConnected
                        ? "bg-brand-orange text-white"
                        : "bg-[#F3F3F3] text-brand-ink"
                    }`}
                  >
                    {googleDriveConnected ? "Connected" : "Not connected"}
                  </span>
                  {!googleDriveConfigured && (
                    <span className="w-fit rounded-sm bg-[#FFF7F2] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#B43C00]">
                      Needs credentials
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-md border border-[#E5E0DB] bg-[#FCFBFA] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
              Connection
            </p>
            {googleDriveConnected ? (
              <Button
                variant="secondary"
                className="mt-3 w-full"
                onClick={onDisconnectGoogleDrive}
                disabled={searchingGoogleDrive || importingGoogleDrive}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                className="mt-3 w-full"
                onClick={onConnectGoogleDrive}
                disabled={!googleDriveConfigured}
              >
                Connect
              </Button>
            )}
            <p className="mt-3 text-xs font-semibold leading-5 text-[#787E89]">
              Drive permissions power the source pickers without giving prompts
              control over brand design.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {GOOGLE_WORKSPACE_SOURCE_TYPES.map((sourceType) => {
            const SourceIcon =
              sourceType.type === "spreadsheet"
                ? FileSpreadsheet
                : sourceType.type === "presentation"
                  ? Presentation
                  : FileText;

            return (
              <button
                key={sourceType.type}
                type="button"
                onClick={() => onOpenGoogleSourcePicker(sourceType.type)}
                disabled={!googleDriveConnected}
                className="group rounded-md border border-[#E5E0DB] bg-white p-4 text-left transition hover:border-brand-orange hover:bg-[#FFF7F2] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-[#E5E0DB] disabled:hover:bg-white"
              >
                <div className="flex h-full flex-col justify-between gap-5">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#F3F3F3] ring-1 ring-[#EFEAE5]">
                      <img
                        src={sourceType.logoUrl}
                        alt={`${sourceType.name} logo`}
                        className="h-6 w-6 object-contain"
                        loading="lazy"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black leading-5 text-brand-charcoal">
                        {sourceType.name}
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-[#787E89]">
                        {sourceType.detail}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#F3F3F3] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-brand-ink">
                      <SourceIcon className="h-3 w-3" />
                      {googleDriveConnected ? "Browse" : "Connect first"}
                    </span>
                    <ArrowRight className="h-4 w-4 text-[#787E89] transition group-hover:translate-x-0.5 group-hover:text-brand-orange" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          {futureConnectors.map((connector) => (
            <div
              key={connector.name}
              className="rounded-md border border-[#E5E0DB] bg-[#FCFBFA] p-3"
            >
              <div className="flex items-start gap-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white ring-1 ring-[#EFEAE5]">
                  <img
                    src={connector.logoUrl}
                    alt={`${connector.name} logo`}
                    className="h-5 w-5 object-contain"
                    loading="lazy"
                  />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-brand-charcoal">
                    {connector.name}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold leading-4 text-[#787E89]">
                    {connector.detail}
                  </p>
                </div>
              </div>
              <span className="mt-3 inline-flex rounded-sm bg-[#F3F3F3] px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-brand-ink">
                Coming Soon
              </span>
            </div>
          ))}
        </div>

        <GoogleWorkspaceSourcePickerModal
          activeSourceType={activeGoogleSourceType}
          googleDriveStatus={googleDriveStatus}
          googleDriveQuery={googleDriveQuery}
          googleDriveResults={googleDriveResults}
          selectedGoogleDriveFileIds={selectedGoogleDriveFileIds}
          searchingGoogleDrive={searchingGoogleDrive}
          importingGoogleDrive={importingGoogleDrive}
          onClose={onCloseGoogleSourcePicker}
          onConnectGoogleDrive={onConnectGoogleDrive}
          onGoogleDriveQueryChange={onGoogleDriveQueryChange}
          onSearchGoogleDrive={onSearchGoogleDrive}
          onToggleGoogleDriveFile={onToggleGoogleDriveFile}
          onImportGoogleDriveFiles={onImportGoogleDriveFiles}
        />

      </CardContent>
    </Card>
  );
}
