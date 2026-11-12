
import redis from "../../config/redis.js";
import stageModel from "../../models/stage.js";

const REGION_STAGES_CACHE_SECONDS = 60 * 3; // 3 minutes

export const regionalStages = async (
  region,
  refreshCache = false
) => {
  if (!region || typeof region !== "string") {
    throw new Error("A valid region is required.");
  }

  const normalizedRegion = region.trim().toUpperCase();
  const cacheKey = `region_stages:${normalizedRegion}`;

  try {
    // REDIS
    if (!refreshCache) {
      const cached = await redis.get(cacheKey);

      if (cached) {
        return typeof cached === "string"
          ? JSON.parse(cached)
          : cached;
      }
    }

    // MONGO
    const stages = await stageModel
      .find({
        region: normalizedRegion,
      })
      .sort({
        talentType: 1,
      })
      .lean();

    // SAVE TO REDIS
    await redis.set(
      cacheKey,
      JSON.stringify(stages),
      {
        ex: REGION_STAGES_CACHE_SECONDS,
      }
    );

    return stages;

  } catch (error) {
    console.error(
      "regionStages error:",
      error
    );

    throw error;
  }
};

export default regionalStages;
