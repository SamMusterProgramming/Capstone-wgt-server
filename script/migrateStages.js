
import "dotenv/config";
import mongoose from "mongoose";

import talentModel from "../models/talent.js";
import stageModel from "../models/stage.js";
import { SPOTLIGHT_COUNTRIES, talentStages } from "../utilities/data.js";

const APPLY_MIGRATION = true;

const REGIONAL_STAGES = [
  "AFRICA",
  "ASIA",
  "EUROPE",
  "AMERICA",
  "OCEANIA",
];

const LEGACY_TALENT_MAPPING = {
  singing: "Singing",
  dancing: "Dancing",
  magic: "Magic",
  comedy: "Comedy",
  melody: "Guitar",
  art: "Art",
  fitness: "Fitness",
};

let migrationPromise = null;

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const normalize = (value) =>
  String(value ?? "").trim().toUpperCase();

const getKey = (region, talentType) =>
  `${normalize(region)}_${normalize(talentType)}`;

const getCountries = () => {
  const countries = [];

  const addCountry = (country) => {
    if (typeof country === "string") {
      const value = normalize(country);
      if (value) countries.push(value);
      return;
    }

    if (!country || typeof country !== "object") return;

    if (Array.isArray(country)) {
      country.forEach(addCountry);
      return;
    }

    const code =
      country.code ||
      country.countryCode ||
      country.iso2 ||
      country.value;

    if (typeof code === "string" && code.trim()) {
      countries.push(normalize(code));
    }
  };

  if (Array.isArray(SPOTLIGHT_COUNTRIES)) {
    SPOTLIGHT_COUNTRIES.forEach(addCountry);
  } else if (SPOTLIGHT_COUNTRIES && typeof SPOTLIGHT_COUNTRIES === "object") {
    Object.values(SPOTLIGHT_COUNTRIES).forEach(addCountry);
  }

  return [...new Set(countries)];
};

const getTalentTypes = () => {
  const talentTypes = [];

  for (const talent of talentStages || []) {
    const value =
      typeof talent === "string"
        ? talent
        : talent?.name ||
          talent?.talentType ||
          talent?.title ||
          talent?.value ||
          talent?.label;

    if (typeof value === "string" && value.trim()) {
      talentTypes.push(value.trim());
    }
  }

  return [
    ...new Map(
      talentTypes.map((talent) => [
        normalize(talent),
        talent,
      ])
    ).values(),
  ];
};

// --------------------------------------------------
// BUILD NEW STAGE DOCUMENT
// --------------------------------------------------

const buildStageDocument = (oldTalent, region, talentType) => {
  const document = {
    name: `${talentType}Stage${region}`,
    talentType,
    region,
  };

  const fieldsToCopy = [
    "contestants",
    "eliminations",
    "queue",
    "voters",
    "editions",
    "desc",
    "MAXCONTESTANTS",
    "comments",
    "thumbNail_URL",
    "createdAt",
    "updatedAt",
  ];

  for (const field of fieldsToCopy) {
    if (oldTalent[field] !== undefined) {
      document[field] = oldTalent[field];
    }
  }

  if (oldTalent.invited_friends !== undefined) {
    document.invitedContestants = oldTalent.invited_friends;
  }

  // Do not copy the old MongoDB _id.
  // Mongoose will generate a fresh _id for this stage.

  return document;
};

// --------------------------------------------------
// MAIN MIGRATION
// --------------------------------------------------

