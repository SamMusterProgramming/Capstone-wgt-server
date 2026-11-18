
import redis from "../../config/redis.js";
import stageModel from "../../models/stage.js";

const TRENDING_STAGES_CACHE_SECONDS = 60 * 5;
const TRENDING_STAGES_LIMIT = 15;

const trendingStages = async (
  userCountryCode,
  otherCountries,
  refreshCache = false
) => {

  const cacheKey = `trending_stages_${userCountryCode}`;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {

    // ==========================================
    // 1. REDIS CACHE
    // ==========================================

    if (!refreshCache) {
      const cached = await redis.get(cacheKey);

      if (cached) {
        return typeof cached === "string"
          ? JSON.parse(cached)
          : cached;
      }
    }

    // ==========================================
    // 2. BUILD TRENDING PIPELINE
    // ==========================================

    const buildPipeline = (countries) => [

      // Filter stages by country and activity
      {
        $match: {
          region: {
            $in: countries,
          },

          updatedAt: {
            $gte: thirtyDaysAgo,
          },
        },
      },

      // Calculate stage counts
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

      // Only stages with active contestants
      {
        $match: {
          contestantsCount: {
            $gt: 0,
          },
        },
      },

      // Calculate trending score
      {
        $addFields: {
          hotScore: {
            $add: [

              // Occupancy score
              {
                $multiply: [
                  {
                    $divide: [
                      "$contestantsCount",
                      {
                        $max: [
                          {
                            $ifNull: [
                              "$MAXCONTESTANTS",
                              22,
                            ],
                          },
                          1,
                        ],
                      },
                    ],
                  },
                  100,
                ],
              },

              // Queue activity
              {
                $multiply: [
                  "$queueCount",
                  4,
                ],
              },

              // Voting activity
              {
                $multiply: [
                  "$votersCount",
                  2,
                ],
              },

              // Competition progression
              {
                $multiply: [
                  "$eliminationsCount",
                  3,
                ],
              },

            ],
          },
        },
      },

      // Sort trending stages
      {
        $sort: {
          hotScore: -1,
          updatedAt: -1,
          _id: 1,
        },
      },

      // Retrieve top 15 for this country group
      {
        $limit: TRENDING_STAGES_LIMIT,
      },

      // ==========================================
      // 3. LOOKUP CONTESTANT PROFILES
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

                talent: 1,
              },
            },
          ],

          as: "contestantProfiles",
        },
      },

      // ==========================================
      // 4. ATTACH PROFILE TO EACH CONTESTANT
      // ==========================================

      {
        $addFields: {
          contestants: {
            $map: {
              input: {
                $ifNull: ["$contestants", []],
              },

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
                                "$$contestant.user_id",
                              ],
                            },
                          },
                        },

                        0,
                      ],
                    },
                  },

                  in: {
                    $mergeObjects: [
                      "$$contestant",

                      {
                        user: {
                          $ifNull: [
                            "$$matchedProfile",
                            null,
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },

      // ==========================================
      // 5. REMOVE TEMPORARY FIELDS
      // ==========================================

      {
        $project: {
          hotScore: 0,

          contestantsCount: 0,
          queueCount: 0,
          votersCount: 0,
          eliminationsCount: 0,

          contestantProfiles: 0,
        },
      },

    ];

    // ==========================================
    // 6. FETCH LOCAL STAGES
    // ==========================================

    const localStages = userCountryCode
      ? await stageModel.aggregate(
          buildPipeline([userCountryCode])
        )
      : [];

    // ==========================================
    // 7. FETCH REGIONAL STAGES
    // ==========================================

    const normalizedOtherCountries = [
      ...new Set(
        (otherCountries || []).filter(
          (country) =>
            country &&
            country !== userCountryCode
        )
      ),
    ];

    const regionalStages = normalizedOtherCountries.length
      ? await stageModel.aggregate(
          buildPipeline(normalizedOtherCountries)
        )
      : [];

    // ==========================================
    // 8. COMBINE RESULTS
    // ==========================================

    const stages = [
      ...localStages,
      ...regionalStages,
    ];

    // ==========================================
    // 9. SAVE TO REDIS
    // ==========================================

    await redis.set(
      cacheKey,
      JSON.stringify(stages),
      {
        ex: TRENDING_STAGES_CACHE_SECONDS,
      }
    );

    return stages;

  } catch (error) {

    console.error("trendingStages error:", error);

    throw error;
  }
};

export default trendingStages;
