import mongoose from "mongoose";
import redis from "../../config/redis.js";
import talentModel from "../../models/talent.js";

const STAGE_CACHE_SECONDS = 60 * 5; // 5 minutes

export const stageById = async (
  stageId,
  refreshCache = false
) => {
  const cacheKey = `stage:${stageId}`;

  try {
    // -----------------------------
    // VALIDATE ID
    // -----------------------------

    if (!mongoose.Types.ObjectId.isValid(stageId)) {
      throw new Error("Invalid stage ID");
    }

    // -----------------------------
    // REDIS
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
    // MONGO
    // -----------------------------

    const stage = await talentModel.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(stageId),
        },
      },

      // -----------------------------
      // COUNTS
      // -----------------------------

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

          eliminationsCount: {
            $size: {
              $ifNull: ["$eliminations", []],
            },
          },

          votersCount: {
            $size: {
              $ifNull: ["$voters", []],
            },
          },

          commentsCount: {
            $size: {
              $ifNull: ["$comments", []],
            },
          },
        },
      },

      // -----------------------------
      // CONTESTANT USER INFORMATION
      // -----------------------------

      {
        $lookup: {
          from: "users",
          localField: "contestants.user_id",
          foreignField: "_id",
          as: "contestantUsers",
        },
      },

      // -----------------------------
      // BUILD CONTESTANTS
      // -----------------------------

      {
        $addFields: {
          contestants: {
            $map: {
              input: {
                $ifNull: ["$contestants", []],
              },

              as: "contestant",

              in: {
                _id: "$$contestant._id",

                user_id: "$$contestant.user_id",

                performances: "$$contestant.performances",

                votes: "$$contestant.votes",

                likes: "$$contestant.likes",

                rank: "$$contestant.rank",

                createdAt: "$$contestant.createdAt",

                user: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$contestantUsers",
                        as: "user",
                        cond: {
                          $eq: [
                            "$$user._id",
                            "$$contestant.user_id",
                          ],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },

      // -----------------------------
      // REMOVE SENSITIVE USER DATA
      // -----------------------------

      {
        $project: {
          contestantsCount: 1,
          queueCount: 1,
          eliminationsCount: 1,
          votersCount: 1,
          commentsCount: 1,
      
          name: 1,
          desc: 1,
          region: 1,
          MAXCONTESTANTS: 1,
          thumbNail_URL: 1,
      
          contestants: 1,
          eliminations: 1,
          queue: 1,
          voters: 1,
          editions: 1,
          invited_friends: 1,
          comments: 1,
      
          createdAt: 1,
          updatedAt: 1,
        },
      },

      // -----------------------------
      // ONLY ONE DOCUMENT
      // -----------------------------

      {
        $limit: 1,
      },
    ]);

    // -----------------------------
    // STAGE NOT FOUND
    // -----------------------------

    if (!stage.length) {
      return null;
    }

    const result = stage[0];

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
    console.error(
      "stageById error:",
      error
    );

    throw error;
  }
};

export default stageById;