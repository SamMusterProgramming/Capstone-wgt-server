
import redis from "../../config/redis.js";
import stageModel from "../../models/stage.js";

const HOT_STAGES_CACHE_SECONDS = 60 * 3;
const HOT_STAGES_CACHE_KEY = "hot_stages";
const HOT_STAGES_LIMIT = 20;

export const hotStages = async (refreshCache = false) => {
  try {
    // ==========================================
    // 1. REDIS CACHE
    // ==========================================

    if (!refreshCache) {
      const cached = await redis.get(HOT_STAGES_CACHE_KEY);

      if (cached) {
        return typeof cached === "string"
          ? JSON.parse(cached)
          : cached;
      }
    }

    // ==========================================
    // 2. MONGODB AGGREGATION
    // ==========================================

    const stages = await stageModel.aggregate([

      // Calculate counts
      {
        $addFields: {
          contestantsCount: {
            $size: { $ifNull: ["$contestants", []] }
          },
          queueCount: {
            $size: { $ifNull: ["$queue", []] }
          },
          votersCount: {
            $size: { $ifNull: ["$voters", []] }
          },
          eliminationsCount: {
            $size: { $ifNull: ["$eliminations", []] }
          }
        }
      },

      // Only stages with contestants
      {
        $match: {
          contestantsCount: { $gt: 0 }
        }
      },

      // Calculate scores
      {
        $addFields: {
          occupancyScore: {
            $multiply: [
              {
                $divide: [
                  "$contestantsCount",
                  {
                    $max: [
                      { $ifNull: ["$MAXCONTESTANTS", 22] },
                      1
                    ]
                  }
                ]
              },
              100
            ]
          },

          queueScore: {
            $multiply: ["$queueCount", 4]
          },

          voterScore: {
            $multiply: ["$votersCount", 1.5]
          },

          progressionScore: {
            $multiply: ["$eliminationsCount", 2]
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
                          amount: 1
                        }
                      }
                    ]
                  },
                  then: 25
                },
                {
                  case: {
                    $gte: [
                      "$updatedAt",
                      {
                        $dateSubtract: {
                          startDate: "$$NOW",
                          unit: "day",
                          amount: 3
                        }
                      }
                    ]
                  },
                  then: 15
                },
                {
                  case: {
                    $gte: [
                      "$updatedAt",
                      {
                        $dateSubtract: {
                          startDate: "$$NOW",
                          unit: "day",
                          amount: 7
                        }
                      }
                    ]
                  },
                  then: 5
                }
              ],
              default: 0
            }
          }
        }
      },

      // Calculate hot score
      {
        $addFields: {
          hotScore: {
            $add: [
              "$occupancyScore",
              "$queueScore",
              "$voterScore",
              "$progressionScore",
              "$recencyScore"
            ]
          }
        }
      },

      // Sort hottest stages first
      {
        $sort: {
          hotScore: -1,
          votersCount: -1,
          updatedAt: -1,
          _id: 1
        }
      },

      // Get top 20
      {
        $limit: HOT_STAGES_LIMIT
      },

      // ==========================================
      // 3. GET CONTESTANT USER PROFILES
      // ==========================================

      {
        $lookup: {
          from: "users",
          localField: "contestants.user_id",
          foreignField: "_id",

          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                username: 1,
                "profileImage.publicUrl": 1,
                city: 1,
                state: 1,
                country: 1,
                talent: 1
              }
            }
          ],

          as: "contestantProfiles"
        }
      },

      // ==========================================
      // 4. ATTACH PROFILE TO EACH CONTESTANT
      // ==========================================

      {
        $addFields: {
          contestants: {
            $map: {
              input: { $ifNull: ["$contestants", []] },
              as: "contestant",

              in: {
                $let: {
                  vars: {
                    matchedProfile: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$contestantProfiles",
                            as: "profile",
                            cond: {
                              $eq: [
                                "$$profile._id",
                                "$$contestant.user_id"
                              ]
                            }
                          }
                        },
                        0
                      ]
                    }
                  },

                  in: {
                    $mergeObjects: [
                      "$$contestant",
                      {
                        user: {
                          $ifNull: [
                            "$$matchedProfile",
                            null
                          ]
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },

      // ==========================================
      // 5. REMOVE TEMPORARY CALCULATION FIELDS
      // ==========================================

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

          contestantProfiles: 0
        }
      }

    ]);

    // ==========================================
    // 6. SAVE TO REDIS
    // ==========================================

    await redis.set(
      HOT_STAGES_CACHE_KEY,
      JSON.stringify(stages),
      {
        ex: HOT_STAGES_CACHE_SECONDS
      }
    );

    return stages;

  } catch (error) {
    console.error("hotStages error:", error);
    throw error;
  }
};

export default hotStages;
