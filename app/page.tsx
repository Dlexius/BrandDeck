"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AdminRecipeBuilder } from "@/components/brand-settings/admin-recipe-builder";
import { BrandAssetInventory } from "@/components/brand-settings/brand-asset-inventory";
import { BrandColorSettingsPanel } from "@/components/brand-settings/brand-color-settings";
import { BrandContractPanel } from "@/components/brand-settings/brand-contract-panel";
import { BrandKitReadiness } from "@/components/brand-settings/brand-kit-readiness";
import { BrandPreflightPanel } from "@/components/brand-settings/brand-preflight-panel";
import { FrameMapPreview } from "@/components/brand-settings/frame-map-preview";
import { SettingsSectionNav } from "@/components/brand-settings/settings-nav";
import { TemplateAssetLibrary } from "@/components/brand-settings/template-asset-library";
import { TemplateGovernancePanel } from "@/components/brand-settings/template-governance-panel";
import { TemplateOnboardingWorkbench } from "@/components/brand-settings/template-onboarding-workbench";
import { BusinessDataCard } from "@/components/creator/business-data-card";
import { ClientProfilePanel } from "@/components/creator/client-profile-panel";
import { ConnectedContextPanel } from "@/components/creator/connected-context";
import { StatusStrip, ValidationPanel } from "@/components/creator/export-rail";
import { FollowUpQuestions, GenerationProgress, WorkflowNotice } from "@/components/creator/generation-feedback";
import { CompactDeckRecipePicker } from "@/components/creator/recipe-picker";
import { SourcePackPanel } from "@/components/creator/source-pack-panel";
import { CreatorWorkflowProgress } from "@/components/creator/workflow-progress";
import { DeckPreview } from "@/components/deck-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { DeckAccuracyAudit } from "@/lib/auditDeckAccuracy";
import type { DeckFitAudit } from "@/lib/auditDeckFit";
import { BiMetricImport, applySnapshotFieldToImportedRows, businessSnapshotFromImport, importBiMetricCsv } from "@/lib/bi-csv-import";
import { buildContextPackFromInputs } from "@/lib/context-pack-schema";
import { ApprovedLayoutId, BrandContract, DeckPlan, SourceDocument } from "@/lib/deck-plan-schema";
import { DeckRecipe, approvedDeckRecipes } from "@/lib/deck-recipes";
import { AdoptionCsvRow } from "@/lib/generateDeckPlan";
import { CLIENT_PROFILES, DEFAULT_PROMPT, DEFAULT_RECIPE_BUILDER, EMPTY_BUSINESS_SNAPSHOT, EXAMPLE_BUSINESS_SNAPSHOT, MAX_ADMIN_RECIPE_LAYOUTS, defaultBrandContract } from "@/lib/ui-constants";
import { brandColorTokenLabel, businessSnapshotToRows, createSourceDocument, isHexColor, mergeSourceDocuments, recipeFromBuilder, safeDownloadFileName } from "@/lib/ui-helpers";
import type { BrandAssetSummary, BrandContractApiResponse, BrandPreflightReport, BusinessSnapshotState, CreatorWorkflowStep, ExportCertificate, GeneratePlanApiResponse, GoogleDriveConnectorStatus, GoogleDriveFileOption, GoogleDriveImportResponse, GoogleWorkspaceSourceType, RecipeBuilderState, SettingsSection, SourceDocumentSummary, TemplateGovernanceReport, TemplateKitSummary, WorkspaceView } from "@/lib/ui-types";
import { ValidationReport, validateDeckPlan } from "@/lib/validateDeckPlan";
import { AlertTriangle, ArrowRight, Loader2, Lock, RotateCcw, Sparkles } from "lucide-react";

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
  const [metricImport, setMetricImport] = useState<BiMetricImport | null>(null);
  const [importingMetrics, setImportingMetrics] = useState(false);
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
  // True when inputs changed after the last successful generation; the last
  // validated deck stays visible but export is gated until a regenerate.
  const [inputsStale, setInputsStale] = useState(false);
  const [confirmStartOver, setConfirmStartOver] = useState(false);
  // Follow-up questions already shown this session, so a regenerate never
  // re-asks the same thing and a refinement pass never spawns a new round.
  const askedFollowUpQuestionsRef = useRef<Set<string>>(new Set());
  const refiningPromptRef = useRef(false);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [adoptingIdentity, setAdoptingIdentity] = useState(false);
  const [validationReport, setValidationReport] =
    useState<ValidationReport | null>(null);
  const [accuracyAudit, setAccuracyAudit] =
    useState<DeckAccuracyAudit | null>(null);
  const [fitAudit, setFitAudit] = useState<DeckFitAudit | null>(null);
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
  const [notice, setNoticeText] = useState("");
  const [noticeTone, setNoticeTone] = useState<"info" | "error">("info");
  const [noticeDetails, setNoticeDetails] = useState("");

  // Single entry point for workflow notices. Plain calls reset tone/details so
  // an earlier error style never leaks into a later informational message.
  function setNotice(
    message: string,
    options: { tone?: "info" | "error"; details?: string } = {}
  ) {
    setNoticeText(message);
    setNoticeTone(options.tone ?? "info");
    setNoticeDetails(options.details ?? "");
  }
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
  const selectedClientProfile = useMemo(
    () => CLIENT_PROFILES.find((profile) => profile.id === selectedClientProfileId),
    [selectedClientProfileId]
  );

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

  // A file dropped outside a dropzone would otherwise navigate the browser
  // to the file and destroy all creator input.
  useEffect(() => {
    const preventStrayDrop = (event: DragEvent) => {
      event.preventDefault();
    };

    window.addEventListener("dragover", preventStrayDrop);
    window.addEventListener("drop", preventStrayDrop);
    return () => {
      window.removeEventListener("dragover", preventStrayDrop);
      window.removeEventListener("drop", preventStrayDrop);
    };
  }, []);

  const hasFreshExportCertificate = Boolean(
    exportCertificate &&
      exportCertificate.packageAudit === "passed" &&
      (!templateKit ||
        exportCertificate.frameMapFingerprint ===
          templateKit.frameMap.approval.mappingFingerprint)
  );
  // Template clone/edit is the premium path; when its preflight or dry-run
  // is not ready, export falls back to the governed brand-layout renderer
  // instead of stranding the creator with a valid deck and no export.
  const templateCloneEditReady = Boolean(
    templateKit && brandPreflight?.status === "ready" && hasFreshExportCertificate
  );
  const canExport = Boolean(
    deckPlan &&
      !inputsStale &&
      validationReport?.passed &&
      accuracyAudit?.passed &&
      fitAudit?.passed
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
  const dataReady = Boolean(
    csvRows.length > 0 ||
      selectedClientProfile ||
      clientProfileContext.trim() ||
      sourceDocuments.length > 0 ||
      sourceNotes.trim()
  );
  const deckReady = Boolean(
    deckPlan && validationReport?.passed && accuracyAudit?.passed && fitAudit?.passed
  );
  const sourceContextCount =
    sourceDocuments.length +
    (sourceNotes.trim() ? 1 : 0) +
    (clientProfileContext.trim() ? 1 : 0);

  function resetGeneratedDeck() {
    setDeckPlan(null);
    setValidationReport(null);
    setAccuracyAudit(null);
    setFitAudit(null);
    setExportCertificate(null);
    setInputsStale(false);
  }

  // Input edits no longer destroy the last validated deck: the preview stays
  // visible, the deck is flagged stale, and export is gated until the next
  // successful generation.
  function markGeneratedDeckStale() {
    if (deckPlan) {
      setInputsStale(true);
    }
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
          : "Unable to disconnect Google Drive.",
        { tone: "error" }
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
        : [...current, fileId].slice(0, 20)
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
        error instanceof Error ? error.message : "Unable to search Google Drive.",
        { tone: "error" }
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
    markGeneratedDeckStale();

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

      const nextDocuments = mergeSourceDocuments(sourceDocuments, documents);
      const addedCount = Math.max(0, nextDocuments.length - sourceDocuments.length);

      setSourceDocuments(nextDocuments);
      setActiveGoogleSourceType(null);
      setSelectedGoogleDriveFileIds([]);
      setNotice(
        `${nextDocuments.length} connected source${
          nextDocuments.length === 1 ? "" : "s"
        } loaded for planner evidence${
          addedCount > 0
            ? ` (${addedCount} added from Google Drive).`
            : "."
        }`
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to import Google Drive files.",
        { tone: "error" }
      );
    } finally {
      setImportingGoogleDrive(false);
    }
  }

  // Start Over wipes all three steps of creator input, so it asks once: the
  // first click arms the button, the second within a few seconds confirms.
  function handleStartOverRequest() {
    if (!confirmStartOver) {
      setConfirmStartOver(true);
      window.setTimeout(() => setConfirmStartOver(false), 4000);
      return;
    }

    setConfirmStartOver(false);
    handleStartOver();
  }

  function handleStartOver() {
    askedFollowUpQuestionsRef.current.clear();
    refiningPromptRef.current = false;
    setPrompt(DEFAULT_PROMPT);
    setSelectedRecipeId("auto");
    setSelectedClientProfileId("");
    setClientProfileContext("");
    setBusinessSnapshot(EMPTY_BUSINESS_SNAPSHOT);
    setCsvRows([]);
    setMetricImport(null);
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
    setMetricImport(null);
    markGeneratedDeckStale();
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

    // While a BI import is loaded, a form edit updates the matching period in
    // the imported series instead of collapsing it back to a one-row snapshot.
    if (metricImport) {
      const nextRows = applySnapshotFieldToImportedRows(
        metricImport.rows,
        field,
        value
      );
      setMetricImport({ ...metricImport, rows: nextRows });
      setCsvRows(nextRows);
      setBusinessSnapshot(nextSnapshot);
      markGeneratedDeckStale();
      setNotice("");
      return;
    }

    applyBusinessSnapshot(nextSnapshot);
  }

  async function handleImportMetricFile(files: FileList | null) {
    const file = files?.[0];

    if (!file) {
      return;
    }

    setImportingMetrics(true);
    try {
      const text = await file.text();
      const imported = importBiMetricCsv(text, { fileName: file.name });

      setMetricImport(imported);
      setCsvRows(imported.rows);
      setBusinessSnapshot({
        ...EMPTY_BUSINESS_SNAPSHOT,
        ...businessSnapshotFromImport(imported.rows)
      });
      markGeneratedDeckStale();
      setNotice(
        `Imported ${imported.rows.length} period${
          imported.rows.length === 1 ? "" : "s"
        } from ${file.name}. Review the mapped snapshot below, then generate.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to import the metrics file.",
        { tone: "error" }
      );
    } finally {
      setImportingMetrics(false);
    }
  }

  function handleClearMetricImport() {
    setMetricImport(null);
    setCsvRows(businessSnapshotToRows(businessSnapshot));
    markGeneratedDeckStale();
    setNotice(
      "Metrics import cleared. The snapshot fields below keep the latest imported values."
    );
  }

  function handleUseExampleSnapshot() {
    applyBusinessSnapshot(
      EXAMPLE_BUSINESS_SNAPSHOT,
      "Example account snapshot loaded. Update any metric or context before generating."
    );
  }

  async function handleAdoptTemplateIdentity() {
    if (!templateKit) {
      setNotice("Upload a template first, then adopt its brand identity.");
      return;
    }

    setAdoptingIdentity(true);
    try {
      const response = await fetch("/api/brand-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKitId: templateKit.id, apply: true })
      });
      const result = (await response.json()) as BrandContractApiResponse & {
        draft?: { companyName?: string };
        error?: string;
      };

      if (!response.ok || !result.brandContract) {
        throw new Error(result.error ?? "Unable to adopt the template identity.");
      }

      applyBrandContractResponse(result);
      setNotice(
        `Brand identity updated from the template: ${result.draft?.companyName ?? result.brandContract.companyName} with its detected fonts. Review colors below, then generate.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to adopt the template identity.",
        { tone: "error" }
      );
    } finally {
      setAdoptingIdentity(false);
    }
  }

  function handleApplyFollowUpAnswers(
    answers: Array<{ question: string; answer: string }>
  ) {
    const additions = answers
      .map(({ question, answer }) => `${question} ${answer}`)
      .join(" ");
    // Trim the base prompt, never the answers, so added details survive the
    // 1000-character prompt budget.
    const suffix = `\n\nAdded details: ${additions}`;
    const baseBudget = Math.max(0, 1000 - suffix.length);
    const nextPrompt = `${prompt.trim().slice(0, baseBudget)}${suffix}`.slice(
      0,
      1000
    );
    setPrompt(nextPrompt);
    setFollowUpQuestions([]);
    refiningPromptRef.current = true;
    void handleGenerate(nextPrompt);
  }

  function handleLoadExampleBrief() {
    // Don't clobber a prompt the creator already customized; the example
    // still fills the metrics and context they are missing.
    const promptIsCustom =
      prompt.trim().length > 0 && prompt.trim() !== DEFAULT_PROMPT;

    if (!promptIsCustom) {
      setPrompt(DEFAULT_PROMPT);
    }

    setSelectedRecipeId("auto");
    applyBusinessSnapshot(
      EXAMPLE_BUSINESS_SNAPSHOT,
      promptIsCustom
        ? "Example account data loaded. Your request text was kept - review the context, then generate."
        : "Example brief and account data loaded. Review the context, then generate."
    );
    setActiveCreatorStep("context");
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
    markGeneratedDeckStale();
    setNotice("");
  }

  function handleClearClientProfile() {
    setSelectedClientProfileId("");
    setClientProfileContext("");
    markGeneratedDeckStale();
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
        error instanceof Error ? error.message : "Unable to save brand colors.",
        { tone: "error" }
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
        error instanceof Error ? error.message : "Unable to reset brand colors.",
        { tone: "error" }
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
          : "Unable to save governed recipe.",
        { tone: "error" }
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
      setFitAudit(null);
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
          : "Unable to delete governed recipe.",
        { tone: "error" }
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
    markGeneratedDeckStale();

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

      setSourceDocuments((current) => [...current, ...validDocuments].slice(0, 20));
      setNotice(
        `${validDocuments.length} source document${
          validDocuments.length === 1 ? "" : "s"
        } attached for planner evidence.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to ingest source files.",
        { tone: "error" }
      );
    } finally {
      setIngestingSources(false);
    }
  }

  function handleClearSourcePack() {
    setSourceDocuments([]);
    setSourceNotes("");
    markGeneratedDeckStale();
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
        error instanceof Error ? error.message : "Unable to ingest brand assets.",
        { tone: "error" }
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
        error instanceof Error ? error.message : "Unable to update brand asset.",
        { tone: "error" }
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
          : "Unable to promote template asset.",
        { tone: "error" }
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
        error instanceof Error ? error.message : "Unable to approve frame map.",
        { tone: "error" }
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
        error instanceof Error ? error.message : "Unable to update frame map.",
        { tone: "error" }
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

  async function buildValidatedDeckPlan(promptText: string) {
    const rows = csvRows;
    const sourcePack = buildSourcePack();
    const contextPack = buildContextPackFromInputs({
      clientProfile: selectedClientProfile
        ? {
            id: selectedClientProfile.id,
            name: selectedClientProfile.name,
            segment: selectedClientProfile.segment,
            stage: selectedClientProfile.stage,
            ownedTools: selectedClientProfile.tools,
            businessGoals: [selectedClientProfile.focus],
            risks: businessSnapshot.risk_summary
              ? [businessSnapshot.risk_summary]
              : [],
            stakeholders: []
          }
        : businessSnapshot.client_name
          ? {
              id: businessSnapshot.client_name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_+|_+$/g, ""),
              name: businessSnapshot.client_name,
              ownedTools: [
                businessSnapshot.top_feature,
                businessSnapshot.lowest_feature
              ].filter(Boolean),
              businessGoals: [],
              risks: businessSnapshot.risk_summary
                ? [businessSnapshot.risk_summary]
                : [],
              stakeholders: []
            }
          : undefined,
      csvRows: rows,
      manualSnapshot: businessSnapshot,
      sourceDocuments: sourcePack,
      selectedContextRefs: metricImport
        ? [
            {
              id: `bi_export_${metricImport.fileName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_+|_+$/g, "")}`,
              type: "bi_export" as const,
              title: metricImport.fileName,
              source: "BI export"
            }
          ]
        : []
    });
    const response = await fetch("/api/generate-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: promptText,
        csvRows: rows,
        contextPack,
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
      !result.accuracyAudit ||
      !result.fitAudit
    ) {
      const failure = new Error(
        result.error ?? "Unable to generate a governed deck."
      ) as Error & { details?: string };
      failure.details = result.errorDetails;
      throw failure;
    }

    const plan = result.deckPlan;
    const report = result.validationReport;
    const accuracy = result.accuracyAudit;
    const fit = result.fitAudit;
    const planningMode = result.planningMode ?? "openai_subagent_orchestration";

    setDeckPlan(plan);
    setValidationReport(report);
    setAccuracyAudit(accuracy);
    setFitAudit(fit);
    setExportCertificate(null);
    setInputsStale(false);

    // Never re-ask a question from an earlier pass, and never open a new
    // round right after the creator answered one - that reads as a treadmill
    // blocking export when the questions are optional.
    const freshQuestions = refiningPromptRef.current
      ? []
      : (result.followUpQuestions ?? [])
          .filter((question) => {
            const key = question.trim().toLowerCase();
            return key.length > 0 && !askedFollowUpQuestionsRef.current.has(key);
          })
          .slice(0, 4);
    freshQuestions.forEach((question) =>
      askedFollowUpQuestionsRef.current.add(question.trim().toLowerCase())
    );
    setFollowUpQuestions(freshQuestions);

    // Template governance/preflight refreshes run after the costly planning
    // calls; if they hiccup, degrade to "needs review" instead of failing the
    // whole generation.
    const degradedPreflight: BrandPreflightReport = {
      schema: "branddeck.brand-preflight/v1",
      generatedAt: new Date().toISOString(),
      status: "needs_review",
      readinessScore: 0,
      checks: [
        {
          id: "preflight:refresh",
          label: "Brand preflight refresh",
          passed: false,
          detail:
            "Preflight could not be refreshed after generation. Template export needs a recheck in Brand Settings; brand-layout export is unaffected."
        }
      ],
      summary: { total: 1, passed: 0, failed: 1 }
    };
    let preflight = degradedPreflight;

    try {
      if (templateKit) {
        await refreshTemplateGovernance(templateKit.id, plan);
      }

      preflight = await refreshBrandPreflight(templateKit?.id, plan);
    } catch {
      setBrandPreflight(degradedPreflight);
    }

    return {
      plan,
      report,
      accuracy,
      fit,
      planningMode,
      plannerModel: result.plannerModel,
      agentTrace: result.agentTrace,
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
    fit,
    planningMode,
    plannerModel,
    agentTrace,
    sourcePack,
    preflight
  }: {
    plan: DeckPlan;
    report: ValidationReport;
    accuracy: DeckAccuracyAudit;
    fit: DeckFitAudit;
    planningMode: NonNullable<GeneratePlanApiResponse["planningMode"]>;
    plannerModel?: string;
    agentTrace?: GeneratePlanApiResponse["agentTrace"];
    sourcePack: SourceDocument[];
    preflight: BrandPreflightReport;
  }) {
    const agentCount = agentTrace?.length ?? 0;
    const plannerPrefix =
      planningMode === "openai_subagent_orchestration"
        ? `AI agent orchestration${agentCount > 0 ? ` (${agentCount} agents)` : ""}: `
        : `AI planner${plannerModel ? ` (${plannerModel})` : ""}: `;

    if (!report.passed) {
      return `${plannerPrefix}Deck generated, but brand validation needs admin review before export.`;
    }

    if (!accuracy.passed) {
      return `${plannerPrefix}Deck generated, but source grounding needs review before export. Add stronger source context, adjust the prompt, or generate again.`;
    }

    if (!fit.passed) {
      return `${plannerPrefix}Deck generated, but slide copy needs to be shorter before export.`;
    }

    if (!templateKit) {
      return `${plannerPrefix}Deck generated and ready to export with ${plan.slides.length} slides${
        sourcePack.length > 0
          ? ` and ${sourcePack.length} source document${sourcePack.length === 1 ? "" : "s"} cited`
          : ""
      }.`;
    }

    // Template clone/edit preparation is best-effort: a valid deck must stay
    // exportable with brand layouts even when the template path is not ready.
    const brandLayoutFallbackMessage = `${plannerPrefix}Deck generated and ready to export with ${plan.slides.length} approved brand-layout slides. Finish template mapping in Brand Settings to export with the uploaded template instead.`;
    let exportPreflight = preflight;

    if (exportPreflight.status !== "ready") {
      const failedPreflightIds = exportPreflight.checks
        .filter((check) => !check.passed)
        .map((check) => check.id);

      if (
        failedPreflightIds.length === 1 &&
        failedPreflightIds[0] === "frame-map:approval"
      ) {
        try {
          exportPreflight = await approveReadyFrameMapForExport(plan);
        } catch {
          // Keep the not-ready preflight; the brand-layout export still works.
        }
      }
    }

    if (exportPreflight.status !== "ready") {
      return brandLayoutFallbackMessage;
    }

    setAuditingExport(true);
    try {
      const certificate = await runTemplateExportAudit(plan);

      return `${plannerPrefix}Deck generated and ready to export: ${certificate.referencedSlides} slides, ${certificate.placeholderHits} placeholder hits, ${certificate.brandValidationScore} brand validation.`;
    } catch {
      // A failed template dry-run must not discard a validated generation.
      return brandLayoutFallbackMessage;
    }
  }

  async function handleGenerate(promptOverride?: unknown) {
    // Guard: onClick passes the click event; only honor real string overrides.
    const promptText =
      typeof promptOverride === "string" ? promptOverride : prompt;
    // Snapshot the last validated deck so a failed regenerate can restore it
    // instead of leaving the creator with nothing.
    const previousDeck = deckPlan
      ? {
          deckPlan,
          validationReport,
          accuracyAudit,
          fitAudit,
          exportCertificate,
          followUpQuestions
        }
      : null;
    setActiveCreatorStep("export");
    setGenerating(true);
    setPreparingExport(true);
    setAuditingExport(false);
    setNotice("");

    try {
      const generation = await buildValidatedDeckPlan(promptText);
      const message = await prepareGeneratedDeckForExport(generation);
      const stageLines = (generation.agentTrace ?? [])
        .map(
          (entry) => `${entry.agentId.replace(/_/g, " ")} - ${entry.status}`
        )
        .join("\n");
      setNotice(message, {
        details: stageLines ? `Planning stages\n${stageLines}` : ""
      });
    } catch (error) {
      if (previousDeck) {
        setDeckPlan(previousDeck.deckPlan);
        setValidationReport(previousDeck.validationReport);
        setAccuracyAudit(previousDeck.accuracyAudit);
        setFitAudit(previousDeck.fitAudit);
        setExportCertificate(previousDeck.exportCertificate);
        setFollowUpQuestions(previousDeck.followUpQuestions);
        setInputsStale(true);
      } else {
        setDeckPlan(null);
        setFollowUpQuestions([]);
        setValidationReport(null);
        setAccuracyAudit(null);
        setFitAudit(null);
        setExportCertificate(null);
      }

      // Keep the visible message short and human; move any long or technical
      // text into the collapsible details section.
      const rawMessage =
        error instanceof Error ? error.message : "Unable to generate deck.";
      const serverDetails =
        error instanceof Error
          ? ((error as Error & { details?: string }).details ?? "")
          : "";
      const isQuotaError = /\b429\b|exceeded your current quota|rate limit/i.test(
        rawMessage
      );
      const isWordy = rawMessage.length > 200;
      const keptDeckSuffix = previousDeck
        ? " Your last validated deck is still shown below."
        : "";
      const visibleMessage = isQuotaError
        ? "The AI provider account has hit its usage limit, so nothing was generated. Add credits or wait for the limit to reset, then generate again."
        : isWordy
          ? "BrandDeck's automated review stopped this draft before export. Generating again usually resolves it - each pass replans the deck."
          : rawMessage;
      setNotice(visibleMessage + keptDeckSuffix, {
        tone: "error",
        details: [isQuotaError || isWordy ? rawMessage : "", serverDetails]
          .filter(Boolean)
          .join("\n\n")
      });
    } finally {
      refiningPromptRef.current = false;
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
      // Clone/edit only when the template path fully passed its checks;
      // otherwise the governed coordinate renderer ships the deck.
      const useTemplateCloneEdit = templateCloneEditReady;
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
          ? `PPTX exported with the uploaded template. Package audit: ${
              packageAudit ?? "passed"
            }, ${referencedSlides ?? "9"} slides, ${
              placeholderHits ?? "0"
            } placeholder hits.`
          : templateKit
            ? "PPTX exported with approved brand layouts. Finish template mapping in Brand Settings to export with the uploaded template instead."
            : "PPTX exported."
      );
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : "Unable to export PPTX.";
      const isWordy = rawMessage.length > 200;
      setNotice(
        isWordy
          ? "The export was stopped by a brand check before any file was created. Try exporting again, or regenerate the deck."
          : rawMessage,
        { tone: "error", details: isWordy ? rawMessage : "" }
      );
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
        error instanceof Error ? error.message : "Unable to export frame map.",
        { tone: "error" }
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
          : "Unable to export brand kit manifest.",
        { tone: "error" }
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
          : "Unable to export template object map.",
        { tone: "error" }
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
        error instanceof Error ? error.message : "Unable to import object map.",
        { tone: "error" }
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
        error instanceof Error ? error.message : "Unable to reset object map.",
        { tone: "error" }
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
          : "Unable to export clone starter.",
        { tone: "error" }
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
            adoptingIdentity={adoptingIdentity}
            onTemplateUpload={handleTemplateUpload}
            onAssetUpload={handleAssetUpload}
            onAdoptTemplateIdentity={handleAdoptTemplateIdentity}
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
                  className={`w-full shrink-0 sm:w-auto ${
                    confirmStartOver ? "border-brand-orange text-brand-orange" : ""
                  }`}
                  onClick={handleStartOverRequest}
                  disabled={workflowBusy}
                >
                  <RotateCcw className="h-4 w-4" />
                  {confirmStartOver ? "Confirm Start Over" : "Start Over"}
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
                  <WorkflowNotice
                    message={notice}
                    details={noticeDetails}
                    tone={noticeTone}
                  />
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
                              markGeneratedDeckStale();
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
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Button
                              variant="secondary"
                              onClick={handleLoadExampleBrief}
                            >
                              Try the example
                            </Button>
                            <Button
                              onClick={() => setActiveCreatorStep("context")}
                              disabled={!promptReady}
                            >
                              Continue to Context
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <CompactDeckRecipePicker
                      selectedRecipeId={selectedRecipeId}
                      deckPlan={deckPlan}
                      customRecipes={customRecipes}
                      onSelectedRecipeIdChange={(recipeId) => {
                        setSelectedRecipeId(recipeId);
                        markGeneratedDeckStale();
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
                      metricImport={metricImport}
                      importingMetrics={importingMetrics}
                      onImportMetricFile={handleImportMetricFile}
                      onClearMetricImport={handleClearMetricImport}
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
                        markGeneratedDeckStale();
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
                      <div className="flex flex-col items-stretch gap-1 md:items-end">
                        <Button
                          onClick={() => setActiveCreatorStep("export")}
                          disabled={!dataReady}
                        >
                          Continue to Generate
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        {!dataReady && (
                          <p className="text-xs font-semibold leading-5 text-[#A05A00]">
                            To continue, drop a BI export, fill the snapshot
                            (client, period, active users, licensed users,
                            adoption score), pick a profile, or attach context.
                          </p>
                        )}
                      </div>
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
                        <StatusStrip
                          report={validationReport}
                          stale={inputsStale}
                        />
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="border-l-2 border-brand-orange bg-white px-4 py-3 ring-1 ring-[#EFEAE5]">
                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#787E89]">
                              Client
                            </p>
                            <p className="mt-1 text-sm font-black text-brand-charcoal">
                              {kpiSummary?.client ??
                                selectedClientProfile?.name ??
                                "Context selected"}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-[#787E89]">
                              {kpiSummary
                                ? `${kpiSummary.period} | ${kpiSummary.adoptionScore}% adoption`
                                : selectedClientProfile
                                  ? `${selectedClientProfile.segment} | ${selectedClientProfile.stage}`
                                  : "Source and prompt context ready"}
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
                                ? inputsStale
                                  ? "Regenerate with Updated Inputs"
                                  : "Regenerate Presentation"
                                : "Generate Presentation"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {(generating || preparingExport || auditingExport) && (
                      <GenerationProgress />
                    )}

                    {notice &&
                      !(generating || preparingExport || auditingExport) && (
                        <WorkflowNotice
                          message={notice}
                          details={noticeDetails}
                          tone={noticeTone}
                        />
                      )}

                    {deckPlan &&
                      followUpQuestions.length > 0 &&
                      !(generating || preparingExport || auditingExport) && (
                        <FollowUpQuestions
                          questions={followUpQuestions}
                          busy={generating || preparingExport}
                          onApply={handleApplyFollowUpAnswers}
                        />
                      )}

                    {deckPlan &&
                      inputsStale &&
                      !(generating || preparingExport || auditingExport) && (
                        <div className="flex items-center gap-2 rounded-md border border-[#FFD3BE] bg-[#FFF7F2] px-4 py-3 text-sm font-semibold text-[#A05A00]">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          Inputs changed since this deck was generated.
                          Regenerate to refresh it before exporting.
                        </div>
                      )}

                    {deckPlan && (
                      <DeckPreview
                        deckPlan={deckPlan}
                        brandContract={activeBrandContract}
                      />
                    )}
                  </div>
                )}
              </>
            )}

            {workspaceView === "settings" && notice && (
              <WorkflowNotice
                message={notice}
                details={noticeDetails}
                tone={noticeTone}
              />
            )}
          </div>
        </section>

        {showExportRail && (
          <ValidationPanel
            report={validationReport}
            accuracyAudit={accuracyAudit}
            fitAudit={fitAudit}
            brandPreflight={brandPreflight}
            templateGovernance={templateGovernance}
            canExport={canExport}
            inputsStale={inputsStale}
            cloneEditReady={templateCloneEditReady}
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
