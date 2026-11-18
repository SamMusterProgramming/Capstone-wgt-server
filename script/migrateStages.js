
import "dotenv/config";
import mongoose from "mongoose";

import stageModel from "../models/stage.js";

const APPLY_MIGRATION = true; // Change to true when ready

// --------------------------------------------------
// MAIN MIGRATION
// --------------------------------------------------

export const migrateStages = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error("MongoDB is not connected.");
    }

  
    // --------------------------------------------------
    // FETCH TARGET STAGES
    // --------------------------------------------------

    // const [beatMakingStages, fluteStages, fireStages] =
    //   await Promise.all([
    //     stageModel.find({ talentType: "Storytelling" }).lean(),
    //     stageModel.find({ talentType: "Flute" }).lean(),
    //     stageModel.find({ talentType: "Fire Performance" }).lean(),
    //   ]);

    
    // --------------------------------------------------
    // CHECK UNIQUE INDEX CONFLICTS
    // --------------------------------------------------

  

   
    // --------------------------------------------------
    // DRY RUN
    // --------------------------------------------------



    // --------------------------------------------------
    // UPDATE BEATMAKING TO FLUTE
    // --------------------------------------------------


    // --------------------------------------------------
    // DELETE FIRE PERFORMANCE STAGES
    // --------------------------------------------------

    const deleted = await stageModel.deleteMany({
      talentType: "Acting",
    });


    // --------------------------------------------------
    // COMPLETED
    // --------------------------------------------------

    console.log("\n========== MIGRATION COMPLETED ==========");

    return {
      success: true,
    //   updated,
    //   deleted: deleted.deletedCount,
    };

  } catch (error) {
    console.error("\nSTAGE MIGRATION FAILED:", error);
    throw error;
  }
};

export default migrateStages;

