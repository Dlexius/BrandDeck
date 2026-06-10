import { describe, expect, it } from "vitest";
import brandContractData from "@/data/brand-contract.json";
import {
  applySnapshotFieldToImportedRows,
  businessSnapshotFromImport,
  importBiMetricCsv,
  periodSortValue
} from "@/lib/bi-csv-import";
import {
  buildContextPackFromInputs,
  contextPackHasAdoptionMetrics,
  metricDatumsByKey
} from "@/lib/context-pack-schema";
import type { BrandContract } from "@/lib/deck-plan-schema";
import { generateDeckPlan } from "@/lib/generateDeckPlan";
import { validateDeckPlan } from "@/lib/validateDeckPlan";

const brandContract = brandContractData as unknown as BrandContract;

const powerBiStyleCsv = [
  "Client Name,Month,Monthly Active Users,Licensed Seats,Adoption %,Active Projects,Mobile Usage,RFIs Created,Submittals,Photos Uploaded,Region",
  '"Harborview Civil Partners","April 2026",198,325,0.71,22,0.55,240,310,1450,Northwest',
  '"Harborview Civil Partners","May 2026",213,325,0.73,23,0.59,262,330,1610,Northwest',
  '"Harborview Civil Partners","June 2026",244,325,0.76,24,0.61,286,350,1825,Northwest'
].join("\r\n");

describe("bi-csv-import column mapping", () => {
  it("auto-maps flexible BI headers onto standard adoption fields", () => {
    const imported = importBiMetricCsv(powerBiStyleCsv, {
      fileName: "harborview-adoption.csv"
    });

    expect(imported.rows).toHaveLength(3);
    expect(imported.clientName).toBe("Harborview Civil Partners");
    expect(imported.periods).toEqual(["April 2026", "May 2026", "June 2026"]);

    const mappedFields = imported.mappedColumns.map((column) => column.field);
    expect(mappedFields).toContain("client_name");
    expect(mappedFields).toContain("report_period");
    expect(mappedFields).toContain("active_users");
    expect(mappedFields).toContain("licensed_users");
    expect(mappedFields).toContain("adoption_score");
    expect(mappedFields).toContain("projects_active");
    expect(mappedFields).toContain("mobile_usage_rate");
    expect(mappedFields).toContain("rfi_count");
    expect(mappedFields).toContain("submittals_count");

    const current = imported.rows[2];
    expect(current.active_users).toBe(244);
    expect(current.licensed_users).toBe(325);
    expect(current.rfi_count).toBe(286);
  });

  it("scales fraction-form rate columns to 0-100 percentages", () => {
    const imported = importBiMetricCsv(powerBiStyleCsv);
    const current = imported.rows[2];

    expect(current.adoption_score).toBe(76);
    expect(current.mobile_usage_rate).toBe(61);
  });

  it("keeps unrecognized columns as flexible context metrics", () => {
    const imported = importBiMetricCsv(powerBiStyleCsv);

    expect(
      imported.metricColumns.map((column) => column.key)
    ).toContain("photos_uploaded");
    expect(imported.rows[2].photos_uploaded).toBe(1825);
    expect(imported.rows[2].region).toBe("Northwest");
  });

  it("reads BOM, Excel sep= hints, and semicolon delimiters", () => {
    const semicolonCsv = [
      "sep=;",
      "Account;Period;Active Users;Seats;Adoption Score",
      "Harborview;2026-05;213;325;73",
      "Harborview;2026-06;244;325;76"
    ].join("\n");

    const imported = importBiMetricCsv(`﻿${semicolonCsv}`);

    expect(imported.rows).toHaveLength(2);
    expect(imported.rows[1].client_name).toBe("Harborview");
    expect(imported.rows[1].active_users).toBe(244);
    expect(imported.rows[1].adoption_score).toBe(76);
  });

  it("reads tab-delimited exports", () => {
    const tsv = [
      "Client\tMonth\tActive Users\tLicensed Users\tAdoption Score",
      "Harborview\tMay 2026\t213\t325\t73",
      "Harborview\tJune 2026\t244\t325\t76"
    ].join("\n");

    const imported = importBiMetricCsv(tsv);

    expect(imported.rows).toHaveLength(2);
    expect(imported.rows[0].active_users).toBe(213);
  });
});

