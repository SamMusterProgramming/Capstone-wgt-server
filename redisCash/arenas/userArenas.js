import mongoose from "mongoose";
import redis from "../../config/redis.js";
import arenaModel from "../../models/arena.js";

const USER_ARENAS_CACHE_SECONDS =
  60  * 5; // 5 minutes

 const userArenas = async (
  userId,
  refreshCache = false
) => {
  try {
    const cacheKey = `user_arenas_${userId}`;
    // REDIS

    if (!refreshCache) {
      const cached =
        await redis.get(cacheKey);
        if (cached) {
            if (typeof cached === "object") {
              return cached;
            }
          
            if (typeof cached === "string") {
              return JSON.parse(cached);
            }
        }
    }
    // MONGODB
    const arenas =
      await arenaModel.aggregate([  
        {
          $match: {
            owner_id:
              new mongoose.Types.ObjectId(
                userId
              ),
          },
        },

        {
          $addFields: {
            postsCount: {
              $size: {
                $ifNull: [
                  "$posts",
                  [],
                ],
              },
            },
            starsCount: {
              $size: {
                $ifNull: [
                  "$stars",
                  [],
                ],
              },
            },
            followersCount: {
              $size: {
                $ifNull: [
                  "$followers",
                  [],
                ],
              },
            },
          },
        },

        // ranking score

        {
          $addFields: {

            score: {
              $add: [
                {
                  $multiply: [
                    "$postsCount",
                    10,
                  ],
                },

                {
                  $multiply: [
                    "$starsCount",
                    2,
                  ],
                },

              ],
            },

          },
        },

        // pull all performances

        // {
        //   $lookup: {
        //     from: "arenaposts",
        //     localField: "posts",
        //     foreignField: "_id",
        //     as: "posts",
        //   },
        // },
        {
            $lookup: {
              from: "arenaposts",
              let: {
                postIds: "$posts",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ["$_id", "$$postIds"],
                    },
                  },
                },
                {
                  $sort: {
                    createdAt: -1,
                  },
                },
              ],
              as: "posts",
            },
          },

        {
          $sort: {
            score: -1,
            createdAt: -1,
          },
        },

        {
          $project: {
            _id: 1,
            owner_id: 1,
            arenaName: 1,
            talentType: 1,
            region: 1,
            biography: 1,
            description: 1,
            coverImage: 1,
            profileImage: 1,
            verified: 1,
            views: 1,
            createdAt: 1,
            posts: 1,
            stars: 1,
            followers: 1,
            postsCount: 1,
            starsCount: 1,
            followersCount: 1,
            score: 1,
          },
        },

      ]);

    // CACHE RESULT

    await redis.set(
      cacheKey,
      JSON.stringify(arenas),
      {
        ex: USER_ARENAS_CACHE_SECONDS,
      }
    );

    return arenas;

  } catch (error) {

    console.error(
      "userArenas error:",
      error
    );

    throw error;
  }
};

export default userArenas ;