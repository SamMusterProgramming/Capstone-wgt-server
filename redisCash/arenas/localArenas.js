// import mongoose from "mongoose";
// import arenaModel from "../../models/arena.js";
// import redis from "../../config/redis.js";


// const LOCAL_ARENAS_CACHE_SECONDS =
//     60 * 5; // 5 minutes
  
// const localArenas = async (
//     countryCode = "US",
//     refreshCache = false
//   ) => {
//     const cacheKey =`local_arenas_${countryCode}`;
//     try {

//       // REDIS
//       if (!refreshCache) {
//         const cached = await redis.get(cacheKey);

//         if (cached) {
//           if (typeof cached === "object") {
//             return cached;
//           }
//           if (typeof cached === "string") {
//             return JSON.parse(cached);
//           }
//         }
//       }
//       // MONGO
  
//       const arenas =
//         await arenaModel.aggregate([
//           {
//             $match: {
//               region: countryCode,
//             },
//           },
  
//           {
//             $addFields: {
  
//               postsCount: {
//                 $size: {
//                   $ifNull: [
//                     "$posts",
//                     [],
//                   ],
//                 },
//               },
  
//               starsCount: {
//                 $size: {
//                   $ifNull: [
//                     "$stars",
//                     [],
//                   ],
//                 },
//               },
  
//               followersCount: {
//                 $size: {
//                   $ifNull: [
//                     "$followers",
//                     [],
//                   ],
//                 },
//               },
  
//             },
//           },
  
//           {
//             $match: {
//               postsCount: {
//                 $gt: 0,
//               },
//             },
//           },
  
//           {
//             $addFields: {
  
//               score: {
//                 $add: [
  
//                   {
//                     $multiply: [
//                       "$postsCount",
//                       10,
//                     ],
//                   },
  
//                   {
//                     $multiply: [
//                       "$starsCount",
//                       2,
//                     ],
//                   },
  
//                 ],
//               },
  
//             },
//           },
  
//           {
//             $sort: {
//               score: -1,
//               postsCount: -1,
//               starsCount: -1,
//               createdAt: -1,
//             },
//           },
  
//           {
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
//                   $sort: {
//                     createdAt: -1,
//                   },
//                 },
//               ],
//               as: "posts",
//             },
//           },
  
//           {
//             $project: {
//               owner_id: 1,
//               arenaName: 1,
//               talentType: 1,
//               region: 1,
//               biography: 1,
//               description: 1,
//               coverImage: 1,
//               profileImage: 1,
//               posts: 1,
//               postsCount: 1,
//               starsCount: 1,
//               followersCount: 1,
//               stars: 1,
//               followers: 1,
//               verified: 1,
//               score: 1,
//               createdAt: 1,
//             },
//           },
  
//           {
//             $limit: 20,
//           },
//         ]);
//       // SAVE TO REDIS
  
//       await redis.set(
//         cacheKey,
//         JSON.stringify(arenas),
//         {
//           ex: LOCAL_ARENAS_CACHE_SECONDS,
//         }
//       );
//       const ttl = await redis.ttl(cacheKey);
//       console.log("TTL:", ttl);
//       return arenas;
//     } catch (error) {
//       console.error(
//         "localArenas error:",
//         error
//       );
//       throw error;
//     }
//   };


// export default localArenas 

import arenaModel from "../../models/arena.js";
import redis from "../../config/redis.js";
const LOCAL_ARENAS_CACHE_SECONDS = 60 * 5;
const localArenas = async (
  countryCode = "US",
  refreshCache = false
) => {
  try {
    const cacheKey = `local_arenas_${countryCode}`;

    // ---------- REDIS ----------

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
          region: countryCode,
          postCount: { $gt: 0 },
        },
      },

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

      {
        $sort: {
          score: -1,
          postCount: -1,
          starCount: -1,
          createdAt: -1,
        },
      },

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
          postCount: 1,
          starCount: 1,
          followerCount: 1,
          viewCount: 1,
          score: 1,
          posts: 1,
        },
      },

      {
        $limit: 20,
      },
    ]);
    // ---------- REDIS ----------
    await redis.set(
      cacheKey,
      JSON.stringify(arenas),
      {
        ex: LOCAL_ARENAS_CACHE_SECONDS,
      }
    );
    return arenas;
  } catch (error) {
    console.error("localArenas error:", error);
    throw error;
  }
};

export default localArenas;