"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  FileArchive,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  ImageIcon,
  Layers3,
  Loader2,
  Lock,
  Palette,
  Presentation,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Type,
  Upload,
  X
} from "lucide-react";
import brandContractData from "@/data/brand-contract.json";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AdoptionCsvRow } from "@/lib/generateDeckPlan";
import type {
  ApprovedLayoutId,
  BrandContract,
  DeckPlan,
  SourceDocument
} from "@/lib/deck-plan-schema";
import { MAX_SOURCE_DOCUMENT_CHARS } from "@/lib/deck-plan-schema";
import type { DeckAccuracyAudit } from "@/lib/auditDeckAccuracy";
import { approvedDeckRecipes } from "@/lib/deck-recipes";
import type { ValidationReport } from "@/lib/validateDeckPlan";
import { validateDeckPlan } from "@/lib/validateDeckPlan";
import type { DeckRecipe } from "@/lib/deck-recipes";

const defaultBrandContract = brandContractData as unknown as BrandContract;

const DEFAULT_PROMPT =
  "Create an executive adoption report for the client in the account snapshot. Emphasize usage growth, mobile adoption, feature adoption gaps, risks, and practical next steps for the next 90 days.";

type BusinessSnapshotState = {
  client_name: string;
  report_period: string;
  previous_report_period: string;
  active_users: string;
  licensed_users: string;
  adoption_score: string;
  previous_active_users: string;
  previous_adoption_score: string;
  projects_active: string;
  mobile_usage_rate: string;
  previous_mobile_usage_rate: string;
  daily_logs_count: string;
  rfi_count: string;
  submittals_count: string;
  top_feature: string;
  lowest_feature: string;
  risk_summary: string;
  recommendation_1: string;
  recommendation_2: string;
  recommendation_3: string;
};

type ClientProfile = {
  id: string;
  name: string;
  segment: string;
  stage: string;
  tools: string[];
  focus: string;
  snapshot: BusinessSnapshotState;
  context: string;
};

const EMPTY_BUSINESS_SNAPSHOT: BusinessSnapshotState = {
  client_name: "",
  report_period: "",
  previous_report_period: "",
  active_users: "",
  licensed_users: "",
  adoption_score: "",
  previous_active_users: "",
  previous_adoption_score: "",
  projects_active: "",
  mobile_usage_rate: "",
  previous_mobile_usage_rate: "",
  daily_logs_count: "",
  rfi_count: "",
  submittals_count: "",
  top_feature: "",
  lowest_feature: "",
  risk_summary: "",
  recommendation_1: "",
  recommendation_2: "",
  recommendation_3: ""
};

const EXAMPLE_BUSINESS_SNAPSHOT: BusinessSnapshotState = {
  client_name: "Harborview Civil Partners",
  report_period: "June 2026",
  previous_report_period: "May 2026",
  active_users: "244",
  licensed_users: "325",
  adoption_score: "76",
  previous_active_users: "213",
  previous_adoption_score: "73",
  projects_active: "24",
  mobile_usage_rate: "61",
  previous_mobile_usage_rate: "59",
  daily_logs_count: "1840",
  rfi_count: "286",
  submittals_count: "350",
  top_feature: "Daily Logs",
  lowest_feature: "Submittals",
  risk_summary:
    "Submittal response ownership is inconsistent across project teams, which is slowing closeout confidence for executive sponsors.",
  recommendation_1:
    "Assign a named workflow owner before the next executive checkpoint.",
  recommendation_2:
    "Review submittal response targets in weekly project health meetings.",
  recommendation_3:
    "Reinforce mobile daily log habits with field supervisors."
};

const CLIENT_PROFILES: ClientProfile[] = [
  {
    id: "harborview",
    name: "Harborview Civil Partners",
    segment: "Civil infrastructure",
    stage: "Expansion account",
    tools: ["Project Management", "RFIs", "Submittals", "Daily Logs", "Mobile"],
    focus: "Stabilize submittal ownership and reinforce mobile field habits.",
    snapshot: EXAMPLE_BUSINESS_SNAPSHOT,
    context:
      "Client profile: Harborview Civil Partners is a civil infrastructure contractor using Project Management, RFIs, Submittals, Daily Logs, Documents, and Mobile. Business goal: protect margin by shortening submittal response cycles and making daily log habits repeatable across active projects. Risk: submittal response ownership is inconsistent across project teams. Trend note: mobile adoption improved but field leaders still need role-based coaching. Recommendation: position product update content around Submittals, Daily Logs, and Mobile workflows already deployed for the client."
  },
  {
    id: "summit-ridge",
    name: "Summit Ridge Constructors",
    segment: "Commercial general contractor",
    stage: "Renewal planning",
    tools: ["Core Tools", "Documents", "Budget", "Commitments", "Analytics"],
    focus: "Connect adoption gains to executive renewal and cost-control outcomes.",
    snapshot: {
      client_name: "Summit Ridge Constructors",
      report_period: "Q2 2026",
      previous_report_period: "Q1 2026",
      active_users: "418",
      licensed_users: "520",
      adoption_score: "81",
      previous_active_users: "372",
      previous_adoption_score: "74",
      projects_active: "41",
      mobile_usage_rate: "68",
      previous_mobile_usage_rate: "61",
      daily_logs_count: "3920",
      rfi_count: "512",
      submittals_count: "680",
      top_feature: "Documents",
      lowest_feature: "Budget",
      risk_summary:
        "Budget and commitments workflows lag behind field and document adoption, limiting the renewal value story.",
      recommendation_1:
        "Tie the next business review to budget accuracy, commitments visibility, and project controls outcomes.",
      recommendation_2:
        "Run a project-controls enablement sprint for regional operations leaders.",
      recommendation_3:
        "Use executive dashboards to show adoption impact before renewal planning."
    },
    context:
      "Client profile: Summit Ridge Constructors is a commercial GC using Core Tools, Documents, Budget, Commitments, and Analytics. Business goal: connect adoption to renewal value, cost-control visibility, and project controls maturity. Risk: Budget and Commitments adoption trails field workflows. Trend note: document and mobile usage are strong, but project controls workflows need executive reinforcement. Recommendation: for QBR decks, emphasize value realized, renewal readiness, Budget/Commitments enablement, and executive dashboard adoption."
  },
  {
    id: "northstar",
    name: "Northstar Utilities Group",
    segment: "Energy and utilities",
    stage: "New product rollout",
    tools: ["Quality & Safety", "Inspections", "Observations", "Forms", "Analytics"],
    focus: "Target product updates to quality, safety, and field inspection workflows.",
    snapshot: {
      client_name: "Northstar Utilities Group",
      report_period: "July 2026",
      previous_report_period: "June 2026",
      active_users: "186",
      licensed_users: "260",
      adoption_score: "69",
      previous_active_users: "151",
      previous_adoption_score: "58",
      projects_active: "18",
      mobile_usage_rate: "72",
      previous_mobile_usage_rate: "63",
      daily_logs_count: "1240",
      rfi_count: "144",
      submittals_count: "198",
      top_feature: "Inspections",
      lowest_feature: "Forms",
      risk_summary:
        "Teams are engaged in inspections, but form standardization and closeout consistency remain uneven.",
      recommendation_1:
        "Anchor the rollout around inspection templates and supervisor review routines.",
      recommendation_2:
        "Introduce forms updates only with workflow-specific field examples.",
      recommendation_3:
        "Measure adoption by region and inspection type before the next product review."
    },
    context:
      "Client profile: Northstar Utilities Group uses Quality & Safety, Inspections, Observations, Forms, and Analytics. Business goal: standardize field quality processes while preserving fast mobile execution. Risk: forms and closeout routines are not consistent by region. Trend note: mobile and inspection adoption are rising, which creates a good entry point for product update messaging. Recommendation: product update decks should connect new Forms, Inspections, and Analytics capabilities to the tools Northstar already owns."
  }
];

type TemplateKitSummary = {
  id: string;
  templateName: string;
  fingerprint: string;
  createdAt: string;
  bytes: number;
  slideCount: number;
  layoutCount: number;
  masterCount: number;
  mediaCount: number;
  imageCount: number;
  detectedFonts: string[];
  detectedColors: string[];
  topAssets: Array<{
    entry: string;
    extension: string;
    mimeType: string;
    bytes: number;
    fingerprint: string;
    width?: number;
    height?: number;
  }>;
  sourceSlides: Array<{
    sourceSlide: number;
    slideEntry: string;
    layoutEntry?: string;
    layoutName?: string;
    textPreview: string;
  }>;
  frameMap: {
    mode: "template-following";
    rendererIntent: "clone-edit";
    outputSlides: Array<{
      layoutId: string;
      outputSlide: number;
      sourceSlide: number;
      narrativeRole: string;
      reuseMode: "duplicate-slide";
      confidence: number;
      evidence: string[];
      editTargets: string[];
    }>;
    omittedSourceSlides: Array<{
      sourceSlide: number;
      reason: string;
    }>;
    approval: {
      status: "suggested" | "approved";
      mappingFingerprint: string;
      approvedAt?: string;
      approvedBy?: string;
    };
  };
  driftGuards: {
    templateFingerprintLocked: boolean;
    frameMapRequired: boolean;
    cloneEditPreferred: boolean;
    approvedLayoutsRequired: boolean;
    deterministicRendererRequired: boolean;
    aiDesignDisabled: boolean;
  };
};

type TemplateGovernanceReport = {
  schema: "branddeck.template-edit-governance/v1";
  templateKitId: string;
  templateName: string;
  templateFingerprint: string;
  generatedAt: string;
  summary: {
    outputSlideCount: number;
    readySlideCount: number;
    editableObjectCount: number;
    textBoxCount: number;
    tableCellGroupCount: number;
    governanceScore: number;
    bindingSource: "built_in_procore" | "admin_import" | "none";
    bindingFingerprint: string;
    bindingUpdatedAt?: string;
    bindingTargetCount: number;
  };
  outputSlides: Array<{
    outputSlide: number;
    layoutId: string;
    sourceSlide: number;
    confidence: number;
    editTargetCount: number;
    requiredTargetCount: number;
    objectTypes: string[];
    status: "ready" | "needs_admin_mapping" | "unmapped";
    targets: Array<{
      objectId: string;
      objectType: string;
      role: string;
      dataBinding: string;
      required: boolean;
    }>;
  }>;
};

type BrandAssetSummary = {
  id: string;
  fileName: string;
  role: "logo" | "icon" | "hero_image" | "texture" | "supporting_image";
  mimeType: string;
  extension: string;
  bytes: number;
  fingerprint: string;
  width?: number;
  height?: number;
  status: "approved_for_review" | "needs_admin_label";
  driftGuards: {
    fingerprintLocked: boolean;
    rendererPlacementRequired: boolean;
    aiMayNotInventReplacement: boolean;
  };
};

const BRAND_ASSET_ROLE_OPTIONS: Array<{
  value: BrandAssetSummary["role"];
  label: string;
}> = [
  { value: "logo", label: "Logo" },
  { value: "hero_image", label: "Hero Image" },
  { value: "icon", label: "Icon" },
  { value: "texture", label: "Texture" },
  { value: "supporting_image", label: "Supporting Image" }
];

const CORE_BRAND_COLOR_TOKENS = [
  "primary_orange",
  "secondary_orange",
  "charcoal",
  "ink",
  "medium_gray",
  "light_gray"
];
const MAX_ADMIN_RECIPE_LAYOUTS = 24;

