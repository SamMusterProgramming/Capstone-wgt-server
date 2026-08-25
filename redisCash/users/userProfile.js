import mongoose from "mongoose";
import userModel from "../../models/users.js";
import redis from "../../config/redis.js";
// import redis from "../../config/redis.js";

// import userModel from "../../models/user.js";

const USER_PROFILE_CACHE_SECONDS = 60 * 60 * 24;

const userProfile = async (
  userId,
  refreshCache = false
) => {

  try {

    const cacheKey = `user_profile_${userId}`;
    if (!refreshCache) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return typeof cached === "string"
          ? JSON.parse(cached)
          : cached;
      }
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid userId");
    }

    const objectUserId = new mongoose.Types.ObjectId(userId);

    const result = await userModel.aggregate([

      {
        $match: {
          _id: objectUserId
        }
      },

      {
        $lookup: {
          from: "arenas",

          let: {
            userId: "$_id"
          },

          pipeline: [

            {
              $match: {
                $expr: {
                  $eq: [
                    "$owner_id",
                    "$$userId"
                  ]
                }
              }
            },

            {
              $count: "count"
            }

          ],

          as: "arenaStats"
        }
      },

      {
        $lookup: {
          from: "followers",

          let: {
            userId: "$_id"
          },

          pipeline: [

            {
              $match: {
                $expr: {
                  $eq: [
                    "$user_id",
                    "$$userId"
                  ]
                }
              }
            },

            {
              $project: {

                followerCount: {
                  $size: {
                    $ifNull: [
                      "$followers",
                      []
                    ]
                  }
                },

                followingCount: {
                  $size: {
                    $ifNull: [
                      "$followings",
                      []
                    ]
                  }
                }

              }
            }

          ],

          as: "followStats"
        }
      },


      /*
       * -------------------------------------------------------
       * FRIENDS
       *
       * friendSchema currently stores user_id as String.
       * -------------------------------------------------------
       */

      {
        $lookup: {
          from: "friends",

          let: {
            userId: "$_id"
          },

          pipeline: [

            {
              $match: {
                $expr: {
                  $eq: [
                    "$user_id",
                    {
                      $toString: "$$userId"
                    }
                  ]
                }
              }
            },

            {
              $project: {

                friendCount: {
                  $size: {
                    $ifNull: [
                      "$friends",
                      []
                    ]
                  }
                }

              }
            }

          ],

          as: "friendStats"
        }
      },


      /*
       * =======================================================
       * BUILD PUBLIC USER PROFILE
       * =======================================================
       */

      {
        $project: {
          /*
           * ---------------------------------------------------
           * SAFE USER INFORMATION
           * ---------------------------------------------------
           */
          _id: 1,
          name: 1,
          username: 1,
          profileImage: 1,
          coverImage: 1,
          city: 1,
          state: 1,
          country: 1,
          talent: 1,
          tellus: 1,
          email_verified: 1,
          providers: 1,
          createdAt: 1,
          updatedAt: 1,
          /*
           * ---------------------------------------------------
           * SOCIAL / CONTENT COUNTS
           * ---------------------------------------------------
           */
          arenaCount: {
            $ifNull: [
              {
                $arrayElemAt: [
                  "$arenaStats.count",
                  0
                ]
              },
              0
            ]
          },

          followerCount: {
            $ifNull: [
              {
                $arrayElemAt: [
                  "$followStats.followerCount",
                  0
                ]
              },
              0
            ]
          },

          followingCount: {
            $ifNull: [
              {
                $arrayElemAt: [
                  "$followStats.followingCount",
                  0
                ]
              },
              0
            ]
          },

          friendCount: {
            $ifNull: [
              {
                $arrayElemAt: [
                  "$friendStats.friendCount",
                  0
                ]
              },
              0
            ]
          }

        }
      }

    ]);


    /*
     * =========================================================
     * USER NOT FOUND
     * =========================================================
     */

    if (!result.length) {
      throw new Error(
        `User not found: ${userId}`
      );
    }


    const profile = result[0];


    /*
     * =========================================================
     * REDIS
     * =========================================================
     */

    await redis.set(
      cacheKey,
      JSON.stringify(profile),
      {
        ex: USER_PROFILE_CACHE_SECONDS
      }
    );


    return profile;

  } catch (error) {

    console.error(
      "getUserProfile error:",
      error
    );

    throw error;
  }
};

export default userProfile;