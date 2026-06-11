"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ConnectorId, ConnectorSettings } from "@/lib/ui-types";
import { Loader2 } from "lucide-react";

const CONNECTOR_OPTIONS: Array<{
  id: ConnectorId;
  name: string;
  detail: string;
  status: "live" | "preview" | "coming_soon";
  logoUrl: string;
}> = [
  {
    id: "googleDrive",
    name: "Google Drive",
    detail: "Docs, Sheets, and Slides as governed source context.",
    status: "live",
    logoUrl: "/connector-logos/googledrive.svg"
  },
  {
    id: "notebooklm",
    name: "NotebookLM",
    detail:
      "Grounded notebook answers and citations. Runs with example sources until Enterprise credentials are added.",
    status: "preview",
    logoUrl: "/connector-logos/notebooklm.svg"
  },
  {
    id: "dropbox",
    name: "Dropbox",
    detail: "Shared files and account folders.",
    status: "coming_soon",
    logoUrl: "/connector-logos/dropbox.svg"
  },
  {
    id: "box",
    name: "Box",
    detail: "Governed folders and enterprise content.",
    status: "coming_soon",
    logoUrl: "/connector-logos/box.svg"
  },
  {
    id: "salesforce",
    name: "Salesforce",
    detail: "Renewals, opportunities, and stakeholder context.",
    status: "coming_soon",
    logoUrl: "/connector-logos/salesforce.svg"
  },
  {
    id: "github",
    name: "GitHub",
    detail: "Product repositories, release notes, and roadmap issues.",
    status: "coming_soon",
    logoUrl: "/connector-logos/github.svg"
  }
];

const STATUS_BADGES: Record<
  (typeof CONNECTOR_OPTIONS)[number]["status"],
  { label: string; className: string }
> = {
  live: { label: "Live", className: "bg-[#E6F4EA] text-[#188038]" },
  preview: { label: "Preview", className: "bg-[#FFF1E8] text-[#6B2A00]" },
  coming_soon: { label: "Coming Soon", className: "bg-[#F3F3F3] text-brand-ink" }
};

export function ConnectorSettingsCard({
  connectorSettings,
  savingConnectorId,
  onToggleConnector
}: {
  connectorSettings: ConnectorSettings;
  savingConnectorId: string;
  onToggleConnector: (id: ConnectorId, enabled: boolean) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
          Connected Context Sources
        </h2>
        <p className="mt-1 text-sm text-[#787E89]">
          Choose which source connectors creators see in step two. Hidden
          connectors disappear from the creator workflow entirely.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-2">
          {CONNECTOR_OPTIONS.map((connector) => {
            const enabled = connectorSettings[connector.id];
            const badge = STATUS_BADGES[connector.status];
            const saving = savingConnectorId === connector.id;

            return (
              <div
                key={connector.id}
                className="flex items-start justify-between gap-3 rounded-md border border-[#E5E0DB] bg-white px-4 py-3"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#F3F3F3] ring-1 ring-[#EFEAE5]">
                    <img
                      src={connector.logoUrl}
                      alt={`${connector.name} logo`}
                      className="h-5 w-5 object-contain"
                      loading="lazy"
                    />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-brand-charcoal">
                        {connector.name}
                      </p>
                      <span
                        className={`rounded-sm px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold leading-4 text-[#787E89]">
                      {connector.detail}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`${enabled ? "Hide" : "Show"} ${connector.name} for creators`}
                  disabled={saving}
                  onClick={() => onToggleConnector(connector.id, !enabled)}
                  className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
                    enabled ? "bg-brand-orange" : "bg-[#D7CABF]"
                  } disabled:opacity-60`}
                >
                  {saving ? (
                    <Loader2 className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
                  ) : (
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                        enabled ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