export const migrateStages = async () => {
  if (migrationPromise) {
    return migrationPromise;
  }

  migrationPromise = (async () => {
    if (mongoose.connection.readyState !== 1) {
      throw new Error(
        "MongoDB is not connected. Connect to MongoDB before running the migration."
      );
    }

    console.log("\n========== STAGE MIGRATION ==========");
    console.log(`Mode: ${APPLY_MIGRATION ? "APPLY" : "DRY RUN"}`);

    const countries = getCountries();
    const talentTypes = getTalentTypes();

    const allRegions = [
      ...new Set([
        ...countries,
        ...REGIONAL_STAGES,
      ]),
    ];

    console.log(`Countries: ${countries.length}`);
    console.log(`Regional stages: ${REGIONAL_STAGES.length}`);
    console.log(`Total regions: ${allRegions.length}`);
    console.log(`Talent types: ${talentTypes.length}`);

    const expectedTotalStages =
      allRegions.length * talentTypes.length;

    const countryStageCount =
      countries.length * talentTypes.length;

    const regionalStageCount =
      REGIONAL_STAGES.length * talentTypes.length;

    console.log(`Expected total stages: ${expectedTotalStages}`);

    // --------------------------------------------------
    // FETCH EXISTING DOCUMENTS
    // --------------------------------------------------

    const [oldTalents, existingStages] = await Promise.all([
      talentModel.find({}).lean(),
      stageModel.find({}).lean(),
    ]);

    console.log(`Old documents: ${oldTalents.length}`);
    console.log(`Existing new stages: ${existingStages.length}`);

    // --------------------------------------------------
    // INDEX EXISTING STAGES IN MEMORY
    // --------------------------------------------------

    const existingByKey = new Map();

    for (const stage of existingStages) {
      const key = getKey(stage.region, stage.talentType);

      if (!existingByKey.has(key)) {
        existingByKey.set(key, []);
      }

      existingByKey.get(key).push(stage);
    }

    // --------------------------------------------------
    // CLASSIFY LEGACY TALENTS
    // --------------------------------------------------

    const validRegionSet = new Set(
      allRegions.map(normalize)
    );

    const legacyByKey = new Map();

    const ignoredSport = [];
    const ignoredOtherTalents = [];
    const ignoredMissingData = [];
    const ignoredInvalidRegions = [];

    for (const oldTalent of oldTalents) {
      const oldName = oldTalent.name;
      const oldRegion = oldTalent.region;

      if (
        !oldName ||
        typeof oldName !== "string" ||
        !String(oldRegion ?? "").trim()
      ) {
        ignoredMissingData.push({
          name: oldName,
          region: oldRegion,
          oldId: oldTalent._id,
        });

        continue;
      }

      const normalizedName = normalize(oldName);
      const normalizedRegion = normalize(oldRegion);

      if (normalizedName === "SPORT") {
        ignoredSport.push({
          name: oldName,
          region: oldRegion,
          oldId: oldTalent._id,
        });

        continue;
      }

      const talentType =
        LEGACY_TALENT_MAPPING[oldName.trim().toLowerCase()];

      if (!talentType) {
        ignoredOtherTalents.push({
          name: oldName,
          region: oldRegion,
          oldId: oldTalent._id,
        });

        continue;
      }

      if (!validRegionSet.has(normalizedRegion)) {
        ignoredInvalidRegions.push({
          name: oldName,
          region: oldRegion,
          oldId: oldTalent._id,
        });

        continue;
      }

      const key = getKey(normalizedRegion, talentType);

      if (!legacyByKey.has(key)) {
        legacyByKey.set(key, []);
      }

      legacyByKey.get(key).push(oldTalent);
    }

    // --------------------------------------------------
    // BUILD MIGRATION PLAN
    // --------------------------------------------------

    const migrationPlan = [];
    const generatedPlan = [];
    const alreadyExisting = [];
    const conflicts = [];

    for (const region of allRegions) {
      for (const talentType of talentTypes) {
        const key = getKey(region, talentType);

        const legacyDocuments =
          legacyByKey.get(key) || [];

        const existingDocuments =
          existingByKey.get(key) || [];

        if (
          legacyDocuments.length > 1 ||
          existingDocuments.length > 1 ||
          (legacyDocuments.length > 0 &&
            existingDocuments.length > 0)
        ) {
          conflicts.push({
            region,
            talentType,
            legacyCount: legacyDocuments.length,
            existingCount: existingDocuments.length,
            legacyIds: legacyDocuments.map((doc) => doc._id),
            existingIds: existingDocuments.map((doc) => doc._id),
          });

          continue;
        }

        if (existingDocuments.length === 1) {
          alreadyExisting.push({
            region,
            talentType,
          });

          continue;
        }

        if (legacyDocuments.length === 1) {
          migrationPlan.push({
            oldTalent: legacyDocuments[0],
            region,
            talentType,
          });

          continue;
        }

        generatedPlan.push({
          region,
          talentType,
        });
      }
    }

    // --------------------------------------------------
    // REPORT
    // --------------------------------------------------

    const report = {
      mode: APPLY_MIGRATION ? "APPLY" : "DRY RUN",

      countries: countries.length,
      regionalStages: REGIONAL_STAGES.length,
      regionalNames: REGIONAL_STAGES,
      totalRegions: allRegions.length,
      talentTypes: talentTypes.length,

      countryStageCount,
      regionalStageCount,
      expectedTotalStages,

      oldDocuments: oldTalents.length,
      existingNewStages: existingStages.length,

      legacyStagesToMigrate: migrationPlan.length,
      newStagesToGenerate: generatedPlan.length,
      alreadyExistingStages: alreadyExisting.length,

      ignoredSport: ignoredSport.length,
      ignoredOtherTalents: ignoredOtherTalents.length,
      ignoredMissingData: ignoredMissingData.length,
      ignoredInvalidRegions: ignoredInvalidRegions.length,

      invalidRegionDetails: ignoredInvalidRegions,

      conflicts,
    };

    console.log("\n========== MIGRATION REPORT ==========");
    console.log(JSON.stringify(report, null, 2));

    // --------------------------------------------------
    // STOP IF CONFLICTS EXIST
    // --------------------------------------------------

    if (conflicts.length > 0) {
      console.error("\nMIGRATION STOPPED: Conflicts detected.");

      return {
        ...report,
        success: false,
        message: "Resolve the conflicts before running the migration.",
      };
    }

    // --------------------------------------------------
    // DRY RUN
    // --------------------------------------------------

    if (!APPLY_MIGRATION) {
      console.log("\nDRY RUN COMPLETED.");
      console.log("No database documents were modified.");

      return {
        ...report,
        success: true,
        inserted: 0,
      };
    }

    // --------------------------------------------------
    // BUILD DOCUMENTS TO INSERT
    // --------------------------------------------------

    const documentsToCreate = [];

    // Migrate valid legacy documents.
    for (const item of migrationPlan) {
      documentsToCreate.push(
        buildStageDocument(
          item.oldTalent,
          item.region,
          item.talentType
        )
      );
    }

    // Generate missing stages.
    for (const item of generatedPlan) {
      documentsToCreate.push({
        name: `${item.talentType}Stage${item.region}`,
        talentType: item.talentType,
        region: item.region,
      });
    }

    // --------------------------------------------------
    // INSERT INTO STAGES
    // --------------------------------------------------

    let insertedDocuments = [];

    if (documentsToCreate.length > 0) {
      console.log(
        `\nInserting ${documentsToCreate.length} stage documents...`
      );

      insertedDocuments = await stageModel.insertMany(
        documentsToCreate,
        { ordered: true }
      );
    }

    console.log("\n========== MIGRATION COMPLETED ==========");
    console.log(`Inserted: ${insertedDocuments.length}`);
    console.log(`Expected total stages: ${expectedTotalStages}`);

    return {
      ...report,
      success: true,
      inserted: insertedDocuments.length,
      message: "Stage migration completed successfully.",
    };
  })();

  try {
    return await migrationPromise;
  } finally {
    migrationPromise = null;
  }
};

export default migrateStages;
