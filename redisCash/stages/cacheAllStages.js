
import stageModel from "../../models/stage.js";
import stageById from "./stageById.js";

const STAGE_BATCH_SIZE = 25;

export const cacheAllStages = async (refreshCache = false) => {
  try {
    // Get all stage IDs only
    const stages = await stageModel
      .find({})
      .select("_id")
      .lean();

    if (!stages.length) {
      return;
    }

    // Process stages in batches
    for (let i = 0; i < stages.length; i += STAGE_BATCH_SIZE) {
      const batch = stages.slice(i, i + STAGE_BATCH_SIZE);

      await Promise.all(
        batch.map(({ _id }) =>
          stageById(_id.toString(), refreshCache)
        )
      );
    }

  } catch (error) {
    console.error("cacheAllStages error:", error);
    throw error;
  }
};

export default cacheAllStages;
