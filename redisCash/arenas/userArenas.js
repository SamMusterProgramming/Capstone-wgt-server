

// import mongoose from "mongoose";
// import redis from "../../config/redis.js";
// import arenaModel from "../../models/arena.js";

// const USER_ARENAS_CACHE_SECONDS = 60 * 5;

// const userArenas = async (
//   userId,
//   refreshCache = false
// ) => {
//   try {
//     const cacheKey = `user_arenas_${userId}`;
//     // ---------- REDIS ---------
//     if (!refreshCache) {
//       const cached = await redis.get(cacheKey);
//       if (cached) {
//         return typeof cached === "string"
//           ? JSON.parse(cached)
//           : cached;
//       }
//     }
//     // ---------- MONGODB ----------
//     const arenas = await arenaModel.aggregate([
//       {
//         $match: {
//           owner_id: new mongoose.Types.ObjectId(userId),
//         },
//       },

//       // Ranking score
//       {
//         $addFields: {
//           score: {
//             $add: [
//               {
//                 $multiply: ["$postCount", 10],
//               },
//               {
//                 $multiply: ["$starCount", 2],
//               },
//               {
//                 $multiply: ["$viewCount", 0.01],
//               },
//             ],
//           },
//         },
//       },

//       // Fetch performances
//       {
//         $lookup: {
//           from: "arenaposts",
//           let: {
//             postIds: "$posts",
//           },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $in: ["$_id", "$$postIds"],
//                 },
//               },
//             },
           

//             {
//               $project: {
//                 _id: 1,
//                 owner_id: 1,
//                 caption: 1,
//                 spotlight: 1,
//                 spotlightScore: 1,
//                 media: 1,
//                 viewCount: 1,
//                 fireCount: 1,
//                 commentCount: 1,
//                 shareCount: 1,
//                 createdAt: 1,
//                 localSpotlight: 1,
//                 regionalSpotlight : 1 ,
//                 globalSpotlight : 1
//               },
//             },

//             {
//               $sort: {
//                 createdAt: -1,
//               },
//             },
//           ],
//           as: "posts",
//         },
//       },

//       {
//         $sort: {
//           score: -1,
//           createdAt: -1,
//         },
//       },

//       {
//         $project: {
//           _id: 1,
//           owner_id: 1,
//           arenaName: 1,
//           talentType: 1,
//           region: 1,
//           biography: 1,
//           description: 1,
//           coverImage: 1,
//           profileImage: 1,
//           verified: 1,
//           createdAt: 1,
//           viewCount: 1,
//           followerCount: 1,
//           starCount: 1,
//           postCount: 1,
//           score: 1,
//           posts: 1,
//         },
//       },
//     ]);

//     // ---------- CACHE ----------

//     await redis.set(
//       cacheKey,
//       JSON.stringify(arenas),
//       {
//         ex: USER_ARENAS_CACHE_SECONDS,
//       }
//     );

//     return arenas;
//   } catch (error) {
//     console.error("userArenas error:", error);
//     throw error;
//   }
// };

// export default userArenas;

import mongoose from "mongoose";
import redis from "../../config/redis.js";
import arenaModel from "../../models/arena.js";

const USER_ARENAS_CACHE_SECONDS = 60 * 5;

const userArenas = async (userId, refreshCache = false) => {
try {
  const cacheKey = `user_arenas_${userId}`;

    if (!refreshCache) {
        const cached = await redis.get(cacheKey);

        if (cached) {
            return typeof cached === "string"
                ? JSON.parse(cached)
                : cached;
        }
    }

    const arenas = await arenaModel.aggregate([
        {
            $match: {
                owner_id: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $addFields: {
                score: {
                    $add: [
                        { $multiply: ["$postCount", 10] },
                        { $multiply: ["$starCount", 2] },
                        { $multiply: ["$viewCount", 0.01] }
                    ]
                }
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner_id",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $unwind: {
                path: "$owner",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: "arenaposts",
                let: {
                    arenaId: "$_id"
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: [
                                    "$arena_id",
                                    "$$arenaId"
                                ]
                            }
                        }
                    },
                    {
                        $sort: {
                            createdAt: -1
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            arena_id: 1,
                            owner_id: 1,
                            caption: 1,
                            media: 1,

                            viewCount: 1,
                            fireCount: 1,
                            commentCount: 1,
                            shareCount: 1,

                            spotlightScore: 1,
                            spotlightRegion: 1,
                            spotlightCountry: 1,
                            lastInteractionAt: 1,

                            globalSpotlight: 1,
                            regionalSpotlight: 1,
                            localSpotlight: 1,

                            createdAt: 1
                        }
                    }
                ],
                as: "posts"
            }
        },
        {
            $sort: {
                score: -1,
                createdAt: -1
            }
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
                followerCount: 1,
                starCount: 1,
                postCount: 1,
                viewCount: 1,

                verified: 1,
                createdAt: 1,
                score: 1,

                owner: {
                    _id: "$owner._id",
                    username: "$owner.username",
                    fullname: "$owner.name",
                    profileImage: "$owner.profileImage",
                    verified: "$owner.verified"
                },

                posts: 1
            }
        }
    ]);

    await redis.set(
        cacheKey,
        JSON.stringify(arenas),
        {
            ex: USER_ARENAS_CACHE_SECONDS
        }
    );

    return arenas;
} catch (error) {
    console.error("userArenas error:", error);
    throw error;
}

};

export default userArenas;