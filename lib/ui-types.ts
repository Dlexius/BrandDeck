import type { DeckAccuracyAudit } from "@/lib/auditDeckAccuracy";
import type { DeckFitAudit } from "@/lib/auditDeckFit";
import { ApprovedLayoutId, BrandContract, DeckPlan, SourceDocument } from "@/lib/deck-plan-schema";
import { defaultBrandContract } from "@/lib/ui-constants";
import { ValidationReport } from "@/lib/validateDeckPlan";

export type BusinessSnapshotState = {
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

export type ClientProfile = {
  id: string;
  name: string;
  segment: string;
  stage: string;
  tools: string[];
  focus: string;
  snapshot: BusinessSnapshotState;
  context: string;
};

export type TemplateKitSummary = {
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
  staticSlides?: Array<{
    sourceSlide: number;
    label: string;
  }>;
  driftGuards: {
    templateFingerprintLocked: boolean;
    frameMapRequired: boolean;
    cloneEditPreferred: boolean;
    approvedLayoutsRequired: boolean;
    deterministicRendererRequired: boolean;
    aiDesignDisabled: boolean;
  };
};

export type TemplateGovernanceReport = {
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

export type BrandAssetSummary = {
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

export type SourceDocumentSummary = SourceDocument & {
  characters: number;
};

export type GoogleDriveConnectorStatus = {
  configured: boolean;
  connected: boolean;
  scopes?: string[];
  redirectUri?: string;
  connectedAt?: string;
  updatedAt?: string;
  expiresAt?: string | null;
  error?: string;
};

export type GoogleDriveFileOption = {
  id: string;
  name: string;
  mimeType: string;
  typeLabel: string;
  webViewLink?: string;
  modifiedTime?: string;
};

export type GoogleWorkspaceFileType = "all" | "document" | "spreadsheet" | "presentation";

export type GoogleWorkspaceSourceType = Exclude<GoogleWorkspaceFileType, "all">;

export type GoogleDriveImportResponse = {
  documents?: SourceDocumentSummary[];
  error?: string;
};

export type BrandContractApiResponse = {
  brandContract?: BrandContract;
  defaultBrandContract?: BrandContract;
  overriddenColorTokens?: string[];
  error?: string;
};

export type RecipeBuilderState = {
  name: string;
  audience: string;
  description: string;
  keywords: string;
  layoutIds: ApprovedLayoutId[];
};

export type WorkspaceView = "generate" | "settings";

export type SettingsSection = "brand" | "templates" | "governance" | "recipes";

export type CreatorWorkflowStep = "brief" | "context" | "export";

export type BrandPreflightReport = {
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

export type ExportCertificate = {
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

export type GeneratePlanApiResponse = {
  schema?: "branddeck.generate-plan/v1";
  deckPlan?: DeckPlan;
  validationReport?: ValidationReport;
  accuracyAudit?: DeckAccuracyAudit;
  fitAudit?: DeckFitAudit;
  planningMode?: "openai_subagent_orchestration";
  plannerModel?: string;
  agentTrace?: Array<{
    agentId: string;
    model: string;
    status: "passed";
  }>;
  followUpQuestions?: string[];
  error?: string;
  errorDetails?: string;
};
