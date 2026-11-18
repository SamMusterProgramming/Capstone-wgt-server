
import mongoose from "mongoose";
import redis from "../../config/redis.js";
import stageModel from "../../models/stage.js";

const STAGE_CACHE_SECONDS = 60 * 5;

export const stageById = async (stageId, refreshCache = false) => {
  try {
    // -----------------------------
    // VALIDATE ID
    // -----------------------------

    if (!mongoose.Types.ObjectId.isValid(stageId)) {
      throw new Error("Invalid stage ID");
    }

    const objectId = new mongoose.Types.ObjectId(stageId);
    const cacheKey = `stage:${objectId.toString()}`;

    // -----------------------------
    // REDIS CACHE
    // -----------------------------

    if (!refreshCache) {
      const cached = await redis.get(cacheKey);

      if (cached) {
        return typeof cached === "string"
          ? JSON.parse(cached)
          : cached;
      }
    }

    // -----------------------------
    // MONGODB AGGREGATION
    // -----------------------------

    const stages = await stageModel.aggregate([
      {
        $match: {
          _id: objectId,
        },
      },

      {
        $limit: 1,
      },

      // -----------------------------
      // COUNTS
      // -----------------------------

      {
        $addFields: {
          contestantsCount: {
            $size: { $ifNull: ["$contestants", []] },
          },
          queueCount: {
            $size: { $ifNull: ["$queue", []] },
          },
          eliminationsCount: {
            $size: { $ifNull: ["$eliminations", []] },
          },
          votersCount: {
            $size: { $ifNull: ["$voters", []] },
          },
          commentsCount: {
            $size: { $ifNull: ["$comments", []] },
          },
        },
      },

      // -----------------------------
      // COLLECT ALL PARTICIPANT IDS
      // -----------------------------

      {
        $addFields: {
          _participantUserIds: {
            $setUnion: [
              {
                $filter: {
                  input: {
                    $concatArrays: [
                      {
                        $map: {
                          input: { $ifNull: ["$contestants", []] },
                          as: "item",
                          in: "$$item.user_id",
                        },
                      },
                      {
                        $map: {
                          input: { $ifNull: ["$queue", []] },
                          as: "item",
                          in: "$$item.user_id",
                        },
                      },
                      {
                        $map: {
                          input: { $ifNull: ["$eliminations", []] },
                          as: "item",
                          in: "$$item.user_id",
                        },
                      },
                    ],
                  },
                  as: "userId",
                  cond: { $ne: ["$$userId", null] },
                },
              },
              [],
            ],
          },
        },
      },

      // -----------------------------
      // FETCH PUBLIC USER INFORMATION
      // ONE LOOKUP FOR ALL GROUPS
      // -----------------------------

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

      // -----------------------------
      // ENRICH CONTESTANTS
      // -----------------------------

      {
        $addFields: {
          contestants: {
            $map: {
              input: { $ifNull: ["$contestants", []] },
              as: "item",
              in: {
                $let: {
                  vars: {
                    matchedUser: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$participantProfiles",
                            as: "profile",
                            cond: {
                              $eq: [
                                "$$profile._id",
                                "$$item.user_id",
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
                      "$$item",
                      {
                        user: {
                          $ifNull: ["$$matchedUser", null],
                        },
                      },
                    ],
                  },
                },
              },
            },
          },

          // -----------------------------
          // ENRICH QUEUE
          // -----------------------------

          queue: {
            $map: {
              input: { $ifNull: ["$queue", []] },
              as: "item",
              in: {
                $let: {
                  vars: {
                    matchedUser: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$participantProfiles",
                            as: "profile",
                            cond: {
                              $eq: [
                                "$$profile._id",
                                "$$item.user_id",
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
                      "$$item",
                      {
                        user: {
                          $ifNull: ["$$matchedUser", null],
                        },
                      },
                    ],
                  },
                },
              },
            },
          },

          // -----------------------------
          // ENRICH ELIMINATIONS
          // -----------------------------

          eliminations: {
            $map: {
              input: { $ifNull: ["$eliminations", []] },
              as: "item",
              in: {
                $let: {
                  vars: {
                    matchedUser: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$participantProfiles",
                            as: "profile",
                            cond: {
                              $eq: [
                                "$$profile._id",
                                "$$item.user_id",
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
                      "$$item",
                      {
                        user: {
                          $ifNull: ["$$matchedUser", null],
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

      // -----------------------------
      // REMOVE TEMPORARY FIELDS
      // -----------------------------

      {
        $project: {
          _participantUserIds: 0,
          participantProfiles: 0,
        },
      },
    ]);

    // -----------------------------
    // STAGE NOT FOUND
    // -----------------------------

    if (!stages.length) {
      return null;
    }

    const result = stages[0];

    // -----------------------------
    // SAVE TO REDIS
    // -----------------------------

    await redis.set(
      cacheKey,
      JSON.stringify(result),
      {
        ex: STAGE_CACHE_SECONDS,
      }
    );

    return result;

  } catch (error) {
    console.error("stageById error:", error);
    throw error;
  }
};

export default stageById;