function brandColorTokenLabel(token: string) {
  return token.replaceAll("_", " ");
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

type SourceDocumentSummary = SourceDocument & {
  characters: number;
};

type GoogleDriveConnectorStatus = {
  configured: boolean;
  connected: boolean;
  scopes?: string[];
  redirectUri?: string;
  connectedAt?: string;
  updatedAt?: string;
  expiresAt?: string | null;
  error?: string;
};

type GoogleDriveFileOption = {
  id: string;
  name: string;
  mimeType: string;
  typeLabel: string;
  webViewLink?: string;
  modifiedTime?: string;
};

type GoogleWorkspaceFileType = "all" | "document" | "spreadsheet" | "presentation";

type GoogleWorkspaceSourceType = Exclude<GoogleWorkspaceFileType, "all">;

const GOOGLE_WORKSPACE_SOURCE_TYPES: Array<{
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

function googleWorkspaceSourceType(type: GoogleWorkspaceSourceType) {
  return GOOGLE_WORKSPACE_SOURCE_TYPES.find((sourceType) => sourceType.type === type);
}

type GoogleDriveImportResponse = {
  documents?: SourceDocumentSummary[];
  error?: string;
};

type BrandContractApiResponse = {
  brandContract?: BrandContract;
  defaultBrandContract?: BrandContract;
  overriddenColorTokens?: string[];
  error?: string;
};

type RecipeBuilderState = {
  name: string;
  audience: string;
  description: string;
  keywords: string;
  layoutIds: ApprovedLayoutId[];
};

type WorkspaceView = "generate" | "settings";
type SettingsSection = "brand" | "templates" | "governance" | "recipes";
type CreatorWorkflowStep = "brief" | "context" | "export";

const CREATOR_WORKFLOW_STEPS: Array<{
  id: CreatorWorkflowStep;
  title: string;
  detail: string;
}> = [
  {
    id: "brief",
    title: "Describe",
    detail: "Prompt and deck type"
  },
  {
    id: "context",
    title: "Add Context",
    detail: "Metrics and sources"
  },
  {
    id: "export",
    title: "Generate",
    detail: "Review and export"
  }
];

const DEFAULT_RECIPE_BUILDER: RecipeBuilderState = {
  name: "Customer Steering Committee Update",
  audience: "Executive sponsors and customer steering committee",
  description:
    "Decision-ready adoption update for a specific audience, governed by approved layouts.",
  keywords: "steering, executive, decision, sponsor, adoption",
  layoutIds: [
    "title_client_report",
    "agenda",
    "executive_summary",
    "adoption_kpi_scorecard",
    "risks_recommendations",
    "next_steps"
  ]
};

type BrandPreflightReport = {
  schema: "branddeck.brand-preflight/v1";
  generatedAt: string;
  status: "ready" | "needs_review";
  readinessScore: number;
  checks: Array<{
    id: string;
    label: string;
    passed: boolean;
    detail: string;
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
};

type ExportCertificate = {
  renderer: string;
  packageAudit: string;
  frameMapApproval: string;
  frameMapFingerprint: string;
  frameMapCoverage?: string;
  objectGovernanceScore?: string;
  editableObjects?: string;
  objectBindingSource?: string;
  objectBindingFingerprint?: string;
  referencedSlides: string;
  missingRelationships: string;
  placeholderHits: string;
  brandValidationScore: string;
};

type GeneratePlanApiResponse = {
  schema?: "branddeck.generate-plan/v1";
  deckPlan?: DeckPlan;
  validationReport?: ValidationReport;
  accuracyAudit?: DeckAccuracyAudit;
  planningMode?:
    | "deterministic"
    | "openai_structured_outputs"
    | "openai_fallback_deterministic";
  plannerModel?: string;
  plannerFallbackReason?: string;
  error?: string;
};

function cleanSnapshotValue(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function hasBusinessSnapshotMinimum(snapshot: BusinessSnapshotState) {
  return Boolean(
    cleanSnapshotValue(snapshot.client_name) &&
      cleanSnapshotValue(snapshot.report_period) &&
      cleanSnapshotValue(snapshot.active_users) &&
      cleanSnapshotValue(snapshot.licensed_users) &&
      cleanSnapshotValue(snapshot.adoption_score)
  );
}

function businessSnapshotToRows(
  snapshot: BusinessSnapshotState
): AdoptionCsvRow[] {
  if (!hasBusinessSnapshotMinimum(snapshot)) {
    return [];
  }

  const clientName = cleanSnapshotValue(snapshot.client_name);
  const reportPeriod = cleanSnapshotValue(snapshot.report_period);
  const activeUsers = cleanSnapshotValue(snapshot.active_users);
  const licensedUsers = cleanSnapshotValue(snapshot.licensed_users);
  const adoptionScore = cleanSnapshotValue(snapshot.adoption_score);
  const projectsActive = cleanSnapshotValue(snapshot.projects_active);
  const mobileUsageRate = cleanSnapshotValue(snapshot.mobile_usage_rate);
  const dailyLogsCount = cleanSnapshotValue(snapshot.daily_logs_count);
  const rfiCount = cleanSnapshotValue(snapshot.rfi_count);
  const submittalsCount = cleanSnapshotValue(snapshot.submittals_count);
  const topFeature = cleanSnapshotValue(snapshot.top_feature);
  const lowestFeature = cleanSnapshotValue(snapshot.lowest_feature);
  const riskSummary = cleanSnapshotValue(snapshot.risk_summary);
  const recommendation1 = cleanSnapshotValue(snapshot.recommendation_1);
  const recommendation2 = cleanSnapshotValue(snapshot.recommendation_2);
  const recommendation3 = cleanSnapshotValue(snapshot.recommendation_3);

  const currentRow: AdoptionCsvRow = {
    client_name: clientName,
    report_period: reportPeriod,
    active_users: activeUsers,
    licensed_users: licensedUsers,
    adoption_score: adoptionScore,
    projects_active: projectsActive,
    mobile_usage_rate: mobileUsageRate,
    daily_logs_count: dailyLogsCount,
    rfi_count: rfiCount,
    submittals_count: submittalsCount,
    top_feature: topFeature,
    lowest_feature: lowestFeature,
    risk_summary: riskSummary,
    recommendation_1: recommendation1,
    recommendation_2: recommendation2,
    recommendation_3: recommendation3
  };

  const priorPeriod = cleanSnapshotValue(snapshot.previous_report_period);
  const priorAdoption = cleanSnapshotValue(snapshot.previous_adoption_score);
  const priorUsers = cleanSnapshotValue(snapshot.previous_active_users);
  const priorMobile = cleanSnapshotValue(snapshot.previous_mobile_usage_rate);

  if (!priorPeriod && !priorAdoption && !priorUsers && !priorMobile) {
    return [currentRow];
  }

  return [
    {
      ...currentRow,
      report_period: priorPeriod || `Prior ${reportPeriod}`,
      active_users: priorUsers || activeUsers,
      adoption_score: priorAdoption || adoptionScore,
      mobile_usage_rate: priorMobile || mobileUsageRate
    },
    currentRow
  ];
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function createSourceDocument(
  name: string,
  text: string,
  type: SourceDocument["type"] = "document"
): SourceDocumentSummary {
  const normalizedText = text
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SOURCE_DOCUMENT_CHARS);

  return {
    id: `${name}-${normalizedText.length}-${Date.now()}`.replace(
      /[^a-z0-9_-]+/gi,
      "_"
    ),
    name,
    type,
    text: normalizedText,
    characters: normalizedText.length
  };
}

function slugifyRecipeId(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

  return slug || "custom_recipe";
}

function safeDownloadFileName(deckPlan: DeckPlan) {
  return `${deckPlan.client_name}_${deckPlan.report_period}_${
    deckPlan.deck_recipe_id ?? deckPlan.deck_type
  }.pptx`
    .replace(/[^a-z0-9_.-]+/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function layoutDefinition(
  layoutId: ApprovedLayoutId,
  brandContract: BrandContract = defaultBrandContract
) {
  return brandContract.approved_layouts.find(
    (layout) => layout.layout_id === layoutId
  );
}

function slideRoleForLayout(layoutId: ApprovedLayoutId, index: number) {
  if (layoutId === "title_client_report") {
    return "title";
  }

  if (layoutId === "adoption_kpi_scorecard") {
    return "kpi_scorecard";
  }

  return layoutId === "next_steps" && index > 0 ? "next_steps" : layoutId;
}

function recipeFromBuilder(
  builder: RecipeBuilderState,
  existingRecipes: DeckRecipe[],
  brandContract: BrandContract = defaultBrandContract
): DeckRecipe {
  const recipeIdBase = `admin_custom_${slugifyRecipeId(builder.name)}`;
  const existing = new Set(existingRecipes.map((recipe) => recipe.recipe_id));
  const recipeId = existing.has(recipeIdBase)
    ? `${recipeIdBase}_${Date.now().toString(36).slice(-5)}`
    : recipeIdBase;
  const layoutIds = builder.layoutIds.slice(0, MAX_ADMIN_RECIPE_LAYOUTS);
  const keywords = builder.keywords
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 10);

  if (layoutIds.length < 3) {
    throw new Error("A governed recipe needs at least three approved layouts.");
  }

  return {
    recipe_id: recipeId,
    name: builder.name.trim(),
    mode: "predefined",
    description: builder.description.trim(),
    audience: builder.audience.trim(),
    intent_keywords: keywords.length > 0 ? keywords : ["custom"],
    slide_sequence: layoutIds.map((layoutId, index) => {
      const layout = layoutDefinition(layoutId);

      return {
        slide_role: slideRoleForLayout(layoutId, index),
        layout_id: layoutId,
        title: layout?.name ?? layoutId.replaceAll("_", " "),
        content_focus:
          layout?.purpose ??
          "Admin-governed custom recipe slide using an approved layout."
      };
    })
  };
}

function StatusStrip({
  report
}: {
  report: ValidationReport | null;
}) {
  if (!report) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-[#F3F3F3] px-3 py-2 text-sm font-semibold text-[#787E89]">
        <FileText className="h-4 w-4" />
        No Deck Generated
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
        report.passed
          ? "bg-[#F3F3F3] text-[#188038]"
          : "bg-[#FFF1E8] text-[#B43C00]"
      }`}
    >
      {report.passed ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <AlertTriangle className="h-4 w-4" />
      )}
      {report.passed ? "Deck Ready" : "Needs Review"}
    </div>
  );
}

function CreatorWorkflowProgress({
  activeStep,
  onStepChange,
  promptReady,
  dataReady,
  deckReady
}: {
  activeStep: CreatorWorkflowStep;
  onStepChange: (step: CreatorWorkflowStep) => void;
  promptReady: boolean;
  dataReady: boolean;
  deckReady: boolean;
}) {
  const activeIndex = CREATOR_WORKFLOW_STEPS.findIndex(
    (step) => step.id === activeStep
  );
  const completionByStep: Record<CreatorWorkflowStep, boolean> = {
    brief: promptReady,
    context: dataReady,
    export: deckReady
  };
  const progressWidth = `${((activeIndex + 1) / CREATOR_WORKFLOW_STEPS.length) * 100}%`;

  function stepIcon(step: CreatorWorkflowStep) {
    if (step === "brief") {
      return <FileText className="h-4 w-4" />;
    }

    if (step === "context") {
      return <FileArchive className="h-4 w-4" />;
    }

    return <FileCheck2 className="h-4 w-4" />;
  }

  return (
    <Card className="workflow-soft-raise overflow-hidden">
      <CardContent className="space-y-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-[#F3F3F3]">
          <div
            className="h-full rounded-full bg-brand-orange transition-[width] duration-500 ease-out"
            style={{ width: progressWidth }}
          />
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {CREATOR_WORKFLOW_STEPS.map((step, index) => {
            const isActive = step.id === activeStep;
            const isComplete = completionByStep[step.id];
            const isLocked =
              (step.id === "context" && !promptReady) ||
              (step.id === "export" && !dataReady);

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepChange(step.id)}
                disabled={isLocked}
                className={`group rounded-md border px-3 py-3 text-left transition duration-300 disabled:cursor-not-allowed disabled:opacity-55 ${
                  isActive
                    ? "border-brand-orange bg-[#FFF7F2] shadow-sm"
                    : "border-[#E5E0DB] bg-white hover:border-[#D7CABF]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-md transition duration-300 ${
                      isActive
                        ? "bg-brand-orange text-white"
                        : isComplete
                          ? "bg-[#ECF7EF] text-[#188038]"
                          : "bg-[#F3F3F3] text-brand-ink"
                    }`}
                  >
                    {isComplete && !isActive ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      stepIcon(step.id)
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-[#787E89]">
                      Step {index + 1}
                    </span>
                    <span className="mt-1 block text-sm font-black text-brand-charcoal">
                      {step.title}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-[#787E89]">
                      {step.detail}
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ExportQualityPanel({
  report,
  accuracyAudit,
  brandPreflight,
  templateGovernance,
  usingTemplateCloneEdit,
  exportCertificate,
  canExport
}: {
  report: ValidationReport | null;
  accuracyAudit: DeckAccuracyAudit | null;
  brandPreflight: BrandPreflightReport | null;
  templateGovernance: TemplateGovernanceReport | null;
  usingTemplateCloneEdit: boolean;
  exportCertificate: ExportCertificate | null;
  canExport: boolean;
}) {
  const planReady = Boolean(report?.passed);
  const accuracyReady = Boolean(accuracyAudit?.passed);
  const preflightReady = usingTemplateCloneEdit
    ? brandPreflight?.status === "ready"
    : planReady;
  const objectMapReady = usingTemplateCloneEdit
    ? templateGovernance?.summary.governanceScore === 100
    : true;
  const dryRunReady = usingTemplateCloneEdit
    ? exportCertificate?.packageAudit === "passed"
    : planReady;
  const qualityItems = [
    {
      label: "Deck structure",
      passed: planReady,
      detail: report
        ? `${report.complianceScore}% brand validation`
        : "Generate a deck"
    },
    {
      label: "Content accuracy",
      passed: accuracyReady,
      detail: accuracyAudit
        ? `${accuracyAudit.accuracyScore}% data and source grounding`
        : "Generate a deck"
    },
    {
      label: "Brand checks",
      passed: preflightReady,
      detail: usingTemplateCloneEdit
        ? brandPreflight
          ? `${brandPreflight.readinessScore}% export readiness`
          : "Waiting for template checks"
        : "Coordinate renderer ready"
    },
    {
      label: "Template fit",
      passed: objectMapReady,
      detail: usingTemplateCloneEdit
        ? templateGovernance
          ? `${templateGovernance.summary.governanceScore}% approved`
          : "Object map not loaded"
        : "No template object map required"
    },
    {
      label: "Export check",
      passed: dryRunReady,
      detail: usingTemplateCloneEdit
        ? exportCertificate?.packageAudit === "passed"
          ? `${exportCertificate.referencedSlides} slides, ${exportCertificate.placeholderHits} placeholder hits`
          : "Runs after generation"
        : "No dry-run required"
    }
  ];
  const nextAction = canExport
    ? "Export PPTX"
    : !planReady
      ? "Generate Presentation"
      : !accuracyReady
        ? "Regenerate With Current Context"
        : !preflightReady
          ? "Review Brand Settings"
          : !objectMapReady
            ? "Review Template Map"
            : "Generate Presentation";

  return (
    <Card>
      <CardHeader>
        <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
          Export Readiness
        </h3>
        <p className="mt-1 text-xs font-semibold text-[#787E89]">
          A simple status for the current deck.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border-l-2 border-brand-orange bg-[#F3F3F3] px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
            Next Step
          </p>
          <p className="mt-1 text-sm font-black text-brand-charcoal">
            {nextAction}
          </p>
        </div>
        <div className="space-y-2">
          {qualityItems.map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 border-b border-[#EFEAE5] pb-2 last:border-b-0 last:pb-0"
            >
              {item.passed ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#188038]" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-brand-charcoal">
                  {item.label}
                </p>
                <p className="mt-0.5 truncate text-xs font-semibold text-[#787E89]">
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ValidationPanel({
  report,
  accuracyAudit,
  brandPreflight,
  templateGovernance,
  canExport,
  generating,
  preparingExport,
  exporting,
  auditingExport,
  usingTemplateCloneEdit,
  exportCertificate,
  onExport
}: {
  report: ValidationReport | null;
  accuracyAudit: DeckAccuracyAudit | null;
  brandPreflight: BrandPreflightReport | null;
  templateGovernance: TemplateGovernanceReport | null;
  canExport: boolean;
  generating: boolean;
  preparingExport: boolean;
  exporting: boolean;
  auditingExport: boolean;
  usingTemplateCloneEdit: boolean;
  exportCertificate: ExportCertificate | null;
  onExport: () => void;
}) {
  const exportChecksRunning = generating || preparingExport || auditingExport;

  return (
    <aside className="border-l border-[#E5E0DB] bg-white p-6">
      <div className="space-y-5">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Ready to Export
          </h2>
          <div className="mt-3">
            <StatusStrip report={report} />
          </div>
        </div>

        <ExportQualityPanel
          report={report}
          accuracyAudit={accuracyAudit}
          brandPreflight={brandPreflight}
          templateGovernance={templateGovernance}
          usingTemplateCloneEdit={usingTemplateCloneEdit}
          exportCertificate={exportCertificate}
          canExport={canExport}
        />

        <div className="border-t border-[#E5E0DB] pt-5">
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Export
          </h3>
          {canExport ? (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-[#F3F3F3] px-3 py-2 text-sm font-bold text-[#188038]">
              <CheckCircle2 className="h-4 w-4" />
              Ready to export
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-[#F3F3F3] px-3 py-2 text-sm font-bold text-[#787E89]">
              {exportChecksRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {exportChecksRunning
                ? "Checking export readiness"
                : "Generate deck to unlock export"}
            </div>
          )}
          <Button
            className="mt-3 w-full"
            disabled={!canExport || preparingExport || auditingExport || exporting}
            onClick={onExport}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export PPTX
          </Button>
          {usingTemplateCloneEdit && (
            <p className="mt-2 text-xs font-semibold leading-5 text-[#787E89]">
              {exportCertificate?.packageAudit === "passed"
                ? "Export checks passed. The PPTX is ready."
                : "Generation will run brand and template checks automatically."}
            </p>
          )}
        </div>

      </div>
    </aside>
  );
}

function BrandKitReadiness({
  brandContract,
  templateKit,
  brandAssets,
  workspaceStatus
}: {
  brandContract: BrandContract;
  templateKit: TemplateKitSummary | null;
  brandAssets: BrandAssetSummary[];
  workspaceStatus: string;
}) {
  const readinessItems = [
    {
      label: "Template",
      value: templateKit
        ? `${templateKit.slideCount} slides indexed`
        : "Default template active",
      icon: FileArchive
    },
    {
      label: "Layouts",
      value: templateKit
        ? `${templateKit.layoutCount} layouts available`
        : `${brandContract.approved_layouts.length} approved layouts`,
      icon: Layers3
    },
    {
      label: "Assets",
      value: templateKit
        ? `${templateKit.mediaCount} template media + ${brandAssets.length} uploaded`
        : "Approved brand assets loaded",
      icon: ImageIcon
    },
    {
      label: "Drift Guard",
      value: "AI cannot choose geometry",
      icon: Lock
    }
  ];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Brand Kit Readiness
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            {templateKit
              ? `Locked to ${templateKit.templateName}`
              : "Using the bundled template contract"}
          </p>
        </div>
        <span className="rounded-sm bg-[#F3F3F3] px-2 py-1 font-mono text-xs font-semibold text-brand-ink">
          {templateKit
            ? templateKit.fingerprint.slice(0, 12)
            : "default-contract"}
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-4">
          {readinessItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="border-l-2 border-brand-orange bg-[#F3F3F3] px-3 py-3"
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#787E89]">
                  <Icon className="h-3.5 w-3.5 text-brand-orange" />
                  {item.label}
                </div>
                <p className="mt-2 text-sm font-bold leading-5 text-brand-charcoal">
                  {item.value}
                </p>
              </div>
            );
          })}
        </div>
        {brandAssets.length > 0 && (
          <p className="mt-3 text-xs font-semibold text-[#787E89]">
            Governed uploads: {brandAssets.map((asset) => asset.fileName).join(", ")}
          </p>
        )}
        <div className="mt-4 grid gap-3 border-t border-[#EFEAE5] pt-4 md:grid-cols-3">
          {[
            {
              label: "Brand Admin",
              value: "Approves templates, assets, colors, fonts, and review rules."
            },
            {
              label: "Deck Creator",
              value: "Uses prompts, business data, and source context to request a deck."
            },
            {
              label: "Deck Modes",
              value: "Predefined and ad hoc decks resolve to approved layouts."
            }
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-md bg-white px-4 py-3 ring-1 ring-[#EFEAE5]"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                {item.label}
              </p>
              <p className="mt-2 text-xs font-semibold leading-5 text-brand-ink">
                {item.value}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-md bg-[#F3F3F3] px-4 py-3 text-sm font-semibold leading-6 text-brand-ink">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
          <span>{workspaceStatus}</span>
        </div>
        {templateKit && (
          <div className="mt-4 grid gap-3 border-t border-[#EFEAE5] pt-4 md:grid-cols-2">
            <div className="rounded-md bg-[#111111] px-4 py-3 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/60">
                Prepared Template Path
              </p>
              <p className="mt-1 text-sm font-bold">
                Frame map ready
              </p>
            </div>
            <div className="rounded-md bg-[#FFF1E8] px-4 py-3 text-[#6B2A00]">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9A4A11]">
                Primary Export Renderer
              </p>
              <p className="mt-1 text-sm font-bold">
                Template-based export
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreatorBrandPanel({
  brandContract,
  templateKit,
  brandAssets,
  workspaceStatus,
  onOpenSettings
}: {
  brandContract: BrandContract;
  templateKit: TemplateKitSummary | null;
  brandAssets: BrandAssetSummary[];
  workspaceStatus: string;
  onOpenSettings: () => void;
}) {
  const logoAsset =
    brandAssets.find((asset) => asset.role === "logo") ?? brandAssets[0];
  const brandLogoSrc = logoAsset
    ? `/api/brand-assets?id=${encodeURIComponent(logoAsset.id)}`
    : brandContract.template_assets?.wordmark_black;
  const readiness = templateKit ? "Template kit active" : "Brand contract active";
  const bindingMode = templateKit
    ? "Clone/edit renderer"
    : "Coordinate renderer";

  return (
    <aside className="overflow-y-auto border-r border-[#E5E0DB] bg-white p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Active Brand
          </h2>
          <div className="mt-4 flex h-12 items-center">
            {brandLogoSrc ? (
              <img
                src={brandLogoSrc}
                alt=""
                className="max-h-10 max-w-[180px] object-contain"
              />
            ) : (
              <div className="text-lg font-black text-brand-charcoal">
                {brandContract.companyName}
              </div>
            )}
          </div>
          <p className="mt-4 text-lg font-black text-brand-charcoal">
            {brandContract.companyName}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#787E89]">
            {readiness}
          </p>
        </div>

        <div className="grid gap-2">
          {[
            ["Template", templateKit ? templateKit.templateName : "Default contract"],
            ["Renderer", bindingMode],
            ["Layouts", `${brandContract.approved_layouts.length} approved`],
            ["Assets", `${brandAssets.length} uploaded + contract assets`]
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-md bg-[#F3F3F3] px-3 py-2"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                {label}
              </p>
              <p className="mt-1 truncate text-xs font-black text-brand-charcoal">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-md border-l-2 border-brand-orange bg-[#FFF1E8] px-4 py-3">
          <div className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
            <div>
              <p className="text-sm font-black text-[#4B1F00]">
                Brand decisions are locked
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[#6B2A00]">
                Prompts can change content and audience, not colors, geometry,
                logos, or approved layouts.
              </p>
            </div>
          </div>
        </div>

        <Button variant="secondary" className="w-full" onClick={onOpenSettings}>
          <ShieldCheck className="h-4 w-4" />
          Brand Settings
        </Button>

        <p className="text-xs font-semibold leading-5 text-[#787E89]">
          {workspaceStatus}
        </p>
      </div>
    </aside>
  );
}

function TemplateOnboardingWorkbench({
  brandContract,
  templateKit,
  brandAssets,
  brandPreflight,
  templateGovernance,
  customRecipes
}: {
  brandContract: BrandContract;
  templateKit: TemplateKitSummary | null;
  brandAssets: BrandAssetSummary[];
  brandPreflight: BrandPreflightReport | null;
  templateGovernance: TemplateGovernanceReport | null;
  customRecipes: DeckRecipe[];
}) {
  const allRecipes = [...approvedDeckRecipes, ...customRecipes];
  const readyLayoutIds = new Set(
    templateGovernance?.outputSlides
      .filter((slide) => slide.status === "ready")
      .map((slide) => slide.layoutId) ?? []
  );
  const approvedLayoutIds = brandContract.approved_layouts.map(
    (layout) => layout.layout_id
  );
  const coveredApprovedLayoutCount = approvedLayoutIds.filter((layoutId) =>
    readyLayoutIds.has(layoutId)
  ).length;
  const coveredRecipes = allRecipes.filter((recipe) =>
    recipe.slide_sequence.every((slide) => readyLayoutIds.has(slide.layout_id))
  );
  const labeledAssets = brandAssets.filter(
    (asset) => asset.status === "approved_for_review"
  );
  const uploadedNeedsLabel = brandAssets.filter(
    (asset) => asset.status === "needs_admin_label"
  );
  const roleSet = new Set(labeledAssets.map((asset) => asset.role));
  const hasLogo = roleSet.has("logo") || Boolean(brandContract.template_assets?.wordmark_black);
  const hasVisualAsset =
    roleSet.has("hero_image") ||
    roleSet.has("supporting_image") ||
    roleSet.has("texture") ||
    Boolean(brandContract.template_assets?.hero_photo);
  const frameMapApproved = templateKit?.frameMap.approval.status === "approved";
  const objectMapReady = templateGovernance?.summary.governanceScore === 100;
  const brandReady = brandPreflight?.status === "ready";

  const setupSteps = [
    {
      label: "Template locked",
      passed: Boolean(templateKit),
      detail: templateKit
        ? `${templateKit.slideCount} slides fingerprinted`
        : "Upload an approved PPTX template"
    },
    {
      label: "Assets labeled",
      passed: hasLogo && hasVisualAsset && uploadedNeedsLabel.length === 0,
      detail:
        uploadedNeedsLabel.length > 0
          ? `${uploadedNeedsLabel.length} uploaded asset${uploadedNeedsLabel.length === 1 ? "" : "s"} need labels`
          : labeledAssets.length > 0
            ? `${labeledAssets.length} uploaded asset${labeledAssets.length === 1 ? "" : "s"} plus contract assets`
            : `${Array.from(
                new Set([
                  ...Array.from(roleSet),
                  brandContract.template_assets?.wordmark_black ? "logo" : "",
                  brandContract.template_assets?.hero_photo ? "hero_image" : ""
                ].filter(Boolean))
              )
              .map((role) => role.replaceAll("_", " "))
              .join(", ")} from brand contract`
    },
    {
      label: "Frame map approved",
      passed: Boolean(frameMapApproved),
      detail: frameMapApproved
        ? `${templateKit?.frameMap.outputSlides.length ?? 0} output slide mappings approved`
        : "Review and approve source slide mappings"
    },
    {
      label: "Object map governed",
      passed: Boolean(objectMapReady),
      detail: templateGovernance
        ? `${templateGovernance.summary.editableObjectCount} editable objects mapped`
        : "Generate governance report for editable objects"
    },
    {
      label: "Recipe coverage",
      passed: coveredRecipes.length === allRecipes.length && allRecipes.length > 0,
      detail: `${coveredRecipes.length}/${allRecipes.length} recipe${allRecipes.length === 1 ? "" : "s"} fully covered`
    },
    {
      label: "Current deck preflight",
      passed: Boolean(brandReady),
      detail: brandPreflight
        ? `${brandPreflight.readinessScore}% readiness for the active deck request`
        : "Generate or prepare a deck to run preflight"
    }
  ];
  const setupScore = Math.round(
    (setupSteps.filter((step) => step.passed).length / setupSteps.length) * 100
  );
  const nextStep =
    setupSteps.find((step) => !step.passed) ??
    setupSteps[setupSteps.length - 1];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Template Onboarding Workbench
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#787E89]">
            Admin view for turning an approved PPTX into a reusable generation
            kit with locked assets, mapped objects, and covered deck recipes.
          </p>
        </div>
        <div
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] ${
            setupScore === 100
              ? "bg-[#F3F3F3] text-[#188038]"
              : "bg-[#FFF1E8] text-[#B43C00]"
          }`}
        >
          {setupScore === 100 ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          {setupScore}% ready
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="border-l-2 border-brand-orange bg-[#111111] px-4 py-3 text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/60">
              Next Admin Action
            </p>
            <p className="mt-2 text-base font-black leading-6">
              {nextStep.label}
            </p>
            <p className="mt-2 text-xs font-semibold leading-5 text-white/72">
              {nextStep.detail}
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {setupSteps.map((step) => (
              <div
                key={step.label}
                className="flex min-w-0 items-start gap-2 rounded-md bg-white px-3 py-2 ring-1 ring-[#EFEAE5]"
              >
                {step.passed ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#188038]" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-brand-charcoal">
                    {step.label}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-[#787E89]">
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 border-t border-[#EFEAE5] pt-4 md:grid-cols-3">
          <div className="border-l-2 border-brand-orange bg-[#F3F3F3] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
              Layout Coverage
            </p>
            <p className="mt-1 text-2xl font-black text-brand-charcoal">
              {coveredApprovedLayoutCount}/{approvedLayoutIds.length}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#787E89]">
              approved layouts ready for template export
            </p>
          </div>
          <div className="border-l-2 border-brand-orange bg-[#F3F3F3] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
              Deck Recipe Coverage
            </p>
            <p className="mt-1 text-2xl font-black text-brand-charcoal">
              {coveredRecipes.length}/{allRecipes.length}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#787E89]">
              predefined and admin recipes supported
            </p>
          </div>
          <div className="border-l-2 border-brand-orange bg-[#F3F3F3] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
              Renderer Boundary
            </p>
            <p className="mt-1 text-sm font-black text-brand-charcoal">
              Duplicate first, edit mapped objects
            </p>
            <p className="mt-1 text-xs font-semibold text-[#787E89]">
              Prompt output cannot create new geometry, colors, or assets
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConnectorReadinessPanel() {
  const connectors = [
    {
      name: "Account Metrics",
      status: "Ready",
      detail: "Manual snapshot or connector-fed metrics"
    },
    {
      name: "Source Context",
      status: "Ready",
      detail: "Docs, briefs, notes, transcripts"
    },
    {
      name: "Cloud Drives",
      status: "Planned",
      detail: "Google Drive, OneDrive, Dropbox, Box"
    },
    {
      name: "Business Systems",
      status: "Planned",
      detail: "CRM, customer success, product usage, and BI exports"
    }
  ];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Data & Context Connectors
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Account metrics and source context feed the governed planner. Cloud
            documents and connected systems can use the same contract.
          </p>
        </div>
        <div className="rounded-md bg-[#F3F3F3] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-ink">
          Connector-ready architecture
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-4">
          {connectors.map((connector) => (
            <div
              key={connector.name}
              className="rounded-md bg-white px-3 py-3 ring-1 ring-[#EFEAE5]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black text-brand-charcoal">
                  {connector.name}
                </p>
                <span
                  className={`rounded-sm px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] ${
                    connector.status === "Ready"
                      ? "bg-[#ECF7EF] text-[#188038]"
                      : "bg-[#F3F3F3] text-[#787E89]"
                  }`}
                >
                  {connector.status}
                </span>
              </div>
              <p className="mt-2 text-[11px] font-semibold leading-5 text-[#787E89]">
                {connector.detail}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BrandPreflightPanel({
  report,
  canExportManifest,
  exportingManifest,
  onExportManifest
}: {
  report: BrandPreflightReport | null;
  canExportManifest: boolean;
  exportingManifest: boolean;
  onExportManifest: () => void;
}) {
  if (!report) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Brand Preflight
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Upload a template and generate a plan to run the export readiness
            audit.
          </p>
        </CardHeader>
      </Card>
    );
  }

  const needsDeckPlan = report.checks.some(
    (check) => check.id === "deck-plan:validation" && !check.passed
  );
  const visibleChecks = [
    ...report.checks.filter((check) => !check.passed),
    ...report.checks.filter((check) => check.passed)
  ].slice(0, 7);
  const statusLabel =
    report.status === "ready"
      ? "Ready to export"
      : needsDeckPlan
        ? "Needs generated deck"
        : "Needs review";

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Brand Preflight
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Deterministic export gate for template, assets, governance, and the generated deck.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] ${
              report.status === "ready"
                ? "bg-[#F3F3F3] text-[#188038]"
                : "bg-[#FFF1E8] text-[#B43C00]"
            }`}
          >
            {report.status === "ready" ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            {statusLabel}
          </div>
          <Button
            variant="secondary"
            className="h-9 shrink-0 whitespace-nowrap px-3"
            disabled={!canExportManifest || exportingManifest}
            onClick={onExportManifest}
          >
            {exportingManifest ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export Manifest
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
          <div className="border-l-2 border-brand-orange bg-[#F3F3F3] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
              Readiness
            </p>
            <p className="mt-1 text-3xl font-black text-brand-charcoal">
              {report.readinessScore}%
            </p>
            <p className="mt-1 text-xs font-semibold text-[#787E89]">
              {report.summary.passed}/{report.summary.total} checks
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {visibleChecks.map((check) => (
              <div
                key={check.id}
                className="flex items-start gap-2 rounded-md bg-white px-3 py-2 ring-1 ring-[#EFEAE5]"
              >
                {check.passed ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#188038]" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-brand-charcoal">
                    {check.label}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-[#787E89]">
                    {check.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateGovernancePanel({
  templateKit,
  governance,
  exportingObjectMap,
  importingObjectMap,
  resettingObjectMap,
  onExportObjectMap,
  onImportObjectMap,
  onResetObjectMap
}: {
  templateKit: TemplateKitSummary | null;
  governance: TemplateGovernanceReport | null;
  exportingObjectMap: boolean;
  importingObjectMap: boolean;
  resettingObjectMap: boolean;
  onExportObjectMap: () => void;
  onImportObjectMap: (file: File | null) => void;
  onResetObjectMap: () => void;
}) {
  if (!templateKit) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Template Governance
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Upload a template to inspect editable objects, data bindings, and
            drift controls.
          </p>
        </CardHeader>
      </Card>
    );
  }

  if (!governance) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Template Governance
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Governance report is pending for this template kit.
          </p>
        </CardHeader>
      </Card>
    );
  }

  const summaryItems = [
    ["Score", `${governance.summary.governanceScore}%`],
    ["Ready Slides", `${governance.summary.readySlideCount}/${governance.summary.outputSlideCount}`],
    ["Editable Objects", String(governance.summary.editableObjectCount)],
    ["Tables", String(governance.summary.tableCellGroupCount)]
  ];
  const bindingSourceLabel =
    governance.summary.bindingSource === "admin_import"
      ? "Admin imported"
      : governance.summary.bindingSource === "built_in_procore"
        ? "Built-in template map"
        : "Needs import";

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Template Governance
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Admin-approved editable objects for template-based generation.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-md bg-[#F3F3F3] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-ink">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-orange" />
            {governance.summary.governanceScore}% governed
          </div>
          <div className="flex items-center gap-2 rounded-md bg-[#F3F3F3] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-ink">
            <Lock className="h-3.5 w-3.5 text-brand-orange" />
            {bindingSourceLabel}
          </div>
          <Button
            variant="secondary"
            className="h-9 shrink-0 whitespace-nowrap px-3"
            disabled={exportingObjectMap}
            onClick={onExportObjectMap}
          >
            {exportingObjectMap ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export Object Map
          </Button>
          <label
            className={`inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#D7CABF] bg-[#F3F3F3] px-3 text-sm font-bold text-brand-charcoal transition hover:bg-[#E8E5E1] ${
              importingObjectMap ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {importingObjectMap ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Import Map
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              disabled={importingObjectMap}
              onChange={(event) => {
                onImportObjectMap(event.currentTarget.files?.[0] ?? null);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <Button
            variant="secondary"
            className="h-9 shrink-0 whitespace-nowrap px-3"
            disabled={resettingObjectMap}
            onClick={onResetObjectMap}
          >
            {resettingObjectMap ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Reset Map
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <div className="rounded-md bg-[#F3F3F3] px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
              Binding Fingerprint
            </p>
            <p className="mt-1 truncate font-mono text-[11px] font-semibold text-brand-ink">
              {governance.summary.bindingFingerprint || "No object bindings imported"}
            </p>
          </div>
          <div className="rounded-md bg-[#F3F3F3] px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
              Binding Targets
            </p>
            <p className="mt-1 text-sm font-black text-brand-charcoal">
              {governance.summary.bindingTargetCount}
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {summaryItems.map(([label, value]) => (
            <div key={label} className="border-l-2 border-brand-orange bg-[#F3F3F3] px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                {label}
              </p>
              <p className="mt-1 text-lg font-black text-brand-charcoal">
                {value}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 overflow-hidden border-t border-[#EFEAE5]">
          {governance.outputSlides.map((slide) => (
            <div
              key={`${slide.outputSlide}-${slide.layoutId}`}
              className="grid gap-3 border-b border-[#EFEAE5] py-3 last:border-b-0 md:grid-cols-[44px_minmax(0,1fr)_118px_120px]"
            >
              <span className="font-mono text-xs font-bold text-[#787E89]">
                {String(slide.outputSlide).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-bold text-brand-charcoal">
                  {slide.layoutId}
                </p>
                <div className="mt-2 grid gap-1">
                  {slide.targets.slice(0, 4).map((target) => (
                    <div
                      key={`${target.objectId}-${target.dataBinding}`}
                      className="flex min-w-0 items-center gap-2 text-[11px] font-semibold text-[#787E89]"
                    >
                      <span className="shrink-0 rounded-sm bg-[#F3F3F3] px-1.5 py-0.5 font-mono text-[10px] font-black text-brand-ink">
                        {target.objectId}
                      </span>
                      <span className="truncate">{target.role}</span>
                      <span className="hidden truncate font-mono text-[10px] text-[#9AA0A6] md:inline">
                        {target.dataBinding}
                      </span>
                    </div>
                  ))}
                  {slide.targets.length > 4 && (
                    <p className="text-[11px] font-semibold text-[#787E89]">
                      +{slide.targets.length - 4} more mapped object
                      {slide.targets.length - 4 === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                  Objects
                </p>
                <p className="mt-1 text-sm font-black text-brand-charcoal">
                  {slide.editTargetCount}
                </p>
              </div>
              <div
                className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] ${
                  slide.status === "ready" ? "text-[#188038]" : "text-[#B43C00]"
                }`}
              >
                {slide.status === "ready" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {slide.status.replaceAll("_", " ")}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BrandAssetInventory({
  assets,
  updatingAssetId,
  onUpdateRole
}: {
  assets: BrandAssetSummary[];
  updatingAssetId: string;
  onUpdateRole: (assetId: string, role: BrandAssetSummary["role"]) => void;
}) {
  if (assets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Brand Asset Inventory
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Upload logos, icons, textures, or approved imagery to fingerprint
            them before use. Visual previews appear here after intake.
          </p>
        </CardHeader>
      </Card>
    );
  }

  const approvedCount = assets.filter(
    (asset) => asset.status === "approved_for_review"
  ).length;
  const roleSummary = Array.from(new Set(assets.map((asset) => asset.role)))
    .map((role) => `${role.replaceAll("_", " ")}:${assets.filter((asset) => asset.role === role).length}`)
    .join(" | ");

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Brand Asset Inventory
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Fingerprinted assets available for admin review and renderer mapping.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md bg-[#F3F3F3] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-ink">
          <ImageIcon className="h-3.5 w-3.5 text-brand-orange" />
          {approvedCount}/{assets.length} review ready
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-md bg-[#F3F3F3] px-3 py-2 text-xs font-semibold text-[#787E89]">
          {roleSummary}
        </div>
        <div className="overflow-hidden border-t border-[#EFEAE5]">
          {assets.slice(0, 6).map((asset) => (
            <div
              key={asset.id}
              className="grid gap-3 border-b border-[#EFEAE5] py-3 last:border-b-0 md:grid-cols-[76px_minmax(0,1fr)_132px_96px]"
            >
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-[#E5E0DB] bg-[#F3F3F3]">
                <img
                  src={`/api/brand-assets?id=${encodeURIComponent(asset.id)}`}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="min-w-0 self-center">
                <p className="truncate text-sm font-bold text-brand-charcoal">
                  {asset.fileName}
                </p>
                <p className="mt-1 truncate font-mono text-[11px] font-semibold text-[#787E89]">
                  {asset.fingerprint.slice(0, 16)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-sm bg-[#F3F3F3] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-brand-ink">
                    {asset.role.replaceAll("_", " ")}
                  </span>
                  <span
                    className={`rounded-sm px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${
                      asset.status === "approved_for_review"
                        ? "bg-[#ECF7EF] text-[#188038]"
                        : "bg-[#FFF1E8] text-[#B43C00]"
                    }`}
                  >
                    {asset.status === "approved_for_review"
                      ? "Review ready"
                      : "Needs label"}
                  </span>
                </div>
              </div>
              <div className="self-center">
                <label
                  htmlFor={`asset-role-${asset.id}`}
                  className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]"
                >
                  Role
                </label>
                <select
                  id={`asset-role-${asset.id}`}
                  value={asset.role}
                  disabled={updatingAssetId === asset.id}
                  onChange={(event) =>
                    onUpdateRole(
                      asset.id,
                      event.currentTarget.value as BrandAssetSummary["role"]
                    )
                  }
                  className="mt-1 h-8 w-full rounded-md border border-[#D7CABF] bg-white px-2 text-xs font-bold text-brand-charcoal outline-none focus:border-brand-orange"
                >
                  {BRAND_ASSET_ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="self-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                  Asset Proof
                </p>
                <p className="mt-1 text-xs font-black text-brand-charcoal">
                  {asset.width && asset.height
                    ? `${asset.width}x${asset.height}`
                    : `${Math.round(asset.bytes / 1024)} KB`}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-[#787E89]">
                  {formatBytes(asset.bytes)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateAssetLibrary({
  templateKit,
  templateAssetRoles,
  promotingEntry,
  onRoleChange,
  onPromote
}: {
  templateKit: TemplateKitSummary | null;
  templateAssetRoles: Record<string, BrandAssetSummary["role"]>;
  promotingEntry: string;
  onRoleChange: (entry: string, role: BrandAssetSummary["role"]) => void;
  onPromote: (entry: string, role: BrandAssetSummary["role"]) => void;
}) {
  if (!templateKit) {
    return null;
  }

  const promotableAssets = templateKit.topAssets.filter((asset) =>
    ["png", "jpg", "jpeg", "svg"].includes(asset.extension)
  );

  if (promotableAssets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Template Asset Library
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            No promotable PNG, JPG, or SVG media was found in this template.
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Template Asset Library
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Promote media already inside the approved PPTX into governed brand assets.
          </p>
        </div>
        <div className="rounded-md bg-[#F3F3F3] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-ink">
          {promotableAssets.length} promotable
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden border-t border-[#EFEAE5]">
          {promotableAssets.slice(0, 6).map((asset) => {
            const role = templateAssetRoles[asset.entry] ?? "supporting_image";
            const previewUrl = `/api/template-assets?templateKitId=${encodeURIComponent(
              templateKit.id
            )}&entry=${encodeURIComponent(asset.entry)}`;
            const dimensions =
              asset.width && asset.height
                ? `${asset.width}x${asset.height}`
                : "Dimensions pending";

            return (
              <div
                key={asset.entry}
                className="grid gap-3 border-b border-[#EFEAE5] py-3 last:border-b-0 md:grid-cols-[72px_minmax(0,1fr)_140px_116px_112px]"
              >
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-[#E5E0DB] bg-[#F3F3F3]">
                  <img
                    src={previewUrl}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-brand-charcoal">
                    {asset.entry.replace(/^ppt\/media\//, "")}
                  </p>
                  <p className="mt-1 truncate font-mono text-[11px] font-semibold text-[#787E89]">
                    {asset.entry}
                  </p>
                  <p className="mt-1 truncate font-mono text-[11px] font-semibold text-[#787E89]">
                    {asset.fingerprint.slice(0, 16)}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                    Role
                  </label>
                  <select
                    value={role}
                    disabled={promotingEntry === asset.entry}
                    onChange={(event) =>
                      onRoleChange(
                        asset.entry,
                        event.currentTarget.value as BrandAssetSummary["role"]
                      )
                    }
                    className="mt-1 h-8 w-full rounded-md border border-[#D7CABF] bg-white px-2 text-xs font-bold text-brand-charcoal outline-none focus:border-brand-orange disabled:opacity-60"
                  >
                    {BRAND_ASSET_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                    Asset Proof
                  </p>
                  <p className="mt-1 text-xs font-black text-brand-charcoal">
                    {formatBytes(asset.bytes)}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-[#787E89]">
                    {dimensions}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="h-9 self-end px-3"
                  disabled={promotingEntry === asset.entry}
                  onClick={() => onPromote(asset.entry, role)}
                >
                  {promotingEntry === asset.entry ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  Approve
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function FrameMapPreview({
  templateKit,
  exportingFrameMap,
  exportingCloneStarter,
  approvingFrameMap,
  updatingLayoutId,
  onExportFrameMap,
  onExportCloneStarter,
  onApproveFrameMap,
  onUpdateFrameMapping
}: {
  templateKit: TemplateKitSummary | null;
  exportingFrameMap: boolean;
  exportingCloneStarter: boolean;
  approvingFrameMap: boolean;
  updatingLayoutId: string;
  onExportFrameMap: () => void;
  onExportCloneStarter: () => void;
  onApproveFrameMap: () => void;
  onUpdateFrameMapping: (layoutId: string, sourceSlide: number) => void;
}) {
  if (!templateKit) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Template Frame Map
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Upload a PPTX template to map approved BrandDeck layouts to source
            slides.
          </p>
        </CardHeader>
      </Card>
    );
  }

  const visibleMappings = templateKit.frameMap.outputSlides.slice(0, 8);
  const averageConfidence = Math.round(
    visibleMappings.reduce((sum, mapping) => sum + mapping.confidence, 0) /
      Math.max(visibleMappings.length, 1)
  );
  const frameMapApproved = templateKit.frameMap.approval.status === "approved";

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Template Frame Map
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Approved layouts are bound to source slides before generation.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] ${
              frameMapApproved
                ? "bg-[#F3F3F3] text-[#188038]"
                : "bg-[#FFF1E8] text-[#B43C00]"
            }`}
          >
            {frameMapApproved ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            {frameMapApproved ? "Admin approved" : "Suggested map"}
          </div>
          <div className="flex items-center gap-2 rounded-md bg-[#F3F3F3] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-ink">
            <Lock className="h-3.5 w-3.5 text-brand-orange" />
            {averageConfidence}% confidence
          </div>
          <Button
            variant={frameMapApproved ? "secondary" : "primary"}
            className="h-9 shrink-0 whitespace-nowrap px-3"
            disabled={approvingFrameMap}
            onClick={onApproveFrameMap}
          >
            {approvingFrameMap ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Approve Map
          </Button>
          <Button
            variant="secondary"
            className="h-9 shrink-0 whitespace-nowrap px-3"
            disabled={exportingFrameMap}
            onClick={onExportFrameMap}
          >
            {exportingFrameMap ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export Map
          </Button>
          <Button
            className="h-9 shrink-0 whitespace-nowrap px-3"
            disabled={exportingCloneStarter}
            onClick={onExportCloneStarter}
          >
            {exportingCloneStarter ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileArchive className="h-4 w-4" />
            )}
            Export Starter
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-hidden">
          {visibleMappings.map((mapping) => (
            <div
              key={mapping.layoutId}
              className="grid gap-3 border-b border-[#EFEAE5] px-5 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_170px_96px]"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-bold text-brand-charcoal">
                  {mapping.layoutId}
                </p>
                <p className="mt-1 text-xs font-semibold capitalize text-[#787E89]">
                  {mapping.narrativeRole}
                </p>
                <p className="mt-1 truncate text-[11px] font-medium text-[#787E89]">
                  {mapping.evidence.join(" | ")}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                  Source Slide
                </p>
                <select
                  value={mapping.sourceSlide}
                  disabled={updatingLayoutId === mapping.layoutId}
                  onChange={(event) =>
                    onUpdateFrameMapping(
                      mapping.layoutId,
                      Number(event.currentTarget.value)
                    )
                  }
                  className="mt-1 h-8 w-full rounded-sm border border-[#D7CABF] bg-white px-2 font-mono text-xs font-black text-brand-charcoal outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 disabled:opacity-60"
                >
                  {templateKit.sourceSlides.map((slide) => (
                    <option key={slide.sourceSlide} value={slide.sourceSlide}>
                      {String(slide.sourceSlide).padStart(3, "0")} |{" "}
                      {((slide.layoutName ?? slide.textPreview) || "Slide").slice(
                        0,
                        42
                      )}
                    </option>
                  ))}
                </select>
                {mapping.evidence.some((item) => item.startsWith("admin_override")) && (
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.08em] text-brand-orange">
                    Admin override
                  </p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                  Confidence
                </p>
                <p className="mt-1 text-sm font-black text-brand-charcoal">
                  {mapping.confidence}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BrandContractPanel({
  brandContract,
  templateFileName,
  templateStatus,
  templateKit,
  brandAssets,
  templateUploading,
  assetUploading,
  onTemplateUpload,
  onAssetUpload
}: {
  brandContract: BrandContract;
  templateFileName: string;
  templateStatus: string;
  templateKit: TemplateKitSummary | null;
  brandAssets: BrandAssetSummary[];
  templateUploading: boolean;
  assetUploading: boolean;
  onTemplateUpload: (file: File | null) => void;
  onAssetUpload: (files: FileList | null) => void;
}) {
  const colors = Object.entries(brandContract.approved_color_tokens).slice(0, 7);
  const approvedColorSet = new Set(
    Object.values(brandContract.approved_color_tokens).map((color) =>
      color.toUpperCase()
    )
  );
  const approvedDetectedColorCount =
    templateKit?.detectedColors.filter((color) =>
      approvedColorSet.has(color.toUpperCase())
    ).length ?? 0;

  return (
    <aside className="overflow-y-auto border-r border-[#E5E0DB] bg-white p-6">
      <div className="space-y-7">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Brand Contract
          </h2>
          <div className="mt-3 flex items-center gap-2 rounded-md bg-[#F3F3F3] px-3 py-2 text-sm font-semibold text-brand-ink">
            <ShieldCheck className="h-4 w-4 text-brand-orange" />
            Active Brand Contract
          </div>
          <div className="mt-5">
            <div className="mb-4 flex h-9 items-center">
              <img
                src={brandContract.template_assets?.wordmark_black}
                alt="Procore template wordmark"
                className="h-6 w-auto object-contain"
              />
            </div>
            <p className="text-lg font-black text-brand-charcoal">
              {brandContract.companyName}
            </p>
            <p className="mt-1 text-sm text-[#787E89]">
              {brandContract.version}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Template Intake
          </h3>
          <div className="rounded-md border border-[#E5E0DB] bg-[#FBFAF9] p-3">
            <div className="flex items-start gap-3">
              {templateUploading ? (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-brand-orange" />
              ) : (
                <FileArchive className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-brand-charcoal">
                  {templateFileName}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#787E89]">
                  {templateStatus}
                </p>
              </div>
            </div>
            <label className="mt-3 block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#787E89]">
                Add PPTX Template
              </span>
              <Input
                type="file"
                accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                onChange={(event) =>
                  onTemplateUpload(event.currentTarget.files?.[0] ?? null)
                }
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-[#787E89]">
                Add Supporting Assets
              </span>
              <Input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/svg+xml"
                disabled={assetUploading}
                onChange={(event) => onAssetUpload(event.currentTarget.files)}
              />
              {assetUploading && (
                <span className="mt-2 flex items-center gap-2 text-xs font-semibold text-[#787E89]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-orange" />
                  Inspecting asset metadata
                </span>
              )}
            </label>
          </div>
          <div className="grid gap-2 text-xs font-semibold text-brand-ink">
            {[
              "Upload approved PPTX",
              "Lock assets, fonts, and layout IDs",
              "Generate only approved placeholders"
            ].map((step, index) => (
              <div key={step} className="flex items-center gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-sm bg-brand-orange font-mono text-[10px] text-white">
                  {index + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
          {templateKit && (
            <div className="space-y-3 rounded-md bg-[#F3F3F3] p-3">
              <div className="flex items-start gap-2">
                <Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#787E89]">
                    Fingerprint
                  </p>
                  <p className="mt-1 truncate font-mono text-xs font-semibold text-brand-ink">
                    {templateKit.fingerprint}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["Slides", templateKit.slideCount],
                  ["Layouts", templateKit.layoutCount],
                  ["Media", templateKit.mediaCount]
                ].map(([label, value]) => (
                  <div key={label} className="bg-white px-2 py-2">
                    <p className="text-base font-black text-brand-charcoal">
                      {value}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#787E89]">
                  <Type className="h-3.5 w-3.5 text-brand-orange" />
                  Fonts
                </div>
                <p className="mt-1 text-xs leading-5 text-brand-ink">
                  {templateKit.detectedFonts.slice(0, 4).join(", ") || "None detected"}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#787E89]">
                  <Palette className="h-3.5 w-3.5 text-brand-orange" />
                  Observed Colors
                </div>
                <p className="mt-1 text-[11px] font-semibold text-[#787E89]">
                  {approvedDetectedColorCount}/{templateKit.detectedColors.length} match
                  active contract tokens
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {templateKit.detectedColors.slice(0, 10).map((color) => (
                    <span
                      key={color}
                      title={color}
                      className="h-4 w-4 border border-[#D7CABF]"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          {brandAssets.length > 0 && (
            <div className="rounded-md bg-[#F3F3F3] px-3 py-2 text-xs font-semibold leading-5 text-brand-ink">
              {brandAssets.length} governed supporting asset
              {brandAssets.length === 1 ? "" : "s"} ready for admin review
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Color Tokens
          </h3>
          {colors.map(([name, value]) => (
            <div key={name} className="flex items-center justify-between text-sm">
              <span className="capitalize text-[#5F6368]">
                {name.replaceAll("_", " ")}
              </span>
              <span className="flex items-center gap-2 font-mono text-xs text-brand-ink">
                <span
                  className="h-4 w-4 rounded-sm border border-[#D7CABF]"
                  style={{ backgroundColor: value }}
                />
                {value}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Template Assets
          </h3>
          <div className="rounded-md bg-[#F3F3F3] px-3 py-3 text-sm leading-5 text-brand-ink">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4 text-brand-orange" />
              Approved PPTX assets loaded
            </div>
            <p className="mt-2 text-xs text-[#787E89]">
              Wordmark, texture, icon, and hero image assets are extracted from
              the 2025 presentation template.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Typography
          </h3>
          <div className="space-y-2 text-sm text-brand-ink">
            <div className="flex justify-between gap-4">
              <span className="text-[#787E89]">Heading</span>
              <span className="text-right font-semibold">
                {brandContract.approved_fonts.heading[0]}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#787E89]">Body</span>
              <span className="text-right font-semibold">
                {brandContract.approved_fonts.body[0]}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#787E89]">Mono</span>
              <span className="text-right font-semibold">
                {brandContract.approved_fonts.mono[0]}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              Approved Layouts
            </h3>
            <span className="text-xs font-bold text-brand-orange">
              {brandContract.approved_layouts.length}
            </span>
          </div>
          <div className="space-y-2">
            {brandContract.approved_layouts.map((layout) => (
              <div
                key={layout.layout_id}
                className="flex items-center gap-2 text-sm text-brand-ink"
              >
                <Layers3 className="h-3.5 w-3.5 shrink-0 text-[#787E89]" />
                <span className="truncate font-medium">{layout.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[#E5E0DB] pt-5">
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Rules Summary
          </h3>
          <div className="mt-3 space-y-3">
            <div className="flex gap-2 text-sm leading-5 text-brand-ink">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
              <span>
                AI may plan and draft content, but the renderer owns every brand decision.
              </span>
            </div>
            {brandContract.forbidden_rules.slice(0, 4).map((rule) => (
              <div key={rule} className="flex gap-2 text-sm leading-5 text-brand-ink">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

function BrandColorSettingsPanel({
  brandContract,
  defaultBrandContract,
  colorDraft,
  overriddenColorTokens,
  saving,
  resetting,
  onDraftChange,
  onSave,
  onReset
}: {
  brandContract: BrandContract;
  defaultBrandContract: BrandContract;
  colorDraft: Record<string, string>;
  overriddenColorTokens: string[];
  saving: boolean;
  resetting: boolean;
  onDraftChange: (token: string, value: string) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const tokenNames = Object.keys(defaultBrandContract.approved_color_tokens);
  const supportingTokens = tokenNames.filter(
    (token) => !CORE_BRAND_COLOR_TOKENS.includes(token)
  );
  const invalidTokens = tokenNames.filter(
    (token) => !isHexColor(colorDraft[token] ?? "")
  );
  const hasOverrides = overriddenColorTokens.length > 0;
  const previewAccent = isHexColor(colorDraft.primary_orange ?? "")
    ? colorDraft.primary_orange
    : brandContract.approved_color_tokens.primary_orange;
  const previewSoft = isHexColor(colorDraft.secondary_orange ?? "")
    ? colorDraft.secondary_orange
    : brandContract.approved_color_tokens.secondary_orange;
  const previewInk = isHexColor(colorDraft.ink ?? "")
    ? colorDraft.ink
    : brandContract.approved_color_tokens.ink;
  const previewFog = isHexColor(colorDraft.light_gray ?? "")
    ? colorDraft.light_gray
    : brandContract.approved_color_tokens.light_gray;
  const previewStone = isHexColor(colorDraft.stone ?? "")
    ? colorDraft.stone
    : brandContract.approved_color_tokens.stone;

  const renderTokenEditor = (token: string) => {
    const value =
      colorDraft[token] ??
      defaultBrandContract.approved_color_tokens[token] ??
      "#000000";
    const defaultValue =
      defaultBrandContract.approved_color_tokens[token] ?? "#000000";
    const safePickerValue = isHexColor(value) ? value : defaultValue;
    const isOverridden = overriddenColorTokens.includes(token);
    const invalid = !isHexColor(value);

    return (
      <div
        key={token}
        className={`grid gap-3 rounded-md bg-white p-3 ring-1 ${
          invalid ? "ring-[#B43C00]" : "ring-[#EFEAE5]"
        } sm:grid-cols-[minmax(0,1fr)_118px_42px] sm:items-center`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="h-5 w-5 shrink-0 rounded-sm border border-[#D7CABF]"
              style={{ backgroundColor: isHexColor(value) ? value : "#FFFFFF" }}
            />
            <p className="truncate text-sm font-black capitalize text-brand-charcoal">
              {brandColorTokenLabel(token)}
            </p>
          </div>
          <p className="mt-1 truncate text-[11px] font-semibold text-[#787E89]">
            Default {defaultValue}
            {isOverridden ? " - customized" : ""}
          </p>
        </div>
        <Input
          value={value}
          aria-label={`${brandColorTokenLabel(token)} hex value`}
          className="h-9 font-mono text-xs font-bold uppercase"
          onChange={(event) =>
            onDraftChange(token, event.currentTarget.value.toUpperCase())
          }
        />
        <input
          type="color"
          value={safePickerValue}
          aria-label={`${brandColorTokenLabel(token)} color picker`}
          className="h-9 w-full cursor-pointer rounded-sm border border-[#D7CABF] bg-white p-1"
          onChange={(event) =>
            onDraftChange(token, event.currentTarget.value.toUpperCase())
          }
        />
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Brand Colors
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#787E89]">
            Admin-managed tokens used by the app theme, validation, manifests,
            and deterministic renderer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={onReset}
            disabled={resetting || saving || !hasOverrides}
          >
            {resetting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Reset
          </Button>
          <Button
            onClick={onSave}
            disabled={saving || resetting || invalidTokens.length > 0}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Save Colors
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
                  Core Palette
                </p>
                <span className="text-xs font-bold text-brand-orange">
                  {invalidTokens.length > 0
                    ? `${invalidTokens.length} invalid`
                    : `${hasOverrides ? overriddenColorTokens.length : 0} custom`}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {CORE_BRAND_COLOR_TOKENS.map(renderTokenEditor)}
              </div>
            </div>

            <details className="rounded-md bg-[#F3F3F3] p-3">
              <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
                Supporting Tokens
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {supportingTokens.map(renderTokenEditor)}
              </div>
            </details>
          </div>

          <div
            className="min-h-[260px] rounded-md p-4 ring-1 ring-[#EFEAE5]"
            style={{ backgroundColor: previewFog }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
              Live Preview
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {tokenNames.slice(0, 8).map((token) => {
                const value =
                  colorDraft[token] ??
                  defaultBrandContract.approved_color_tokens[token];

                return (
                  <span
                    key={token}
                    title={`${brandColorTokenLabel(token)} ${value}`}
                    className="h-7 w-7 rounded-sm border border-white/80 shadow-sm"
                    style={{
                      backgroundColor: isHexColor(value) ? value : "#FFFFFF"
                    }}
                  />
                );
              })}
            </div>
            <div
              className="mt-5 rounded-md bg-white p-4"
              style={{ borderLeft: `4px solid ${previewAccent}` }}
            >
              <p
                className="text-lg font-black leading-6"
                style={{ color: previewInk }}
              >
                {brandContract.companyName}
              </p>
              <p className="mt-2 text-xs font-semibold leading-5 text-[#787E89]">
                Saved colors become the active contract for generated deck
                plans and renderer tokens.
              </p>
              <div className="mt-4 flex gap-2">
                <span
                  className="rounded-sm px-3 py-2 text-xs font-black text-white"
                  style={{ backgroundColor: previewAccent }}
                >
                  Primary
                </span>
                <span
                  className="rounded-sm px-3 py-2 text-xs font-black"
                  style={{
                    backgroundColor: previewSoft,
                    color: previewInk
                  }}
                >
                  Secondary
                </span>
              </div>
            </div>
            <div
              className="mt-4 rounded-md bg-white px-3 py-2 text-xs font-semibold leading-5"
              style={{ border: `1px solid ${previewStone}`, color: previewInk }}
            >
              Template-based exports inherit uploaded template artwork.
              Coordinate exports use the active token values.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsSectionNav({
  activeSection,
  onSectionChange,
  templateKit,
  brandPreflight,
  templateGovernance,
  customRecipes,
  overriddenColorTokens
}: {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  templateKit: TemplateKitSummary | null;
  brandPreflight: BrandPreflightReport | null;
  templateGovernance: TemplateGovernanceReport | null;
  customRecipes: DeckRecipe[];
  overriddenColorTokens: string[];
}) {
  const items = [
    {
      id: "brand" as const,
      label: "Brand",
      detail:
        overriddenColorTokens.length > 0
          ? `${overriddenColorTokens.length} custom color${overriddenColorTokens.length === 1 ? "" : "s"}`
          : "Colors and assets",
      icon: Palette
    },
    {
      id: "templates" as const,
      label: "Templates",
      detail: templateKit ? `${templateKit.slideCount} slides indexed` : "Upload PPTX",
      icon: FileArchive
    },
    {
      id: "governance" as const,
      label: "Governance",
      detail: templateGovernance
        ? `${templateGovernance.summary.governanceScore}% object map`
        : brandPreflight
          ? `${brandPreflight.readinessScore}% preflight`
          : "Preflight and maps",
      icon: Lock
    },
    {
      id: "recipes" as const,
      label: "Recipes",
      detail: `${customRecipes.length} custom`,
      icon: Layers3
    }
  ];

  return (
    <nav
      aria-label="Brand settings sections"
      className="grid gap-3 md:grid-cols-4"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeSection === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
            className={`min-h-[86px] rounded-md border px-4 py-3 text-left transition ${
              active
                ? "border-brand-orange bg-white shadow-sm"
                : "border-[#E5E0DB] bg-white hover:border-brand-orange"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
                {item.label}
              </span>
              <Icon
                className={`h-4 w-4 ${active ? "text-brand-orange" : "text-[#787E89]"}`}
              />
            </div>
            <p className="mt-3 text-xs font-semibold leading-5 text-[#787E89]">
              {item.detail}
            </p>
          </button>
        );
      })}
    </nav>
  );
}

function DeckOutline({ deckPlan }: { deckPlan: DeckPlan | null }) {
  const plannedSlides = deckPlan?.slides ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Deck Outline
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            {deckPlan
              ? `${plannedSlides.length} slides generated`
              : "Awaiting generated deck"}
          </p>
        </div>
        {deckPlan && (
          <div className="flex flex-wrap justify-end gap-2">
            {deckPlan.source_pack && (
              <span className="rounded-sm bg-[#FFF1E8] px-2 py-1 text-xs font-black uppercase tracking-[0.08em] text-[#6B2A00]">
                {deckPlan.source_pack.document_count} source
                {deckPlan.source_pack.document_count === 1 ? "" : "s"}
              </span>
            )}
            <span className="rounded-sm bg-[#F3F3F3] px-2 py-1 font-mono text-xs font-semibold text-brand-ink">
              {deckPlan.deck_type}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {plannedSlides.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm font-medium text-[#787E89]">
            Generate a plan to preview approved layouts.
          </div>
        ) : (
          <div className="overflow-hidden">
            {plannedSlides.map((slide, index) => (
              <div
                key={`${slide.layout_id}-${index}`}
                className="grid grid-cols-[40px_minmax(0,1fr)] items-center border-b border-[#EFEAE5] px-4 py-3 last:border-b-0 md:grid-cols-[48px_minmax(0,1fr)_240px]"
              >
                <span className="font-mono text-xs font-semibold text-[#787E89]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-brand-charcoal">
                    {slide.title}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#787E89]">
                    Approved template layout
                  </p>
                </div>
                <span className="col-start-2 mt-2 truncate rounded-sm bg-[#F3F3F3] px-2 py-1 font-mono text-xs font-semibold text-brand-ink md:col-start-auto md:mt-0">
                  {slide.layout_id}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AdminRecipeBuilder({
  brandContract,
  customRecipes,
  builder,
  onBuilderChange,
  onAddLayout,
  onRemoveLayout,
  onCreateRecipe,
  onDeleteRecipe
}: {
  brandContract: BrandContract;
  customRecipes: DeckRecipe[];
  builder: RecipeBuilderState;
  onBuilderChange: (builder: RecipeBuilderState) => void;
  onAddLayout: (layoutId: ApprovedLayoutId) => void;
  onRemoveLayout: (index: number) => void;
  onCreateRecipe: () => void;
  onDeleteRecipe: (recipeId: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Governed Recipe Builder
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Admin-created deck structures for new topics and audiences. Every
            slide still resolves to an approved template layout.
          </p>
        </div>
        <div className="rounded-sm bg-[#F3F3F3] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-ink">
          {customRecipes.length} custom
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              Recipe Name
            </span>
            <Input
              value={builder.name}
              onChange={(event) =>
                onBuilderChange({ ...builder, name: event.target.value })
              }
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              Audience
            </span>
            <Input
              value={builder.audience}
              onChange={(event) =>
                onBuilderChange({ ...builder, audience: event.target.value })
              }
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              Description
            </span>
            <Input
              value={builder.description}
              onChange={(event) =>
                onBuilderChange({
                  ...builder,
                  description: event.target.value
                })
              }
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              Routing Keywords
            </span>
            <Input
              value={builder.keywords}
              onChange={(event) =>
                onBuilderChange({ ...builder, keywords: event.target.value })
              }
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              Approved Layout Sequence
            </p>
            <div className="space-y-2 rounded-md border border-[#E5E0DB] bg-white p-3">
              {builder.layoutIds.map((layoutId, index) => {
                const layout = layoutDefinition(layoutId, brandContract);

                return (
                  <div
                    key={`${layoutId}-${index}`}
                    className="grid grid-cols-[28px_minmax(0,1fr)_72px] items-center gap-3 border-b border-[#EFEAE5] pb-2 last:border-b-0 last:pb-0"
                  >
                    <span className="font-mono text-xs font-bold text-[#787E89]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-brand-charcoal">
                        {layout?.name ?? layoutId}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[11px] font-semibold text-[#787E89]">
                        {layoutId}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      className="h-8 px-2 text-xs"
                      disabled={builder.layoutIds.length <= 3}
                      onClick={() => onRemoveLayout(index)}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              Add Layout
            </p>
            <div className="space-y-2">
              {brandContract.approved_layouts.map((layout) => (
                <button
                  key={layout.layout_id}
                  type="button"
                  disabled={builder.layoutIds.length >= MAX_ADMIN_RECIPE_LAYOUTS}
                  onClick={() => onAddLayout(layout.layout_id)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-[#E5E0DB] bg-white px-3 py-2 text-left text-xs font-bold text-brand-charcoal transition hover:border-brand-orange disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="truncate">{layout.name}</span>
                  <Layers3 className="h-3.5 w-3.5 shrink-0 text-brand-orange" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#E5E0DB] pt-4 md:flex-row md:items-center md:justify-between">
          <div className="text-xs font-semibold leading-5 text-[#787E89]">
            Custom recipes are saved to workspace storage. Exported manifests
            still prove the selected deck used approved layout IDs.
          </div>
          <Button onClick={onCreateRecipe}>
            <ShieldCheck className="h-4 w-4" />
            Save Governed Recipe
          </Button>
        </div>

        {customRecipes.length > 0 && (
          <div className="border-t border-[#E5E0DB] pt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              Admin Recipe Registry
            </p>
            <div className="space-y-2">
              {customRecipes.map((recipe) => (
                <div
                  key={recipe.recipe_id}
                  className="grid gap-3 rounded-md bg-[#F3F3F3] px-3 py-3 md:grid-cols-[minmax(0,1fr)_112px_84px]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-brand-charcoal">
                      {recipe.name}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-[#787E89]">
                      {recipe.audience}
                    </p>
                  </div>
                  <p className="self-center text-xs font-black uppercase tracking-[0.08em] text-brand-ink">
                    {recipe.slide_sequence.length} layouts
                  </p>
                  <Button
                    variant="secondary"
                    className="h-8 px-2 text-xs"
                    onClick={() => onDeleteRecipe(recipe.recipe_id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeckRecipePanel({
  selectedRecipeId,
  deckPlan,
  customRecipes,
  onSelectedRecipeIdChange
}: {
  selectedRecipeId: string;
  deckPlan: DeckPlan | null;
  customRecipes: DeckRecipe[];
  onSelectedRecipeIdChange: (recipeId: string) => void;
}) {
  const recipeLibrary = [...approvedDeckRecipes, ...customRecipes];

  return (
    <Card>
      <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Deck Type
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Pick a preset, or let BrandDeck choose the right approved structure
            from the prompt.
          </p>
        </div>
        <div className="rounded-sm bg-[#F3F3F3] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-ink">
          {recipeLibrary.length} options
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              Structure
            </span>
            <select
              value={selectedRecipeId}
              onChange={(event) => onSelectedRecipeIdChange(event.target.value)}
              className="h-11 w-full rounded-md border border-[#D7CABF] bg-white px-3 text-sm font-semibold text-brand-ink shadow-sm outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="auto">Auto-select from prompt</option>
              {recipeLibrary.map((recipe) => (
                <option key={recipe.recipe_id} value={recipe.recipe_id}>
                  {recipe.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3">
            {recipeLibrary.map((recipe) => {
              const isSelected =
                deckPlan?.deck_recipe_id === recipe.recipe_id ||
                (!deckPlan && selectedRecipeId === recipe.recipe_id);
              const isCustom = recipe.recipe_id.startsWith("admin_custom_");

              return (
                <button
                  key={recipe.recipe_id}
                  type="button"
                  onClick={() => onSelectedRecipeIdChange(recipe.recipe_id)}
                  className={`rounded-md border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-brand-orange bg-[#FFF7F2]"
                      : "border-[#E5E0DB] bg-white hover:border-[#D7CABF]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-brand-charcoal">
                        {recipe.name}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#787E89]">
                        {recipe.description}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-sm px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${
                        isCustom
                          ? "bg-[#FFF1E8] text-[#6B2A00]"
                          : recipe.mode === "predefined"
                          ? "bg-[#F3F3F3] text-brand-ink"
                          : "bg-[#111111] text-white"
                      }`}
                    >
                      {isCustom
                        ? "Admin"
                        : recipe.mode === "predefined"
                          ? "Preset"
                          : "Ad hoc"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-brand-ink">
                    <Layers3 className="h-3.5 w-3.5 text-brand-orange" />
                    Baseline {recipe.slide_sequence.length} slides; expands with
                    context and meeting length
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompactDeckRecipePicker({
  selectedRecipeId,
  deckPlan,
  customRecipes,
  onSelectedRecipeIdChange
}: {
  selectedRecipeId: string;
  deckPlan: DeckPlan | null;
  customRecipes: DeckRecipe[];
  onSelectedRecipeIdChange: (recipeId: string) => void;
}) {
  const recipeLibrary = [...approvedDeckRecipes, ...customRecipes];
  const generatedRecipe =
    deckPlan?.deck_recipe_id
      ? recipeLibrary.find((recipe) => recipe.recipe_id === deckPlan.deck_recipe_id)
      : undefined;
  const autoSelected = selectedRecipeId === "auto";

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Deck Type
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Choose auto-selection or one approved preset for this deck.
          </p>
        </div>
        <div className="rounded-sm bg-[#F3F3F3] px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-ink">
          {recipeLibrary.length} approved
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => onSelectedRecipeIdChange("auto")}
            className={`rounded-md border px-4 py-3 text-left transition ${
              autoSelected
                ? "border-brand-orange bg-[#FFF7F2] shadow-sm"
                : "border-[#E5E0DB] bg-white hover:border-[#D7CABF]"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-black text-brand-charcoal">
                  Auto-select from prompt
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-[#787E89]">
                  BrandDeck chooses the best approved structure after it reads the
                  request.
                </p>
              </div>
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
            </div>
            <p className="mt-3 text-xs font-bold text-brand-ink">
              {generatedRecipe && autoSelected
                ? `Generated with ${generatedRecipe.name}`
                : "Recommended for most decks"}
            </p>
          </button>

          {recipeLibrary.map((recipe) => {
            const isSelected = selectedRecipeId === recipe.recipe_id;
            const isCustom = recipe.recipe_id.startsWith("admin_custom_");

            return (
              <button
                key={recipe.recipe_id}
                type="button"
                onClick={() => onSelectedRecipeIdChange(recipe.recipe_id)}
                className={`rounded-md border px-4 py-3 text-left transition ${
                  isSelected
                    ? "border-brand-orange bg-[#FFF7F2] shadow-sm"
                    : "border-[#E5E0DB] bg-white hover:border-[#D7CABF]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-brand-charcoal">
                      {recipe.name}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#787E89]">
                      {recipe.description}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-sm px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${
                      isCustom
                        ? "bg-[#FFF1E8] text-[#6B2A00]"
                        : recipe.mode === "predefined"
                          ? "bg-[#F3F3F3] text-brand-ink"
                          : "bg-[#111111] text-white"
                    }`}
                  >
                    {isCustom
                      ? "Admin"
                      : recipe.mode === "predefined"
                        ? "Preset"
                        : "Ad hoc"}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-brand-ink">
                  <Layers3 className="h-3.5 w-3.5 text-brand-orange" />
                  Baseline {recipe.slide_sequence.length} slides; expands with context
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function SnapshotInput({
  label,
  value,
  onChange,
  placeholder,
  inputMode = "text",
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal";
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-brand-charcoal">
        {label}
      </span>
      <Input
        value={value}
        inputMode={inputMode}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SnapshotTextarea({
  label,
  value,
  onChange,
  placeholder,
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-brand-charcoal">
        {label}
      </span>
      <Textarea
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        className="min-h-[86px]"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ClientProfilePanel({
  selectedProfileId,
  profileContext,
  workflowBusy,
  onSelectProfile,
  onProfileContextChange,
  onClearProfile
}: {
  selectedProfileId: string;
  profileContext: string;
  workflowBusy: boolean;
  onSelectProfile: (profileId: string) => void;
  onProfileContextChange: (value: string) => void;
  onClearProfile: () => void;
}) {
  const selectedProfile = CLIENT_PROFILES.find(
    (profile) => profile.id === selectedProfileId
  );

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Client Profile
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Reuse known tools, priorities, and account context so every deck
            stays continuous.
          </p>
        </div>
        {selectedProfile && (
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={onClearProfile}
            disabled={workflowBusy}
          >
            Clear Profile
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          {CLIENT_PROFILES.map((profile) => {
            const isSelected = profile.id === selectedProfileId;

            return (
              <button
                key={profile.id}
                type="button"
                disabled={workflowBusy}
                onClick={() => onSelectProfile(profile.id)}
                className={`rounded-md border px-4 py-3 text-left transition ${
                  isSelected
                    ? "border-brand-orange bg-[#FFF7F2] shadow-sm"
                    : "border-[#E5E0DB] bg-white hover:border-[#D7CABF]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-brand-charcoal">
                      {profile.name}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#787E89]">
                      {profile.segment} | {profile.stage}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#188038]" />
                  )}
                </div>
                <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-brand-ink">
                  {profile.focus}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {profile.tools.slice(0, 4).map((tool) => (
                    <span
                      key={tool}
                      className="rounded-sm bg-[#F3F3F3] px-2 py-1 text-[10px] font-bold text-[#787E89]"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Continuity Context
          </span>
          <Textarea
            value={profileContext}
            disabled={workflowBusy}
            placeholder="Add client tools, purchased modules, goals, rollout status, renewal context, stakeholders, or product areas this deck should account for."
            className="min-h-[118px]"
            onChange={(event) => onProfileContextChange(event.target.value)}
          />
          <p className="mt-2 text-xs font-semibold leading-5 text-[#787E89]">
            This becomes planner evidence for the client, not a visual design
            instruction.
          </p>
        </label>
      </CardContent>
    </Card>
  );
}

function BusinessDataCard({
  businessSnapshot,
  kpiSummary,
  workflowBusy,
  onSnapshotChange,
  onUseExample
}: {
  businessSnapshot: BusinessSnapshotState;
  kpiSummary: {
    client?: string;
    period?: string;
    activeUsers: number;
    licensedUsers: number;
    adoptionScore: number;
  } | null;
  workflowBusy: boolean;
  onSnapshotChange: (field: keyof BusinessSnapshotState, value: string) => void;
  onUseExample: () => void;
}) {
  const update =
    (field: keyof BusinessSnapshotState) => (value: string) =>
      onSnapshotChange(field, value);

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Metrics Snapshot
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Confirm the few numbers needed to ground the deck. Everything else
            can stay optional.
          </p>
        </div>
        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={onUseExample}
          disabled={workflowBusy}
        >
          <Sparkles className="h-4 w-4" />
          Use Example Metrics
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <SnapshotInput
                label="Client"
                value={businessSnapshot.client_name}
                disabled={workflowBusy}
                placeholder="Harborview Civil Partners"
                onChange={update("client_name")}
              />
              <SnapshotInput
                label="Current Period"
                value={businessSnapshot.report_period}
                disabled={workflowBusy}
                placeholder="June 2026"
                onChange={update("report_period")}
              />
              <SnapshotInput
                label="Adoption Score"
                value={businessSnapshot.adoption_score}
                inputMode="numeric"
                disabled={workflowBusy}
                placeholder="76"
                onChange={update("adoption_score")}
              />
              <SnapshotInput
                label="Active Users"
                value={businessSnapshot.active_users}
                inputMode="numeric"
                disabled={workflowBusy}
                placeholder="244"
                onChange={update("active_users")}
              />
              <SnapshotInput
                label="Licensed Users"
                value={businessSnapshot.licensed_users}
                inputMode="numeric"
                disabled={workflowBusy}
                placeholder="325"
                onChange={update("licensed_users")}
              />
              <SnapshotInput
                label="Active Projects"
                value={businessSnapshot.projects_active}
                inputMode="numeric"
                disabled={workflowBusy}
                placeholder="24"
                onChange={update("projects_active")}
              />
            </div>

            <details className="rounded-md border border-[#E5E0DB] bg-white px-4 py-3">
              <summary className="cursor-pointer text-sm font-black text-brand-charcoal">
                Trend baseline and mobile usage
              </summary>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <SnapshotInput
                  label="Prior Period"
                  value={businessSnapshot.previous_report_period}
                  disabled={workflowBusy}
                  placeholder="May 2026"
                  onChange={update("previous_report_period")}
                />
                <SnapshotInput
                  label="Prior Adoption"
                  value={businessSnapshot.previous_adoption_score}
                  inputMode="numeric"
                  disabled={workflowBusy}
                  placeholder="73"
                  onChange={update("previous_adoption_score")}
                />
                <SnapshotInput
                  label="Prior Users"
                  value={businessSnapshot.previous_active_users}
                  inputMode="numeric"
                  disabled={workflowBusy}
                  placeholder="213"
                  onChange={update("previous_active_users")}
                />
                <SnapshotInput
                  label="Mobile Usage"
                  value={businessSnapshot.mobile_usage_rate}
                  inputMode="numeric"
                  disabled={workflowBusy}
                  placeholder="61"
                  onChange={update("mobile_usage_rate")}
                />
                <SnapshotInput
                  label="Prior Mobile"
                  value={businessSnapshot.previous_mobile_usage_rate}
                  inputMode="numeric"
                  disabled={workflowBusy}
                  placeholder="59"
                  onChange={update("previous_mobile_usage_rate")}
                />
              </div>
            </details>

            <details className="rounded-md border border-[#E5E0DB] bg-white px-4 py-3">
              <summary className="cursor-pointer text-sm font-black text-brand-charcoal">
                Workflow signals
              </summary>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <SnapshotInput
                  label="Daily Logs"
                  value={businessSnapshot.daily_logs_count}
                  inputMode="numeric"
                  disabled={workflowBusy}
                  placeholder="1840"
                  onChange={update("daily_logs_count")}
                />
                <SnapshotInput
                  label="RFIs"
                  value={businessSnapshot.rfi_count}
                  inputMode="numeric"
                  disabled={workflowBusy}
                  placeholder="286"
                  onChange={update("rfi_count")}
                />
                <SnapshotInput
                  label="Submittals"
                  value={businessSnapshot.submittals_count}
                  inputMode="numeric"
                  disabled={workflowBusy}
                  placeholder="350"
                  onChange={update("submittals_count")}
                />
                <SnapshotInput
                  label="Top Workflow"
                  value={businessSnapshot.top_feature}
                  disabled={workflowBusy}
                  placeholder="Daily Logs"
                  onChange={update("top_feature")}
                />
                <SnapshotInput
                  label="Lowest Workflow"
                  value={businessSnapshot.lowest_feature}
                  disabled={workflowBusy}
                  placeholder="Submittals"
                  onChange={update("lowest_feature")}
                />
              </div>
            </details>

            <details className="rounded-md border border-[#E5E0DB] bg-white px-4 py-3">
              <summary className="cursor-pointer text-sm font-black text-brand-charcoal">
                Risks and actions
              </summary>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <SnapshotTextarea
                  label="Risk Summary"
                  value={businessSnapshot.risk_summary}
                  disabled={workflowBusy}
                  placeholder="What should the deck call out?"
                  onChange={update("risk_summary")}
                />
                <div className="space-y-3">
                  <SnapshotInput
                    label="Recommendation 1"
                    value={businessSnapshot.recommendation_1}
                    disabled={workflowBusy}
                    placeholder="Assign a workflow owner"
                    onChange={update("recommendation_1")}
                  />
                  <SnapshotInput
                    label="Recommendation 2"
                    value={businessSnapshot.recommendation_2}
                    disabled={workflowBusy}
                    placeholder="Review response targets weekly"
                    onChange={update("recommendation_2")}
                  />
                  <SnapshotInput
                    label="Recommendation 3"
                    value={businessSnapshot.recommendation_3}
                    disabled={workflowBusy}
                    placeholder="Reinforce field habits"
                    onChange={update("recommendation_3")}
                  />
                </div>
              </div>
            </details>
          </div>

          <div
            className={`border-l-2 px-4 py-3 transition ${
              kpiSummary
                ? "border-brand-orange bg-[#FFF7F2]"
                : "border-[#D7CABF] bg-[#F3F3F3]"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#787E89]">
              Current Snapshot
            </p>
            <p className="mt-2 text-sm font-bold text-brand-charcoal">
              {kpiSummary ? kpiSummary.client : "Add account details"}
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-[#787E89]">
              {kpiSummary
                ? `${kpiSummary.period} | ${kpiSummary.activeUsers}/${kpiSummary.licensedUsers} users | ${kpiSummary.adoptionScore}% score`
                : "Client, period, active users, licensed users, and adoption score are required."}
            </p>
            <div className="mt-4 space-y-2 border-t border-[#E5E0DB] pt-3 text-xs font-semibold leading-5 text-[#787E89]">
              <p>Client profiles and source notes can enrich the plan.</p>
              <p>
                BrandDeck uses these values as evidence while the brand contract
                controls layout and visual decisions.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
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

function ConnectedContextPanel({
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
                Next
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

        <div className="flex items-start gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold leading-5 text-[#787E89] ring-1 ring-[#EFEAE5]">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-orange" />
          <span>
            Connected sources can shape claims, recommendations, and source
            references. The active brand contract still controls layouts,
            colors, typography, and asset placement.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function SourcePackPanel({
  sourceDocuments,
  sourceNotes,
  ingestingSources,
  onSourceUpload,
  onSourceNotesChange,
  onClearSources
}: {
  sourceDocuments: SourceDocumentSummary[];
  sourceNotes: string;
  ingestingSources: boolean;
  onSourceUpload: (files: FileList | null) => void;
  onSourceNotesChange: (value: string) => void;
  onClearSources: () => void;
}) {
  const attachedCount = sourceDocuments.length + (sourceNotes.trim() ? 1 : 0);
  const totalCharacters =
    sourceDocuments.reduce((sum, document) => sum + document.characters, 0) +
    sourceNotes.trim().length;

  return (
    <Card>
      <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
            Manual Context
          </h2>
          <p className="mt-1 text-sm text-[#787E89]">
            Add one-off notes or files that should shape claims, risks, and
            recommendations.
          </p>
        </div>
        <div className="rounded-sm bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-ink ring-1 ring-[#EFEAE5]">
          {attachedCount} context source{attachedCount === 1 ? "" : "s"}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-md bg-[#F3F3F3] p-4 ring-1 ring-[#EFEAE5]">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
                Upload Docs
              </span>
              <Input
                type="file"
                multiple
                accept=".txt,.md,.markdown,.text,text/plain,text/markdown"
                disabled={ingestingSources}
                onChange={(event) => onSourceUpload(event.currentTarget.files)}
              />
            </label>
            <p className="mt-3 text-xs font-semibold leading-5 text-[#787E89]">
              Useful for meeting notes, briefs, transcripts, and source excerpts
              that are not yet connected.
            </p>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
              Context Notes
            </span>
            <Textarea
              value={sourceNotes}
              maxLength={4000}
              onChange={(event) => onSourceNotesChange(event.target.value)}
              placeholder="Paste meeting notes, audience priorities, implementation context, or excerpts the deck should cite."
              className="min-h-[138px]"
            />
            <div className="mt-2 flex items-center justify-between text-xs font-medium text-[#787E89]">
              <span>
                {totalCharacters.toLocaleString()} characters available
              </span>
              <span>{sourceNotes.length} / 4000</span>
            </div>
          </label>
        </div>

        <div className="flex items-start gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold leading-5 text-[#787E89] ring-1 ring-[#EFEAE5]">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-orange" />
          <span>
            Context shapes deck claims only. Layouts, colors, fonts, and assets
            stay locked to the active brand contract.
          </span>
        </div>

        <div className="border-t border-[#E5E0DB] pt-3">
          {sourceDocuments.length === 0 ? (
            <div className="rounded-md border border-dashed border-[#D7CABF] px-3 py-4 text-center text-sm font-medium text-[#787E89]">
              No docs uploaded yet. Notes can still be used as source context.
            </div>
          ) : (
            <div className="space-y-2">
              {sourceDocuments.map((document) => (
                <div
                  key={document.id}
                  className="grid gap-3 rounded-md bg-white px-3 py-2 ring-1 ring-[#EFEAE5] md:grid-cols-[minmax(0,1fr)_100px]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-brand-charcoal">
                      {document.name}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-[#787E89]">
                      {document.type} context for slide-level evidence refs
                    </p>
                  </div>
                  <p className="self-center text-right font-mono text-xs font-bold text-brand-ink">
                    {document.characters.toLocaleString()} chars
                  </p>
                </div>
              ))}
            </div>
          )}
          {(sourceDocuments.length > 0 || sourceNotes.trim()) && (
            <Button
              variant="secondary"
              className="mt-3 h-9 px-3"
              onClick={onClearSources}
            >
              Clear Source Context
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [selectedRecipeId, setSelectedRecipeId] = useState("auto");
  const [customRecipes, setCustomRecipes] = useState<DeckRecipe[]>([]);
  const [recipeBuilder, setRecipeBuilder] =
    useState<RecipeBuilderState>(DEFAULT_RECIPE_BUILDER);
  const [businessSnapshot, setBusinessSnapshot] =
    useState<BusinessSnapshotState>(EMPTY_BUSINESS_SNAPSHOT);
  const [selectedClientProfileId, setSelectedClientProfileId] = useState("");
  const [clientProfileContext, setClientProfileContext] = useState("");
  const [csvRows, setCsvRows] = useState<AdoptionCsvRow[]>([]);
  const [sourceDocuments, setSourceDocuments] = useState<SourceDocumentSummary[]>([]);
  const [sourceNotes, setSourceNotes] = useState("");
  const [googleDriveStatus, setGoogleDriveStatus] =
    useState<GoogleDriveConnectorStatus | null>(null);
  const [activeGoogleSourceType, setActiveGoogleSourceType] =
    useState<GoogleWorkspaceSourceType | null>(null);
  const [googleDriveQuery, setGoogleDriveQuery] = useState("");
  const [googleDriveResults, setGoogleDriveResults] = useState<
    GoogleDriveFileOption[]
  >([]);
  const [selectedGoogleDriveFileIds, setSelectedGoogleDriveFileIds] = useState<
    string[]
  >([]);
  const [deckPlan, setDeckPlan] = useState<DeckPlan | null>(null);
  const [validationReport, setValidationReport] =
    useState<ValidationReport | null>(null);
  const [accuracyAudit, setAccuracyAudit] =
    useState<DeckAccuracyAudit | null>(null);
  const [exportCertificate, setExportCertificate] =
    useState<ExportCertificate | null>(null);
  const [templateFileName, setTemplateFileName] = useState(
    defaultBrandContract.template_source?.name ?? "No template selected"
  );
  const [templateStatus, setTemplateStatus] = useState(
    "Active renderer uses the approved template contract."
  );
  const [workspaceStatus, setWorkspaceStatus] = useState(
    "Workspace persistence is enabled for uploaded templates and governed assets."
  );
  const [templateKit, setTemplateKit] = useState<TemplateKitSummary | null>(null);
  const [templateGovernance, setTemplateGovernance] =
    useState<TemplateGovernanceReport | null>(null);
  const [brandPreflight, setBrandPreflight] =
    useState<BrandPreflightReport | null>(null);
  const [brandAssets, setBrandAssets] = useState<BrandAssetSummary[]>([]);
  const [templateUploading, setTemplateUploading] = useState(false);
  const [assetUploading, setAssetUploading] = useState(false);
  const [updatingAssetId, setUpdatingAssetId] = useState("");
  const [notice, setNotice] = useState("");
  const [ingestingSources, setIngestingSources] = useState(false);
  const [searchingGoogleDrive, setSearchingGoogleDrive] = useState(false);
  const [importingGoogleDrive, setImportingGoogleDrive] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preparingExport, setPreparingExport] = useState(false);
  const [auditingExport, setAuditingExport] = useState(false);
  const [exportingFrameMap, setExportingFrameMap] = useState(false);
  const [exportingCloneStarter, setExportingCloneStarter] = useState(false);
  const [exportingManifest, setExportingManifest] = useState(false);
  const [exportingObjectMap, setExportingObjectMap] = useState(false);
  const [importingObjectMap, setImportingObjectMap] = useState(false);
  const [resettingObjectMap, setResettingObjectMap] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [approvingFrameMap, setApprovingFrameMap] = useState(false);
  const [updatingFrameMapLayoutId, setUpdatingFrameMapLayoutId] = useState("");
  const [promotingTemplateAssetEntry, setPromotingTemplateAssetEntry] = useState("");
  const [templateAssetRoles, setTemplateAssetRoles] = useState<
    Record<string, BrandAssetSummary["role"]>
  >({});
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("generate");
  const [activeCreatorStep, setActiveCreatorStep] =
    useState<CreatorWorkflowStep>("brief");
  const [settingsSection, setSettingsSection] =
    useState<SettingsSection>("brand");
  const [activeBrandContract, setActiveBrandContract] =
    useState<BrandContract>(defaultBrandContract);
  const [brandColorDraft, setBrandColorDraft] = useState<Record<string, string>>(
    { ...defaultBrandContract.approved_color_tokens }
  );
  const [overriddenColorTokens, setOverriddenColorTokens] = useState<string[]>([]);
  const [savingBrandColors, setSavingBrandColors] = useState(false);
  const [resettingBrandColors, setResettingBrandColors] = useState(false);

  const currentRow = csvRows[csvRows.length - 1];

  useEffect(() => {
    let cancelled = false;

    async function restoreLocalWorkspace() {
      try {
        const [
          assetResponse,
          templateResponse,
          recipeResponse,
          brandContractResponse
        ] = await Promise.all([
          fetch("/api/brand-assets"),
          fetch("/api/template-intake"),
          fetch("/api/deck-recipes"),
          fetch("/api/brand-contract")
        ]);
        const assetResult = (await assetResponse.json()) as {
          assets?: BrandAssetSummary[];
        };
        const templateResult = (await templateResponse.json()) as {
          templateKits?: TemplateKitSummary[];
        };
        const recipeResult = (await recipeResponse.json()) as {
          recipes?: DeckRecipe[];
        };
        const brandContractResult =
          (await brandContractResponse.json()) as BrandContractApiResponse;

        if (cancelled) {
          return;
        }

        const restoredAssets = assetResult.assets ?? [];
        const restoredRecipes = recipeResult.recipes ?? [];
        const restoredBrandContract =
          brandContractResult.brandContract ?? defaultBrandContract;
        const restoredTemplate =
          templateResult.templateKits?.slice().sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
          )[0] ?? null;

        setBrandAssets(restoredAssets);
        setCustomRecipes(restoredRecipes);
        setActiveBrandContract(restoredBrandContract);
        setBrandColorDraft({
          ...restoredBrandContract.approved_color_tokens
        });
        setOverriddenColorTokens(brandContractResult.overriddenColorTokens ?? []);

        if (restoredTemplate) {
          setTemplateKit(restoredTemplate);
          setTemplateFileName(restoredTemplate.templateName);
          setTemplateStatus(
            `Restored ${restoredTemplate.slideCount} slides, ${restoredTemplate.layoutCount} layouts, and ${restoredTemplate.mediaCount} media assets from workspace storage.`
          );
          await refreshTemplateGovernance(restoredTemplate.id, deckPlan);
          await refreshBrandPreflight(restoredTemplate.id, deckPlan);
        }

        setWorkspaceStatus(
          restoredTemplate || restoredAssets.length > 0 || restoredRecipes.length > 0
            ? `Restored ${restoredTemplate ? "1 template kit" : "0 template kits"}, ${restoredAssets.length} governed asset${restoredAssets.length === 1 ? "" : "s"}, and ${restoredRecipes.length} custom recipe${restoredRecipes.length === 1 ? "" : "s"} from workspace storage.`
            : "Workspace persistence is ready. Uploaded templates and governed assets will be restored after server restarts."
        );
      } catch {
        if (!cancelled) {
          setWorkspaceStatus(
            "Workspace persistence is available, but no saved workspace could be restored."
          );
        }
      }
    }

    restoreLocalWorkspace();
    refreshGoogleDriveStatus();

    const connectorParams = new URLSearchParams(window.location.search);
    if (connectorParams.get("connector") === "google-drive") {
      setWorkspaceView("generate");
      setActiveCreatorStep("context");

      if (connectorParams.get("connector_status") === "connected") {
        setNotice("Google Drive connected. Search for source files to attach.");
      } else if (connectorParams.get("connector_error")) {
        setNotice(
          `Google Drive connection failed: ${connectorParams.get("connector_error")}`
        );
      }

      window.history.replaceState({}, "", window.location.pathname);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const hasFreshExportCertificate = Boolean(
    exportCertificate &&
      exportCertificate.packageAudit === "passed" &&
      (!templateKit ||
        exportCertificate.frameMapFingerprint ===
          templateKit.frameMap.approval.mappingFingerprint)
  );
  const canExport = Boolean(
    deckPlan &&
      validationReport?.passed &&
      accuracyAudit?.passed &&
      (!templateKit ||
        (brandPreflight?.status === "ready" && hasFreshExportCertificate))
  );
  const kpiSummary = useMemo(() => {
    if (!currentRow) {
      return null;
    }

    const activeUsers = Number(currentRow.active_users);
    const licensedUsers = Number(currentRow.licensed_users);
    const adoptionScore = Number(currentRow.adoption_score);

    return {
      client: currentRow.client_name,
      period: currentRow.report_period,
      activeUsers,
      licensedUsers,
      adoptionScore
    };
  }, [currentRow]);
  const promptReady = prompt.trim().length > 0;
  const dataReady = csvRows.length > 0;
  const deckReady = Boolean(
    deckPlan && validationReport?.passed && accuracyAudit?.passed
  );
  const sourceContextCount =
    sourceDocuments.length +
    (sourceNotes.trim() ? 1 : 0) +
    (clientProfileContext.trim() ? 1 : 0);

  function resetGeneratedDeck() {
    setDeckPlan(null);
    setValidationReport(null);
    setAccuracyAudit(null);
    setExportCertificate(null);
  }

  async function refreshGoogleDriveStatus() {
    try {
      const response = await fetch("/api/connectors/google-drive/status");
      const result = (await response.json()) as GoogleDriveConnectorStatus;

      setGoogleDriveStatus(result);
    } catch {
      setGoogleDriveStatus({
        configured: false,
        connected: false,
        error: "Unable to read Google Drive connector status."
      });
    }
  }

  function handleConnectGoogleDrive() {
    window.location.href = "/api/connectors/google-drive/auth";
  }

  async function handleDisconnectGoogleDrive() {
    setNotice("");

    try {
      await fetch("/api/connectors/google-drive/status", {
        method: "DELETE"
      });
      setGoogleDriveStatus((current) => ({
        ...(current ?? { configured: true }),
        connected: false
      }));
      setActiveGoogleSourceType(null);
      setGoogleDriveResults([]);
      setSelectedGoogleDriveFileIds([]);
      setNotice("Google Drive disconnected.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to disconnect Google Drive."
      );
    }
  }

  function handleOpenGoogleSourcePicker(sourceType: GoogleWorkspaceSourceType) {
    setActiveGoogleSourceType(sourceType);
    setGoogleDriveQuery("");
    setGoogleDriveResults([]);
    setSelectedGoogleDriveFileIds([]);
    setNotice("");
  }

  function handleCloseGoogleSourcePicker() {
    setActiveGoogleSourceType(null);
    setSelectedGoogleDriveFileIds([]);
  }

  function handleToggleGoogleDriveFile(fileId: string) {
    setSelectedGoogleDriveFileIds((current) =>
      current.includes(fileId)
        ? current.filter((id) => id !== fileId)
        : [...current, fileId].slice(0, 6)
    );
  }

  async function handleSearchGoogleDrive() {
    setSearchingGoogleDrive(true);
    setNotice("");

    try {
      const response = await fetch(
        `/api/connectors/google-drive/search?q=${encodeURIComponent(
          googleDriveQuery
        )}&type=${encodeURIComponent(activeGoogleSourceType ?? "all")}`
      );
      const result = (await response.json()) as {
        files?: GoogleDriveFileOption[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to search Google Drive.");
      }

      setGoogleDriveResults(result.files ?? []);
      setSelectedGoogleDriveFileIds([]);
      setNotice(
        `${result.files?.length ?? 0} Google Drive source file${
          (result.files?.length ?? 0) === 1 ? "" : "s"
        } found.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to search Google Drive."
      );
    } finally {
      setSearchingGoogleDrive(false);
    }
  }

  async function handleImportGoogleDriveFiles() {
    if (selectedGoogleDriveFileIds.length === 0) {
      return;
    }

    setImportingGoogleDrive(true);
    setNotice("");
    resetGeneratedDeck();

    try {
      const response = await fetch("/api/connectors/google-drive/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileIds: selectedGoogleDriveFileIds
        })
      });
      const result = (await response.json()) as GoogleDriveImportResponse;

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to import Google Drive files.");
      }

      const documents = result.documents ?? [];

      if (documents.length === 0) {
        throw new Error("Selected Google Drive files did not include readable text.");
      }

      setSourceDocuments((current) => [...current, ...documents].slice(0, 6));
      setActiveGoogleSourceType(null);
      setSelectedGoogleDriveFileIds([]);
      setNotice(
        `${documents.length} Google Drive source${
          documents.length === 1 ? "" : "s"
        } attached for planner evidence.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to import Google Drive files."
      );
    } finally {
      setImportingGoogleDrive(false);
    }
  }

  function handleStartOver() {
    setPrompt(DEFAULT_PROMPT);
    setSelectedRecipeId("auto");
    setSelectedClientProfileId("");
    setClientProfileContext("");
    setBusinessSnapshot(EMPTY_BUSINESS_SNAPSHOT);
    setCsvRows([]);
    setSourceDocuments([]);
    setSourceNotes("");
    setActiveGoogleSourceType(null);
    setGoogleDriveQuery("");
    setGoogleDriveResults([]);
    setSelectedGoogleDriveFileIds([]);
    resetGeneratedDeck();
    setActiveCreatorStep("brief");
    setWorkspaceView("generate");
    setNotice("Started a new presentation request. Brand settings and saved templates are unchanged.");
  }

  function applyBusinessSnapshot(
    snapshot: BusinessSnapshotState,
    noticeMessage?: string
  ) {
    setBusinessSnapshot(snapshot);
    setCsvRows(businessSnapshotToRows(snapshot));
    resetGeneratedDeck();
    if (noticeMessage) {
      setNotice(noticeMessage);
    } else {
      setNotice("");
    }
  }

  function handleBusinessSnapshotChange(
    field: keyof BusinessSnapshotState,
    value: string
  ) {
    const nextSnapshot = {
      ...businessSnapshot,
      [field]: value
    };
    applyBusinessSnapshot(nextSnapshot);
  }

  function handleUseExampleSnapshot() {
    applyBusinessSnapshot(
      EXAMPLE_BUSINESS_SNAPSHOT,
      "Example account snapshot loaded. Update any metric or context before generating."
    );
  }

  function handleSelectClientProfile(profileId: string) {
    const profile = CLIENT_PROFILES.find((item) => item.id === profileId);

    if (!profile) {
      return;
    }

    setSelectedClientProfileId(profile.id);
    setClientProfileContext(profile.context);
    applyBusinessSnapshot(
      profile.snapshot,
      `${profile.name} profile loaded with tools, context, and reporting metrics.`
    );
  }

  function handleClientProfileContextChange(value: string) {
    setClientProfileContext(value);
    resetGeneratedDeck();
    setNotice("");
  }

  function handleClearClientProfile() {
    setSelectedClientProfileId("");
    setClientProfileContext("");
    resetGeneratedDeck();
    setNotice("Client profile cleared. Metrics and source notes are unchanged.");
  }

  function applyBrandContractResponse(result: BrandContractApiResponse) {
    if (!result.brandContract) {
      throw new Error(result.error ?? "Brand contract update failed.");
    }

    setActiveBrandContract(result.brandContract);
    setBrandColorDraft({
      ...result.brandContract.approved_color_tokens
    });
    setOverriddenColorTokens(result.overriddenColorTokens ?? []);

    if (deckPlan) {
      setValidationReport(validateDeckPlan(deckPlan, result.brandContract));
    }
  }

  function handleBrandColorDraftChange(token: string, value: string) {
    setBrandColorDraft((current) => ({
      ...current,
      [token]: value
    }));
    setExportCertificate(null);
  }

  async function handleSaveBrandColors() {
    const invalidTokens = Object.entries(brandColorDraft)
      .filter(([, value]) => !isHexColor(value))
      .map(([token]) => brandColorTokenLabel(token));

    if (invalidTokens.length > 0) {
      setNotice(`Fix invalid color values: ${invalidTokens.join(", ")}.`);
      return;
    }

    setSavingBrandColors(true);
    setNotice("");
    setExportCertificate(null);

    try {
      const response = await fetch("/api/brand-contract", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          approved_color_tokens: brandColorDraft
        })
      });
      const result = (await response.json()) as BrandContractApiResponse;

      if (!response.ok) {
        throw new Error(result.error ?? "Brand color update failed.");
      }

      applyBrandContractResponse(result);
      await refreshBrandPreflight(templateKit?.id, deckPlan);
      setNotice(
        `${result.brandContract?.companyName ?? "Brand"} colors saved. The active contract and export guardrails now use these tokens.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to save brand colors."
      );
    } finally {
      setSavingBrandColors(false);
    }
  }

  async function handleResetBrandColors() {
    setResettingBrandColors(true);
    setNotice("");
    setExportCertificate(null);

    try {
      const response = await fetch("/api/brand-contract", {
        method: "DELETE"
      });
      const result = (await response.json()) as BrandContractApiResponse;

      if (!response.ok) {
        throw new Error(result.error ?? "Brand color reset failed.");
      }

      applyBrandContractResponse(result);
      await refreshBrandPreflight(templateKit?.id, deckPlan);
      setNotice("Brand colors reset to the default contract.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to reset brand colors."
      );
    } finally {
      setResettingBrandColors(false);
    }
  }

  function handleAddRecipeLayout(layoutId: ApprovedLayoutId) {
    setRecipeBuilder((current) => ({
      ...current,
      layoutIds: [...current.layoutIds, layoutId].slice(
        0,
        MAX_ADMIN_RECIPE_LAYOUTS
      )
    }));
    setExportCertificate(null);
  }

  function handleRemoveRecipeLayout(index: number) {
    setRecipeBuilder((current) => ({
      ...current,
      layoutIds: current.layoutIds.filter((_, itemIndex) => itemIndex !== index)
    }));
    setExportCertificate(null);
  }

  async function handleCreateCustomRecipe() {
    setNotice("");
    setExportCertificate(null);

    try {
      const recipe = recipeFromBuilder(recipeBuilder, [
        ...approvedDeckRecipes,
        ...customRecipes
      ], activeBrandContract);
      const response = await fetch("/api/deck-recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ recipe })
      });
      const result = (await response.json()) as {
        recipe?: DeckRecipe;
        recipes?: DeckRecipe[];
        error?: string;
      };

      if (!response.ok || !result.recipe) {
        throw new Error(result.error ?? "Unable to save governed recipe.");
      }

      setCustomRecipes(result.recipes ?? []);
      setSelectedRecipeId(result.recipe.recipe_id);
      setNotice(
        `${result.recipe.name} saved as an admin-governed recipe with ${result.recipe.slide_sequence.length} approved layouts.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to save governed recipe."
      );
    }
  }

  async function handleDeleteCustomRecipe(recipeId: string) {
    const recipe = customRecipes.find((item) => item.recipe_id === recipeId);

    try {
      const response = await fetch("/api/deck-recipes", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ recipeId })
      });
      const result = (await response.json()) as {
        recipes?: DeckRecipe[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to delete governed recipe.");
      }

      setCustomRecipes(result.recipes ?? []);

      if (selectedRecipeId === recipeId) {
        setSelectedRecipeId("auto");
      }

      setDeckPlan(null);
      setValidationReport(null);
      setAccuracyAudit(null);
      setExportCertificate(null);
      setNotice(
        recipe
          ? `${recipe.name} removed from the admin recipe registry.`
          : "Custom recipe removed from the admin recipe registry."
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to delete governed recipe."
      );
    }
  }

  async function handleSourceUpload(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    setIngestingSources(true);
    setNotice("");
    resetGeneratedDeck();

    try {
      const documents = await Promise.all(
        selectedFiles.map(async (file) => {
          const text = await file.text();
          return createSourceDocument(file.name, text, "document");
        })
      );
      const validDocuments = documents.filter(
        (document) => document.text.trim().length > 0
      );

      if (validDocuments.length === 0) {
        throw new Error("Uploaded source files did not include readable text.");
      }

      setSourceDocuments((current) => [...current, ...validDocuments].slice(0, 6));
      setNotice(
        `${validDocuments.length} source document${
          validDocuments.length === 1 ? "" : "s"
        } attached for planner evidence.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to ingest source files."
      );
    } finally {
      setIngestingSources(false);
    }
  }

  function handleClearSourcePack() {
    setSourceDocuments([]);
    setSourceNotes("");
    resetGeneratedDeck();
    setNotice(
      "Source context cleared. The next deck will use business data and prompt evidence only."
    );
  }

  async function refreshTemplateGovernance(
    templateKitId: string,
    plan?: DeckPlan | null
  ) {
    const response = await fetch("/api/template-governance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        templateKitId,
        deckPlan: plan
      })
    });
    const result = (await response.json()) as TemplateGovernanceReport & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(result.error ?? "Template governance check failed.");
    }

    setTemplateGovernance(result);
    return result;
  }

  async function refreshBrandPreflight(
    templateKitId?: string,
    plan?: DeckPlan | null
  ) {
    const response = await fetch("/api/brand-preflight", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        templateKitId,
        deckPlan: plan
      })
    });
    const result = (await response.json()) as BrandPreflightReport & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(result.error ?? "Brand preflight failed.");
    }

    setBrandPreflight(result);
    return result;
  }

  async function handleTemplateUpload(file: File | null) {
    if (!file) {
      return;
    }

    setTemplateFileName(file.name);
    setTemplateStatus("Inspecting template...");
    setTemplateUploading(true);
    setExportCertificate(null);

    try {
      const formData = new FormData();
      formData.append("template", file);
      const response = await fetch("/api/template-intake", {
        method: "POST",
        body: formData
      });
      const result = (await response.json()) as TemplateKitSummary & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Template intake failed.");
      }

      setTemplateKit(result);
      await refreshTemplateGovernance(result.id, deckPlan);
      await refreshBrandPreflight(result.id, deckPlan);
      setTemplateStatus(
        `Indexed ${result.slideCount} slides, ${result.layoutCount} layouts, and ${result.mediaCount} media assets.`
      );
      setNotice(
        "Template kit indexed and governed for template export."
      );
    } catch (error) {
      setTemplateKit(null);
      setTemplateGovernance(null);
      setBrandPreflight(null);
      setTemplateStatus(
        "Template intake failed. The active contract remains in use."
      );
      setNotice(error instanceof Error ? error.message : "Template intake failed.");
    } finally {
      setTemplateUploading(false);
    }
  }

  async function handleAssetUpload(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    setAssetUploading(true);
    setNotice("");
    setExportCertificate(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("assets", file));
      const response = await fetch("/api/brand-assets", {
        method: "POST",
        body: formData
      });
      const result = (await response.json()) as {
        inventory?: BrandAssetSummary[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Brand asset upload failed.");
      }

      setBrandAssets(result.inventory ?? []);
      await refreshBrandPreflight(templateKit?.id, deckPlan);
      setNotice(
        `${selectedFiles.length} brand asset${
          selectedFiles.length === 1 ? "" : "s"
        } fingerprinted and added to the governed inventory.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to ingest brand assets."
      );
    } finally {
      setAssetUploading(false);
    }
  }

  async function handleAssetRoleUpdate(
    assetId: string,
    role: BrandAssetSummary["role"]
  ) {
    setUpdatingAssetId(assetId);
    setNotice("");
    setExportCertificate(null);

    try {
      const response = await fetch("/api/brand-assets", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: assetId,
          role
        })
      });
      const result = (await response.json()) as {
        inventory?: BrandAssetSummary[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Brand asset update failed.");
      }

      setBrandAssets(result.inventory ?? []);
      await refreshBrandPreflight(templateKit?.id, deckPlan);
      setNotice("Brand asset role approved and preflight refreshed.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to update brand asset."
      );
    } finally {
      setUpdatingAssetId("");
    }
  }

  async function handlePromoteTemplateAsset(
    entry: string,
    role: BrandAssetSummary["role"]
  ) {
    if (!templateKit) {
      return;
    }

    setPromotingTemplateAssetEntry(entry);
    setNotice("");
    setExportCertificate(null);

    try {
      const response = await fetch("/api/template-assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          templateKitId: templateKit.id,
          entry,
          role
        })
      });
      const result = (await response.json()) as {
        inventory?: BrandAssetSummary[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Template asset promotion failed.");
      }

      setBrandAssets(result.inventory ?? []);
      await refreshBrandPreflight(templateKit.id, deckPlan);
      setNotice(
        `${entry.replace(/^ppt\/media\//, "")} approved as ${role.replaceAll(
          "_",
          " "
        )} and added to the governed brand inventory.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to promote template asset."
      );
    } finally {
      setPromotingTemplateAssetEntry("");
    }
  }

  async function handleApproveFrameMap() {
    if (!templateKit) {
      return;
    }

    setApprovingFrameMap(true);
    setNotice("");
    setExportCertificate(null);

    try {
      const response = await fetch("/api/template-frame-map", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          templateKitId: templateKit.id,
          action: "approve"
        })
      });
      const result = (await response.json()) as {
        templateKit?: TemplateKitSummary;
        governance?: TemplateGovernanceReport;
        error?: string;
      };

      if (!response.ok || !result.templateKit) {
        const failedSlides =
          result.governance?.outputSlides.filter(
            (slide) => slide.status !== "ready"
          ) ?? [];
        const failedDetail =
          failedSlides.length > 0
            ? ` ${failedSlides
                .map(
                  (slide) =>
                    `${slide.layoutId} -> slide ${String(
                      slide.sourceSlide
                    ).padStart(3, "0")}`
                )
                .join(", ")} need mapping review.`
            : "";

        throw new Error(
          `${result.error ?? "Frame-map approval failed."}${failedDetail}`
        );
      }

      setTemplateKit(result.templateKit);
      await refreshTemplateGovernance(result.templateKit.id, deckPlan);
      await refreshBrandPreflight(result.templateKit.id, deckPlan);
      setNotice(
        `Frame map approved for ${result.templateKit.templateName}. Clone/edit export now requires this approved mapping fingerprint.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to approve frame map."
      );
    } finally {
      setApprovingFrameMap(false);
    }
  }

  async function handleFrameMappingUpdate(layoutId: string, sourceSlide: number) {
    if (!templateKit) {
      return;
    }

    setUpdatingFrameMapLayoutId(layoutId);
    setNotice("");
    setExportCertificate(null);

    try {
      const mappings = templateKit.frameMap.outputSlides.map((mapping) => ({
        layoutId: mapping.layoutId,
        sourceSlide:
          mapping.layoutId === layoutId ? sourceSlide : mapping.sourceSlide
      }));
      const response = await fetch("/api/template-frame-map", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          templateKitId: templateKit.id,
          mappings
        })
      });
      const result = (await response.json()) as {
        templateKit?: TemplateKitSummary;
        error?: string;
      };

      if (!response.ok || !result.templateKit) {
        throw new Error(result.error ?? "Frame-map update failed.");
      }

      setTemplateKit(result.templateKit);
      await refreshTemplateGovernance(result.templateKit.id, deckPlan);
      await refreshBrandPreflight(result.templateKit.id, deckPlan);
      setNotice(
        `${layoutId} now uses source slide ${String(sourceSlide).padStart(
          3,
          "0"
        )}. Governance and preflight refreshed.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to update frame map."
      );
    } finally {
      setUpdatingFrameMapLayoutId("");
    }
  }

  function buildSourcePack() {
    return [
      ...(clientProfileContext.trim()
        ? [createSourceDocument("Client profile", clientProfileContext, "brief")]
        : []),
      ...sourceDocuments.map(({ characters: _characters, ...document }) => document),
      ...(sourceNotes.trim()
        ? [createSourceDocument("Creator documentation notes", sourceNotes, "notes")]
        : [])
    ] satisfies SourceDocument[];
  }

  async function buildValidatedDeckPlan() {
    const rows = csvRows;

    if (rows.length === 0) {
      throw new Error(
        "Add the required account snapshot fields before generating."
      );
    }

    const sourcePack = buildSourcePack();
    const response = await fetch("/api/generate-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        csvRows: rows,
        recipeId: selectedRecipeId === "auto" ? undefined : selectedRecipeId,
        customRecipes,
        sourceDocuments: sourcePack
      })
    });
    const result = (await response.json()) as GeneratePlanApiResponse;

    if (
      !response.ok ||
      !result.deckPlan ||
      !result.validationReport ||
      !result.accuracyAudit
    ) {
      throw new Error(result.error ?? "Unable to generate a governed deck.");
    }

    const plan = result.deckPlan;
    const report = result.validationReport;
    const accuracy = result.accuracyAudit;
    const planningMode = result.planningMode ?? "deterministic";

    setDeckPlan(plan);
    setValidationReport(report);
    setAccuracyAudit(accuracy);
    setExportCertificate(null);

    if (templateKit) {
      await refreshTemplateGovernance(templateKit.id, plan);
    }

    const preflight = await refreshBrandPreflight(templateKit?.id, plan);

    return {
      plan,
      report,
      accuracy,
      planningMode,
      plannerModel: result.plannerModel,
      plannerFallbackReason: result.plannerFallbackReason,
      sourcePack,
      preflight
    };
  }

  async function runTemplateExportAudit(plan: DeckPlan) {
    if (!templateKit) {
      throw new Error("Upload a PPTX template before checking export readiness.");
    }

    const response = await fetch("/api/export-audit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        deckPlan: plan,
        templateKitId: templateKit.id
      })
    });
    const result = (await response.json()) as {
      certificate?: ExportCertificate;
      error?: string;
    };

    if (!response.ok || !result.certificate) {
      throw new Error(result.error ?? "Export audit failed.");
    }

    setExportCertificate(result.certificate);
    return result.certificate;
  }

  async function approveReadyFrameMapForExport(plan: DeckPlan) {
    if (!templateKit) {
      throw new Error("Upload a PPTX template before approving a frame map.");
    }

    const response = await fetch("/api/template-frame-map", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        templateKitId: templateKit.id,
        action: "approve"
      })
    });
    const result = (await response.json()) as {
      templateKit?: TemplateKitSummary;
      error?: string;
    };

    if (!response.ok || !result.templateKit) {
      throw new Error(result.error ?? "Frame-map approval failed.");
    }

    setTemplateKit(result.templateKit);
    await refreshTemplateGovernance(result.templateKit.id, plan);
    return refreshBrandPreflight(result.templateKit.id, plan);
  }

  async function prepareGeneratedDeckForExport({
    plan,
    report,
    accuracy,
    planningMode,
    plannerModel,
    plannerFallbackReason,
    sourcePack,
    preflight
  }: {
    plan: DeckPlan;
    report: ValidationReport;
    accuracy: DeckAccuracyAudit;
    planningMode: NonNullable<GeneratePlanApiResponse["planningMode"]>;
    plannerModel?: string;
    plannerFallbackReason?: string;
    sourcePack: SourceDocument[];
    preflight: BrandPreflightReport;
  }) {
    const plannerPrefix =
      planningMode === "openai_structured_outputs"
        ? `AI-assisted planner${plannerModel ? ` (${plannerModel})` : ""}: `
        : planningMode === "openai_fallback_deterministic"
          ? `Deterministic fallback${plannerFallbackReason ? " after AI guardrail review" : ""}: `
          : "Deterministic planner: ";

    if (!report.passed) {
      return `${plannerPrefix}Deck generated, but brand validation needs admin review before export.`;
    }

    if (!accuracy.passed) {
      return `${plannerPrefix}Deck generated, but content grounding needs review before export.`;
    }

    if (!templateKit) {
      return `${plannerPrefix}Deck generated and ready to export with ${plan.slides.length} slides${
        sourcePack.length > 0
          ? ` and ${sourcePack.length} source document${sourcePack.length === 1 ? "" : "s"} cited`
          : ""
      }.`;
    }

    let exportPreflight = preflight;

    if (exportPreflight.status !== "ready") {
      const failedPreflightIds = exportPreflight.checks
        .filter((check) => !check.passed)
        .map((check) => check.id);

      if (
        failedPreflightIds.length === 1 &&
        failedPreflightIds[0] === "frame-map:approval"
      ) {
        exportPreflight = await approveReadyFrameMapForExport(plan);
      }
    }

    if (exportPreflight.status !== "ready") {
      return `${plannerPrefix}Deck generated, but Brand Settings need review before export.`;
    }

    setAuditingExport(true);
    const certificate = await runTemplateExportAudit(plan);

    return `${plannerPrefix}Deck generated and ready to export: ${certificate.referencedSlides} slides, ${certificate.placeholderHits} placeholder hits, ${certificate.brandValidationScore} brand validation.`;
  }

  async function handleGenerate() {
    setActiveCreatorStep("export");
    setGenerating(true);
    setPreparingExport(true);
    setAuditingExport(false);
    setNotice("");

    try {
      const generation = await buildValidatedDeckPlan();
      const message = await prepareGeneratedDeckForExport(generation);
      setNotice(message);
    } catch (error) {
      setDeckPlan(null);
      setValidationReport(null);
      setAccuracyAudit(null);
      setExportCertificate(null);
      setNotice(error instanceof Error ? error.message : "Unable to generate deck.");
    } finally {
      setAuditingExport(false);
      setPreparingExport(false);
      setGenerating(false);
    }
  }

  async function handleExport() {
    if (!deckPlan) {
      return;
    }

    setExporting(true);
    setNotice("");

    try {
      const useTemplateCloneEdit = Boolean(templateKit);
      const response = await fetch(
        useTemplateCloneEdit ? "/api/clone-edit" : "/api/export",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            deckPlan,
            templateKitId: templateKit?.id,
            frameMap: templateKit?.frameMap,
            fidelityMode: templateKit
              ? "template_clone_edit"
              : "default_coordinate_export"
          })
        }
      );

      if (!response.ok) {
        const errorBody = (await response.json()) as { error?: string };
        throw new Error(errorBody.error ?? "PPTX export failed.");
      }

      const packageAudit = response.headers.get("X-BrandDeck-Package-Audit");
      const referencedSlides = response.headers.get("X-BrandDeck-Referenced-Slides");
      const placeholderHits = response.headers.get("X-BrandDeck-Placeholder-Hits");
      const renderer = response.headers.get("X-BrandDeck-Renderer");
      const frameMapApproval = response.headers.get("X-BrandDeck-Frame-Map-Approval");
      const frameMapFingerprint = response.headers.get(
        "X-BrandDeck-Frame-Map-Fingerprint"
      );
      const frameMapCoverage = response.headers.get(
        "X-BrandDeck-Frame-Map-Coverage"
      );
      const objectGovernanceScore = response.headers.get(
        "X-BrandDeck-Object-Governance-Score"
      );
      const editableObjects = response.headers.get(
        "X-BrandDeck-Editable-Objects"
      );
      const objectBindingSource = response.headers.get(
        "X-BrandDeck-Object-Binding-Source"
      );
      const objectBindingFingerprint = response.headers.get(
        "X-BrandDeck-Object-Binding-Fingerprint"
      );
      const missingRelationships = response.headers.get(
        "X-BrandDeck-Missing-Relationships"
      );
      const brandValidationScore = response.headers.get(
        "X-BrandDeck-Brand-Validation-Score"
      );
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = safeDownloadFileName(deckPlan);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setExportCertificate(
        useTemplateCloneEdit
          ? {
              renderer: renderer ?? "template-clone-edit",
              packageAudit: packageAudit ?? "passed",
              frameMapApproval: frameMapApproval ?? "approved",
              frameMapFingerprint: frameMapFingerprint ?? "",
              frameMapCoverage: frameMapCoverage ?? "",
              objectGovernanceScore: objectGovernanceScore
                ? `${objectGovernanceScore}%`
                : "",
              editableObjects: editableObjects ?? "",
              objectBindingSource: objectBindingSource ?? "",
              objectBindingFingerprint: objectBindingFingerprint ?? "",
              referencedSlides: referencedSlides ?? "9",
              missingRelationships: missingRelationships ?? "0",
              placeholderHits: placeholderHits ?? "0",
              brandValidationScore: brandValidationScore
                ? `${brandValidationScore}%`
                : "100%"
            }
          : null
      );
      setNotice(
        useTemplateCloneEdit
          ? `PPTX exported. Package audit: ${
              packageAudit ?? "passed"
            }, ${referencedSlides ?? "9"} slides, ${
              placeholderHits ?? "0"
            } placeholder hits.`
          : "PPTX exported."
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to export PPTX.");
    } finally {
      setExporting(false);
    }
  }

  async function handleExportFrameMap() {
    if (!templateKit) {
      setNotice("Upload a PPTX template before exporting a frame map.");
      return;
    }

    setExportingFrameMap(true);
    setNotice("");

    try {
      const response = await fetch("/api/template-frame-map", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          templateKitId: templateKit.id,
          deckPlan
        })
      });

      if (!response.ok) {
        const errorBody = (await response.json()) as { error?: string };
        throw new Error(errorBody.error ?? "Frame-map export failed.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${templateKit.templateName.replace(/\.pptx$/i, "")}_template_frame_map.json`
        .replace(/[^a-z0-9_.-]+/gi, "_")
        .replace(/_+/g, "_");
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setNotice("Template frame map exported for governed rendering.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to export frame map."
      );
    } finally {
      setExportingFrameMap(false);
    }
  }

  async function handleExportBrandKitManifest() {
    if (!templateKit) {
      setNotice("Upload a PPTX template before exporting a brand kit manifest.");
      return;
    }

    setExportingManifest(true);
    setNotice("");

    try {
      const response = await fetch("/api/brand-kit-manifest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          templateKitId: templateKit.id,
          deckPlan
        })
      });

      if (!response.ok) {
        const errorBody = (await response.json()) as { error?: string };
        throw new Error(errorBody.error ?? "Brand kit manifest export failed.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${templateKit.templateName.replace(/\.pptx$/i, "")}_brand_kit_manifest.json`
        .replace(/[^a-z0-9_.-]+/gi, "_")
        .replace(/_+/g, "_");
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setNotice("Brand kit manifest exported with template, asset, governance, and preflight controls.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to export brand kit manifest."
      );
    } finally {
      setExportingManifest(false);
    }
  }

  async function handleExportObjectMap() {
    if (!templateKit) {
      setNotice("Upload a PPTX template before exporting an object map.");
      return;
    }

    setExportingObjectMap(true);
    setNotice("");

    try {
      const response = await fetch("/api/template-object-map", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          templateKitId: templateKit.id,
          deckPlan
        })
      });

      if (!response.ok) {
        const errorBody = (await response.json()) as { error?: string };
        throw new Error(errorBody.error ?? "Object-map export failed.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${templateKit.templateName.replace(/\.pptx$/i, "")}_template_object_map.json`
        .replace(/[^a-z0-9_.-]+/gi, "_")
        .replace(/_+/g, "_");
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setNotice(
        "Template object map exported with editable object IDs, data bindings, and renderer boundary controls."
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to export template object map."
      );
    } finally {
      setExportingObjectMap(false);
    }
  }

  async function handleImportObjectMap(file: File | null) {
    if (!templateKit || !file) {
      return;
    }

    setImportingObjectMap(true);
    setNotice("");
    setExportCertificate(null);

    try {
      const objectMap = JSON.parse(await file.text()) as unknown;
      const response = await fetch("/api/template-object-map", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          templateKitId: templateKit.id,
          objectMap,
          deckPlan,
          importedBy: "Brand admin"
        })
      });
      const result = (await response.json()) as {
        bindingSet?: {
          bindingFingerprint: string;
          targets: unknown[];
        };
        governance?: TemplateGovernanceReport;
        error?: string;
      };

      if (!response.ok || !result.governance || !result.bindingSet) {
        throw new Error(result.error ?? "Object-map import failed.");
      }

      setTemplateGovernance(result.governance);
      await refreshBrandPreflight(templateKit.id, deckPlan);
      setNotice(
        `Object map imported with ${result.bindingSet.targets.length} governed bindings. Fingerprint ${result.bindingSet.bindingFingerprint.slice(0, 16)} locked for this template kit.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to import object map."
      );
    } finally {
      setImportingObjectMap(false);
    }
  }

  async function handleResetObjectMap() {
    if (!templateKit) {
      return;
    }

    setResettingObjectMap(true);
    setNotice("");
    setExportCertificate(null);

    try {
      const response = await fetch("/api/template-object-map", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          templateKitId: templateKit.id,
          deckPlan
        })
      });
      const result = (await response.json()) as {
        governance?: TemplateGovernanceReport;
        error?: string;
      };

      if (!response.ok || !result.governance) {
        throw new Error(result.error ?? "Object-map reset failed.");
      }

      setTemplateGovernance(result.governance);
      await refreshBrandPreflight(templateKit.id, deckPlan);
      setNotice(
        result.governance.summary.bindingSource === "built_in_procore"
          ? "Object map reset to the built-in template binding seed."
          : "Object map reset. This template now needs an admin-imported object map before template export."
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to reset object map."
      );
    } finally {
      setResettingObjectMap(false);
    }
  }

  async function handleExportCloneStarter() {
    if (!templateKit) {
      setNotice("Upload a PPTX template before exporting a clone starter.");
      return;
    }

    setExportingCloneStarter(true);
    setNotice("");

    try {
      const response = await fetch("/api/clone-starter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          templateKitId: templateKit.id,
          deckPlan
        })
      });

      if (!response.ok) {
        const errorBody = (await response.json()) as { error?: string };
        throw new Error(errorBody.error ?? "Clone-starter export failed.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${templateKit.templateName.replace(/\.pptx$/i, "")}_clone_starter.pptx`
        .replace(/[^a-z0-9_.-]+/gi, "_")
        .replace(/_+/g, "_");
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setNotice(
        "Clone starter exported from mapped source slides. It preserves the template assets and is ready for in-place placeholder editing."
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to export clone starter."
      );
    } finally {
      setExportingCloneStarter(false);
    }
  }

  const brandThemeStyle = {
    "--brand-accent":
      activeBrandContract.approved_color_tokens.primary_orange ?? "#FF5200",
    "--brand-accent-soft":
      activeBrandContract.approved_color_tokens.secondary_orange ?? "#F97D40",
    "--brand-charcoal":
      activeBrandContract.approved_color_tokens.charcoal ?? "#1D1B1A",
    "--brand-ink": activeBrandContract.approved_color_tokens.ink ?? "#3A3735",
    "--brand-stone": activeBrandContract.approved_color_tokens.stone ?? "#D7CABF",
    "--brand-fog":
      activeBrandContract.approved_color_tokens.light_gray ?? "#F3F3F3"
  } as CSSProperties;
  const workflowBusy =
    generating || preparingExport || auditingExport || exporting;
  const showExportRail =
    workspaceView === "settings" ||
    (workspaceView === "generate" &&
      activeCreatorStep === "export" &&
      (Boolean(deckPlan) ||
        generating ||
        preparingExport ||
        auditingExport ||
        exporting));

  return (
    <main
      className="min-h-screen bg-white text-brand-charcoal"
      style={brandThemeStyle}
    >
      <header className="flex h-14 items-center justify-between bg-[#111111] px-6 text-white">
        <div className="flex items-center gap-9">
          <div className="text-xl font-black">
            BrandDeck <span className="text-brand-orange">Studio</span>
          </div>
          <nav className="hidden items-center gap-2 text-sm font-semibold text-white/82 md:flex">
            {[
              ["generate", "Generate"],
              ["settings", "Brand Settings"]
            ].map(([view, label]) => (
              <button
                key={view}
                type="button"
                onClick={() => setWorkspaceView(view as WorkspaceView)}
                className={`rounded-md px-3 py-1.5 transition ${
                  workspaceView === view
                    ? "bg-white text-[#111111]"
                    : "text-white/78 hover:bg-white/10 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.08em] text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" />
          Brand Governed
        </div>
      </header>

      <div
        className={`grid min-h-[calc(100vh-3.5rem)] grid-cols-1 ${
          workspaceView === "generate"
            ? showExportRail
              ? "lg:grid-cols-[minmax(0,1fr)_360px]"
              : "lg:grid-cols-[minmax(0,1fr)]"
            : "lg:grid-cols-[304px_minmax(0,1fr)_360px]"
        }`}
      >
        {workspaceView === "settings" && (
          <BrandContractPanel
            brandContract={activeBrandContract}
            templateFileName={templateFileName}
            templateStatus={templateStatus}
            templateKit={templateKit}
            brandAssets={brandAssets}
            templateUploading={templateUploading}
            assetUploading={assetUploading}
            onTemplateUpload={handleTemplateUpload}
            onAssetUpload={handleAssetUpload}
          />
        )}

        <section className="min-w-0 bg-[#FBFAF9] px-6 py-6 xl:px-10">
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-normal text-brand-charcoal">
                  {workspaceView === "generate"
                    ? "Generate Presentation"
                    : "Brand Settings"}
                </h1>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#787E89]">
                  {workspaceView === "generate"
                    ? "Describe the deck you need, add relevant context, and BrandDeck will prepare a brand-governed export without letting prompts change the visual system."
                    : "Admins maintain the brand contract, approved templates, object maps, assets, and deck recipes that keep every generated presentation on brand."}
                </p>
              </div>
              {workspaceView === "generate" && (
                <Button
                  variant="secondary"
                  className="w-full shrink-0 sm:w-auto"
                  onClick={handleStartOver}
                  disabled={workflowBusy}
                >
                  <RotateCcw className="h-4 w-4" />
                  Start Over
                </Button>
              )}
            </div>
            {workspaceView === "settings" && (
              <div className="grid gap-3 text-sm font-semibold text-[#787E89] md:grid-cols-3">
                {["Upload Brand Kit", "Map Objects", "Publish Controls"].map(
                  (step, index) => (
                    <div key={step} className="flex items-center gap-3">
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${
                          index === 0
                            ? "bg-brand-orange text-white"
                            : "bg-white text-[#787E89] ring-1 ring-[#D7CABF]"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="text-brand-ink">{step}</span>
                      {index < 2 && (
                        <span className="hidden h-px flex-1 bg-[#D7CABF] md:block" />
                      )}
                    </div>
                  )
                )}
              </div>
            )}

            {workspaceView === "settings" ? (
              <>
                <SettingsSectionNav
                  activeSection={settingsSection}
                  onSectionChange={setSettingsSection}
                  templateKit={templateKit}
                  brandPreflight={brandPreflight}
                  templateGovernance={templateGovernance}
                  customRecipes={customRecipes}
                  overriddenColorTokens={overriddenColorTokens}
                />

                {settingsSection === "brand" && (
                  <>
                    <BrandKitReadiness
                      brandContract={activeBrandContract}
                      templateKit={templateKit}
                      brandAssets={brandAssets}
                      workspaceStatus={workspaceStatus}
                    />

                    <BrandColorSettingsPanel
                      brandContract={activeBrandContract}
                      defaultBrandContract={defaultBrandContract}
                      colorDraft={brandColorDraft}
                      overriddenColorTokens={overriddenColorTokens}
                      saving={savingBrandColors}
                      resetting={resettingBrandColors}
                      onDraftChange={handleBrandColorDraftChange}
                      onSave={handleSaveBrandColors}
                      onReset={handleResetBrandColors}
                    />

                    <BrandAssetInventory
                      assets={brandAssets}
                      updatingAssetId={updatingAssetId}
                      onUpdateRole={handleAssetRoleUpdate}
                    />
                  </>
                )}

                {settingsSection === "templates" && (
                  <>
                    <TemplateOnboardingWorkbench
                      brandContract={activeBrandContract}
                      templateKit={templateKit}
                      brandAssets={brandAssets}
                      brandPreflight={brandPreflight}
                      templateGovernance={templateGovernance}
                      customRecipes={customRecipes}
                    />

                    <TemplateAssetLibrary
                      templateKit={templateKit}
                      templateAssetRoles={templateAssetRoles}
                      promotingEntry={promotingTemplateAssetEntry}
                      onRoleChange={(entry, role) =>
                        setTemplateAssetRoles((current) => ({
                          ...current,
                          [entry]: role
                        }))
                      }
                      onPromote={handlePromoteTemplateAsset}
                    />

                    <FrameMapPreview
                      templateKit={templateKit}
                      exportingFrameMap={exportingFrameMap}
                      exportingCloneStarter={exportingCloneStarter}
                      approvingFrameMap={approvingFrameMap}
                      updatingLayoutId={updatingFrameMapLayoutId}
                      onExportFrameMap={handleExportFrameMap}
                      onExportCloneStarter={handleExportCloneStarter}
                      onApproveFrameMap={handleApproveFrameMap}
                      onUpdateFrameMapping={handleFrameMappingUpdate}
                    />
                  </>
                )}

                {settingsSection === "governance" && (
                  <>
                    <BrandPreflightPanel
                      report={brandPreflight}
                      canExportManifest={Boolean(templateKit)}
                      exportingManifest={exportingManifest}
                      onExportManifest={handleExportBrandKitManifest}
                    />

                    <TemplateGovernancePanel
                      templateKit={templateKit}
                      governance={templateGovernance}
                      exportingObjectMap={exportingObjectMap}
                      importingObjectMap={importingObjectMap}
                      resettingObjectMap={resettingObjectMap}
                      onExportObjectMap={handleExportObjectMap}
                      onImportObjectMap={handleImportObjectMap}
                      onResetObjectMap={handleResetObjectMap}
                    />
                  </>
                )}

                {settingsSection === "recipes" && (
                  <AdminRecipeBuilder
                    brandContract={activeBrandContract}
                    customRecipes={customRecipes}
                    builder={recipeBuilder}
                    onBuilderChange={(builder) => {
                      setRecipeBuilder(builder);
                      setExportCertificate(null);
                    }}
                    onAddLayout={handleAddRecipeLayout}
                    onRemoveLayout={handleRemoveRecipeLayout}
                    onCreateRecipe={handleCreateCustomRecipe}
                    onDeleteRecipe={handleDeleteCustomRecipe}
                  />
                )}
              </>
            ) : (
              <>
                <CreatorWorkflowProgress
                  activeStep={activeCreatorStep}
                  onStepChange={setActiveCreatorStep}
                  promptReady={promptReady}
                  dataReady={dataReady}
                  deckReady={deckReady}
                />

                {notice && activeCreatorStep !== "export" && (
                  <div className="rounded-md border border-[#D7CABF] bg-white px-4 py-3 text-sm font-semibold text-brand-ink">
                    {notice}
                  </div>
                )}

                {activeCreatorStep === "brief" && (
                  <div key="brief" className="workflow-step-panel space-y-4">
                    <Card>
                      <CardHeader>
                        <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
                          Presentation Brief
                        </h2>
                        <p className="mt-1 text-sm text-[#787E89]">
                          Ask for the presentation in plain language.
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label
                            htmlFor="prompt"
                            className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal"
                          >
                            Request
                          </label>
                          <Textarea
                            id="prompt"
                            value={prompt}
                            maxLength={1000}
                            onChange={(event) => {
                              setPrompt(event.target.value);
                              resetGeneratedDeck();
                            }}
                            className="min-h-[168px]"
                          />
                          <div className="mt-2 text-right text-xs font-medium text-[#787E89]">
                            {prompt.length} / 1000
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-[#E5E0DB] pt-4 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
                            <span className="grid h-5 w-5 place-items-center rounded-sm bg-brand-orange text-white">
                              <Lock className="h-3.5 w-3.5" />
                            </span>
                            Brand system stays locked
                          </div>
                          <Button
                            onClick={() => setActiveCreatorStep("context")}
                            disabled={!promptReady}
                          >
                            Continue to Context
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <CompactDeckRecipePicker
                      selectedRecipeId={selectedRecipeId}
                      deckPlan={deckPlan}
                      customRecipes={customRecipes}
                      onSelectedRecipeIdChange={(recipeId) => {
                        setSelectedRecipeId(recipeId);
                        resetGeneratedDeck();
                      }}
                    />
                  </div>
                )}

                {activeCreatorStep === "context" && (
                  <div key="context" className="workflow-step-panel space-y-4">
                    <ClientProfilePanel
                      selectedProfileId={selectedClientProfileId}
                      profileContext={clientProfileContext}
                      workflowBusy={workflowBusy}
                      onSelectProfile={handleSelectClientProfile}
                      onProfileContextChange={handleClientProfileContextChange}
                      onClearProfile={handleClearClientProfile}
                    />

                    <BusinessDataCard
                      businessSnapshot={businessSnapshot}
                      kpiSummary={kpiSummary}
                      workflowBusy={workflowBusy}
                      onSnapshotChange={handleBusinessSnapshotChange}
                      onUseExample={handleUseExampleSnapshot}
                    />

                    <ConnectedContextPanel
                      googleDriveStatus={googleDriveStatus}
                      activeGoogleSourceType={activeGoogleSourceType}
                      googleDriveQuery={googleDriveQuery}
                      googleDriveResults={googleDriveResults}
                      selectedGoogleDriveFileIds={selectedGoogleDriveFileIds}
                      searchingGoogleDrive={searchingGoogleDrive}
                      importingGoogleDrive={importingGoogleDrive}
                      onOpenGoogleSourcePicker={handleOpenGoogleSourcePicker}
                      onCloseGoogleSourcePicker={handleCloseGoogleSourcePicker}
                      onConnectGoogleDrive={handleConnectGoogleDrive}
                      onDisconnectGoogleDrive={handleDisconnectGoogleDrive}
                      onGoogleDriveQueryChange={setGoogleDriveQuery}
                      onSearchGoogleDrive={handleSearchGoogleDrive}
                      onToggleGoogleDriveFile={handleToggleGoogleDriveFile}
                      onImportGoogleDriveFiles={handleImportGoogleDriveFiles}
                    />

                    <SourcePackPanel
                      sourceDocuments={sourceDocuments}
                      sourceNotes={sourceNotes}
                      ingestingSources={ingestingSources}
                      onSourceUpload={handleSourceUpload}
                      onSourceNotesChange={(value) => {
                        setSourceNotes(value);
                        resetGeneratedDeck();
                      }}
                      onClearSources={handleClearSourcePack}
                    />

                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <Button
                        variant="secondary"
                        onClick={() => setActiveCreatorStep("brief")}
                      >
                        Back to Brief
                      </Button>
                      <Button
                        onClick={() => setActiveCreatorStep("export")}
                        disabled={!dataReady}
                      >
                        Continue to Generate
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {activeCreatorStep === "export" && (
                  <div key="export" className="workflow-step-panel space-y-4">
                    <Card>
                      <CardHeader className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-brand-charcoal">
                            Generate Presentation
                          </h2>
                          <p className="mt-1 text-sm text-[#787E89]">
                            Review the inputs, then generate a governed PPTX.
                          </p>
                        </div>
                        <StatusStrip report={validationReport} />
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="border-l-2 border-brand-orange bg-white px-4 py-3 ring-1 ring-[#EFEAE5]">
                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                              Client
                            </p>
                            <p className="mt-1 text-sm font-black text-brand-charcoal">
                              {kpiSummary?.client ?? "No client loaded"}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-[#787E89]">
                              {kpiSummary
                                ? `${kpiSummary.period} | ${kpiSummary.adoptionScore}% adoption`
                                : "Add business data before generating"}
                            </p>
                          </div>
                          <div className="border-l-2 border-brand-orange bg-white px-4 py-3 ring-1 ring-[#EFEAE5]">
                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                              Context
                            </p>
                            <p className="mt-1 text-sm font-black text-brand-charcoal">
                              {sourceContextCount} source
                              {sourceContextCount === 1 ? "" : "s"}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-[#787E89]">
                              Claims stay grounded in loaded data and notes.
                            </p>
                          </div>
                          <div className="border-l-2 border-brand-orange bg-white px-4 py-3 ring-1 ring-[#EFEAE5]">
                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                              Brand
                            </p>
                            <p className="mt-1 text-sm font-black text-brand-charcoal">
                              {activeBrandContract.companyName}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-[#787E89]">
                              Approved layouts, colors, fonts, and assets only.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-[#E5E0DB] pt-4 md:flex-row md:items-center md:justify-between">
                          <Button
                            variant="secondary"
                            onClick={() => setActiveCreatorStep("context")}
                          >
                            Back to Context
                          </Button>
                          <Button
                            onClick={handleGenerate}
                            disabled={
                              !dataReady ||
                              generating ||
                              preparingExport ||
                              auditingExport ||
                              exporting
                            }
                          >
                            {generating || preparingExport || auditingExport ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                            {generating || preparingExport || auditingExport
                              ? "Generating Presentation"
                              : deckPlan
                                ? "Regenerate Presentation"
                                : "Generate Presentation"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {notice && (
                      <div className="rounded-md border border-[#D7CABF] bg-white px-4 py-3 text-sm font-semibold text-brand-ink">
                        {notice}
                      </div>
                    )}

                    {deckPlan && <DeckOutline deckPlan={deckPlan} />}
                  </div>
                )}
              </>
            )}

            {workspaceView === "settings" && notice && (
              <div className="rounded-md border border-[#D7CABF] bg-white px-4 py-3 text-sm font-semibold text-brand-ink">
                {notice}
              </div>
            )}
          </div>
        </section>

        {showExportRail && (
          <ValidationPanel
            report={validationReport}
            accuracyAudit={accuracyAudit}
            brandPreflight={brandPreflight}
            templateGovernance={templateGovernance}
            canExport={canExport}
            generating={generating}
            preparingExport={preparingExport}
            exporting={exporting}
            auditingExport={auditingExport}
            usingTemplateCloneEdit={Boolean(templateKit)}
            exportCertificate={exportCertificate}
            onExport={handleExport}
          />
        )}
      </div>
    </main>
  );
}
