import redis from "../../config/redis.js";
import talentModel from "../../models/talent.js";

const HOT_STAGES_CACHE_SECONDS = 60 * 3; // 3 minutes

export const hotStages = async (
    refreshCache = false
  ) => {
    const cacheKey = "hot_stages";
  
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
      const hotStages = await talentModel.aggregate([
        {
          $addFields: {
            contestantsCount: {
              $size: {
                $ifNull: ["$contestants", []],
              },
            },
      
            queueCount: {
              $size: {
                $ifNull: ["$queue", []],
              },
            },
      
            votersCount: {
              $size: {
                $ifNull: ["$voters", []],
              },
            },
      
            eliminationsCount: {
              $size: {
                $ifNull: ["$eliminations", []],
              },
            },
          },
        },
      
        // MUST have contestants
        {
          $match: {
            contestantsCount: {
              $gt: 0,
            },
          },
        },
      
        {
          $addFields: {
            occupancyScore: {
              $multiply: [
                {
                  $divide: [
                    "$contestantsCount",
                    "$MAXCONTESTANTS",
                  ],
                },
                100,
              ],
            },
      
            queueScore: {
              $multiply: [
                "$queueCount",
                4,
              ],
            },
      
            voterScore: {
              $multiply: [
                "$votersCount",
                1.5,
              ],
            },
      
            progressionScore: {
              $multiply: [
                "$eliminationsCount",
                2,
              ],
            },
      
            recencyScore: {
              $switch: {
                branches: [
                  {
                    case: {
                      $gte: [
                        "$updatedAt",
                        {
                          $dateSubtract: {
                            startDate: "$$NOW",
                            unit: "day",
                            amount: 1,
                          },
                        },
                      ],
                    },
                    then: 25,
                  },
      
                  {
                    case: {
                      $gte: [
                        "$updatedAt",
                        {
                          $dateSubtract: {
                            startDate: "$$NOW",
                            unit: "day",
                            amount: 3,
                          },
                        },
                      ],
                    },
                    then: 15,
                  },
      
                  {
                    case: {
                      $gte: [
                        "$updatedAt",
                        {
                          $dateSubtract: {
                            startDate: "$$NOW",
                            unit: "day",
                            amount: 7,
                          },
                        },
                      ],
                    },
                    then: 5,
                  },
                ],
                default: 0,
              },
            },
          },
        },
      
        {
          $addFields: {
            hotScore: {
              $add: [
                "$occupancyScore",
                "$queueScore",
                "$voterScore",
                "$progressionScore",
                "$recencyScore",
              ],
            },
          },
        },
      
        {
          $sort: {
            hotScore: -1,
            votersCount: -1,
            updatedAt: -1,
          },
        },
      
        {
          $limit: 20,
        },
      
        {
          $project: {
            contestantsCount: 0,
            queueCount: 0,
            votersCount: 0,
            eliminationsCount: 0,
            occupancyScore: 0,
            queueScore: 0,
            voterScore: 0,
            progressionScore: 0,
            recencyScore: 0,
          },
        },
      ]);
  
      // SAVE TO REDIS
      await redis.set(
        cacheKey,
        JSON.stringify(hotStages),
        {
          ex: HOT_STAGES_CACHE_SECONDS,
        }
      );
  
      return hotStages;
  
    } catch (error) {
      console.error(
        "aggregateHotStages error:",
        error
      );
      throw error;
    }
  };

  export default hotStages ; 