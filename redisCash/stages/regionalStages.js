
import redis from "../../config/redis.js";
import stageModel from "../../models/stage.js";

const REGION_STAGES_CACHE_SECONDS = 60 * 3;

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
    // 2. MONGODB AGGREGATION
    // ==========================================

    const stages = await stageModel.aggregate([

      // ------------------------------------------
      // Find stages in the requested region
      // ------------------------------------------

      {
        $match: {
          region: normalizedRegion,
        },
      },

      // ------------------------------------------
      // Sort by talent type
      // ------------------------------------------

      {
        $sort: {
          talentType: 1,
          name: 1,
        },
      },

      // ==========================================
      // 3. COLLECT ALL PARTICIPANT USER IDS
      // ==========================================

      {
        $addFields: {
          _participantUserIds: {
            $setUnion: [

              // Active contestants
              {
                $map: {
                  input: {
                    $ifNull: ["$contestants", []],
                  },
                  as: "item",
                  in: "$$item.user_id",
                },
              },

              // Queued contestants
              {
                $map: {
                  input: {
                    $ifNull: ["$queue", []],
                  },
                  as: "item",
                  in: "$$item.user_id",
                },
              },

              // Eliminated contestants
              {
                $map: {
                  input: {
                    $ifNull: ["$eliminations", []],
                  },
                  as: "item",
                  in: "$$item.user_id",
                },
              },

              // Invited contestants
              {
                $ifNull: ["$invitedContestants", []],
              },

            ],
          },
        },
      },

      // ==========================================
      // 4. LOOKUP ALL USER PROFILES
      // ==========================================

      {
        $lookup: {
          from: "users",

          localField: "_participantUserIds",
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

          as: "participantProfiles",
        },
      },

      // ==========================================
      // 5. ENRICH ALL PARTICIPANT ARRAYS
      // ==========================================

      {
        $addFields: {

          // --------------------------------------
          // ACTIVE CONTESTANTS
          // --------------------------------------

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
                            input: "$participantProfiles",
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

          // --------------------------------------
          // QUEUED CONTESTANTS
          // --------------------------------------

          queue: {
            $map: {
              input: {
                $ifNull: ["$queue", []],
              },

              as: "contestant",

              in: {
                $let: {
                  vars: {
                    matchedProfile: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$participantProfiles",
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

          // --------------------------------------
          // ELIMINATED CONTESTANTS
          // --------------------------------------

          eliminations: {
            $map: {
              input: {
                $ifNull: ["$eliminations", []],
              },

              as: "contestant",

              in: {
                $let: {
                  vars: {
                    matchedProfile: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$participantProfiles",
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

          // --------------------------------------
          // INVITED CONTESTANT PROFILES
          // --------------------------------------

          invitedContestantProfiles: {
            $map: {
              input: {
                $ifNull: ["$invitedContestants", []],
              },

              as: "invitedId",

              in: {
                $ifNull: [
                  {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$participantProfiles",
                          as: "profile",
                          cond: {
                            $eq: [
                              "$$profile._id",
                              "$$invitedId",
                            ],
                          },
                        },
                      },
                      0,
                    ],
                  },
                  null,
                ],
              },
            },
          },

        },
      },

      // ==========================================
      // 6. REMOVE TEMPORARY FIELDS
      // ==========================================

      {
        $project: {
          _participantUserIds: 0,
          participantProfiles: 0,
        },
      },

    ]);

    // ==========================================
    // 7. SAVE TO REDIS
    // ==========================================

    await redis.set(
      cacheKey,
      JSON.stringify(stages),
      {
        ex: REGION_STAGES_CACHE_SECONDS,
      }
    );

    return stages;

  } catch (error) {

    console.error("regionalStages error:", error);

    throw error;
  }
};

export default regionalStages;
