// import mongoose from "mongoose";
// import redis from "../../config/redis.js";
// import arenaModel from "../../models/arena.js";

// const USER_ARENAS_CACHE_SECONDS =
//   60  * 5; // 5 minutes

//  const userArenas = async (
//   userId,
//   refreshCache = false
// ) => {
//   try {
//     const cacheKey = `user_arenas_${userId}`;
//     // REDIS

//     if (!refreshCache) {
//       const cached =
//         await redis.get(cacheKey);
//         if (cached) {
//             if (typeof cached === "object") {
//               return cached;
//             }
          
//             if (typeof cached === "string") {
//               return JSON.parse(cached);
//             }
//         }
//     }
//     // MONGODB
//     const arenas =
//       await arenaModel.aggregate([  
//         {
//           $match: {
//             owner_id:
//               new mongoose.Types.ObjectId(
//                 userId
//               ),
//           },
//         },

//         {
//           $addFields: {
//             postsCount: {
//               $size: {
//                 $ifNull: [
//                   "$posts",
//                   [],
//                 ],
//               },
//             },
//             starsCount: {
//               $size: {
//                 $ifNull: [
//                   "$stars",
//                   [],
//                 ],
//               },
//             },
//             followersCount: {
//               $size: {
//                 $ifNull: [
//                   "$followers",
//                   [],
//                 ],
//               },
//             },
//           },
//         },

//         // ranking score

//         {
//           $addFields: {

//             score: {
//               $add: [
//                 {
//                   $multiply: [
//                     "$postsCount",
//                     10,
//                   ],
//                 },

//                 {
//                   $multiply: [
//                     "$starsCount",
//                     2,
//                   ],
//                 },

//               ],
//             },

//           },
//         },

        
//         {
//             $lookup: {
//               from: "arenaposts",
//               let: {
//                 postIds: "$posts",
//               },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $in: ["$_id", "$$postIds"],
//                     },
//                   },
//                 },
          
//                 {
//                   $project: {
//                     _id: 1,
//                     owner_id: 1,
//                     caption: 1,
//                     spotlight: 1,
          
//                     media: 1,
          
//                     viewCount: 1,
//                     fireCount: 1,
//                     commentCount: 1,
//                     shareCount: 1,
//                     createdAt: 1,
//                   },
//                 },
//                 {
//                   $sort: {
//                     createdAt: -1,
//                   },
//                 },
//               ],
//               as: "posts",
//             },
//         },

//         {
//           $sort: {
//             score: -1,
//             createdAt: -1,
//           },
//         },

//         {
//           $project: {
//             _id: 1,
//             owner_id: 1,
//             arenaName: 1,
//             talentType: 1,
//             region: 1,
//             biography: 1,
//             description: 1,
//             coverImage: 1,
//             profileImage: 1,
//             verified: 1,
//             views: 1,
//             createdAt: 1,
//             posts: 1,
//             stars: 1,
//             followers: 1,
//             postsCount: 1,
//             starsCount: 1,
//             followersCount: 1,
//             score: 1,
//           },
//         },

//       ]);

//     // CACHE RESULT

//     await redis.set(
//       cacheKey,
//       JSON.stringify(arenas),
//       {
//         ex: USER_ARENAS_CACHE_SECONDS,
//       }
//     );

//     return arenas;

//   } catch (error) {

//     console.error(
//       "userArenas error:",
//       error
//     );

//     throw error;
//   }
// };

// export default userArenas ;

import mongoose from "mongoose";
import redis from "../../config/redis.js";
import arenaModel from "../../models/arena.js";

const USER_ARENAS_CACHE_SECONDS = 60 * 5;

const userArenas = async (
  userId,
  refreshCache = false
) => {
  try {
    const cacheKey = `user_arenas_${userId}`;
    // ---------- REDIS ---------
    if (!refreshCache) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return typeof cached === "string"
          ? JSON.parse(cached)
          : cached;
      }
    }
    // ---------- MONGODB ----------
    const arenas = await arenaModel.aggregate([
      {
        $match: {
          owner_id: new mongoose.Types.ObjectId(userId),
        },
      },

      // Ranking score
      {
        $addFields: {
          score: {
            $add: [
              {
                $multiply: ["$postCount", 10],
              },
              {
                $multiply: ["$starCount", 2],
              },
              {
                $multiply: ["$viewCount", 0.01],
              },
            ],
          },
        },
      },

      // Fetch performances
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
            // {
            //     $addFields: {
            //       isFired: {
            //         $in: [
            //           new mongoose.Types.ObjectId(userId),
            //           "$fires",
            //         ],
            //       },
            //     },
            // },

            {
              $project: {
                _id: 1,
                owner_id: 1,
                caption: 1,
                spotlight: 1,
                spotlightScore: 1,
                media: 1,
                viewCount: 1,
                fireCount: 1,
                commentCount: 1,
                shareCount: 1,
                createdAt: 1,
                // isFired: 1,
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
          createdAt: 1,
          viewCount: 1,
          followerCount: 1,
          starCount: 1,
          postCount: 1,
          score: 1,
          posts: 1,
        },
      },
    ]);

    // ---------- CACHE ----------

    await redis.set(
      cacheKey,
      JSON.stringify(arenas),
      {
        ex: USER_ARENAS_CACHE_SECONDS,
      }
    );

    return arenas;
  } catch (error) {
    console.error("userArenas error:", error);
    throw error;
  }
};

export default userArenas;