describe("bi-csv-import row handling", () => {
  it("re-orders rows chronologically when periods parse", () => {
    const outOfOrder = [
      "Client,Period,Active Users,Licensed Users,Adoption Score",
      "Harborview,June 2026,244,325,76",
      "Harborview,April 2026,198,325,71",
      "Harborview,May 2026,213,325,73"
    ].join("\n");

    const imported = importBiMetricCsv(outOfOrder);

    expect(imported.periods).toEqual(["April 2026", "May 2026", "June 2026"]);
    expect(
      imported.warnings.some((warning) => warning.includes("re-ordered"))
    ).toBe(true);
  });

  it("keeps the dominant client when an export mixes clients", () => {
    const multiClient = [
      "Client,Period,Active Users,Licensed Users,Adoption Score",
      "Harborview,May 2026,213,325,73",
      "Harborview,June 2026,244,325,76",
      "Summit Ridge,June 2026,120,200,58"
    ].join("\n");

    const imported = importBiMetricCsv(multiClient);

    expect(imported.rows).toHaveLength(2);
    expect(imported.clientName).toBe("Harborview");
    expect(
      imported.warnings.some((warning) => warning.includes("2 clients"))
    ).toBe(true);
  });

  it("warns when required adoption fields are missing", () => {
    const partial = [
      "Period,Daily Logs,Photos Uploaded",
      "May 2026,1700,1610",
      "June 2026,1840,1825"
    ].join("\n");

    const imported = importBiMetricCsv(partial);

    expect(
      imported.warnings.some(
        (warning) =>
          warning.includes("Client") && warning.includes("Adoption Score")
      )
    ).toBe(true);
  });

  it("rejects files without readable data", () => {
    expect(() => importBiMetricCsv("Header Only\n")).toThrow(/no readable data/i);
    expect(() =>
      importBiMetricCsv("Notes\n  \n", { fileName: "empty.csv" })
    ).toThrow();
  });

  it("sorts common period spellings", () => {
    const april = periodSortValue("April 2026");
    const june = periodSortValue("June 2026");
    const q1 = periodSortValue("Q1 2026");
    const q3 = periodSortValue("2026 Q3");
    const iso = periodSortValue("2026-06");

    expect(april).not.toBeNull();
    expect(june).not.toBeNull();
    expect((april as number) < (june as number)).toBe(true);
    expect(q1).not.toBeNull();
    expect(q3).not.toBeNull();
    expect((q1 as number) < (q3 as number)).toBe(true);
    expect(iso).not.toBeNull();
    expect(periodSortValue("Kickoff")).toBeNull();
  });
});

describe("bi-csv-import downstream integration", () => {
  it("feeds the context pack with adoption metrics and flexible metrics", () => {
    const imported = importBiMetricCsv(powerBiStyleCsv);
    const contextPack = buildContextPackFromInputs({
      csvRows: imported.rows
    });

    expect(contextPackHasAdoptionMetrics(contextPack)).toBe(true);

    const metricIndex = metricDatumsByKey(contextPack);
    expect(metricIndex.has("photos_uploaded")).toBe(true);
    expect(metricIndex.get("photos_uploaded")).toHaveLength(3);
  });

  it("generates a valid governed baseline deck from an imported series", () => {
    const imported = importBiMetricCsv(powerBiStyleCsv, {
      fileName: "harborview-adoption.csv"
    });
    const deckPlan = generateDeckPlan(
      "Create an executive adoption report emphasizing usage growth, workflow gaps, risks, and next steps.",
      imported.rows,
      brandContract,
      { recipeId: "client_adoption_report" }
    );
    const validation = validateDeckPlan(deckPlan, brandContract);

    expect(
      validation.passed,
      validation.checks
        .filter((check) => !check.passed)
        .map((check) => check.detail)
        .join("\n")
    ).toBe(true);
    expect(deckPlan.client_name).toBe("Harborview Civil Partners");
    expect(deckPlan.report_period).toBe("June 2026");
  });
});

describe("bi-csv-import snapshot-form sync", () => {
  it("mirrors the latest and prior rows into the snapshot form", () => {
    const imported = importBiMetricCsv(powerBiStyleCsv);
    const patch = businessSnapshotFromImport(imported.rows);

    expect(patch.client_name).toBe("Harborview Civil Partners");
    expect(patch.report_period).toBe("June 2026");
    expect(patch.active_users).toBe("244");
    expect(patch.adoption_score).toBe("76");
    expect(patch.previous_report_period).toBe("May 2026");
    expect(patch.previous_active_users).toBe("213");
    expect(patch.previous_adoption_score).toBe("73");
  });

  it("applies current-period edits to the latest row only", () => {
    const imported = importBiMetricCsv(powerBiStyleCsv);
    const edited = applySnapshotFieldToImportedRows(
      imported.rows,
      "adoption_score",
      "81"
    );

    expect(edited[2].adoption_score).toBe("81");
    expect(edited[1].adoption_score).toBe(73);
    expect(edited[2].photos_uploaded).toBe(1825);
  });

  it("applies previous_* edits to the prior row", () => {
    const imported = importBiMetricCsv(powerBiStyleCsv);
    const edited = applySnapshotFieldToImportedRows(
      imported.rows,
      "previous_adoption_score",
      "70"
    );

    expect(edited[1].adoption_score).toBe("70");
    expect(edited[2].adoption_score).toBe(76);
  });

  it("applies client name edits to every row", () => {
    const imported = importBiMetricCsv(powerBiStyleCsv);
    const edited = applySnapshotFieldToImportedRows(
      imported.rows,
      "client_name",
      "Harborview Civil"
    );

    expect(
      edited.every((row) => row.client_name === "Harborview Civil")
    ).toBe(true);
  });

  it("creates a baseline row for previous_* edits on a single-period import", () => {
    const single = importBiMetricCsv(
      [
        "Client,Period,Active Users,Licensed Users,Adoption Score",
        "Harborview,June 2026,244,325,76"
      ].join("\n")
    );
    const edited = applySnapshotFieldToImportedRows(
      single.rows,
      "previous_adoption_score",
      "73"
    );

    expect(edited).toHaveLength(2);
    expect(edited[0].adoption_score).toBe("73");
    expect(edited[0].report_period).toBe("Prior June 2026");
    expect(edited[1].adoption_score).toBe(76);
  });
});
