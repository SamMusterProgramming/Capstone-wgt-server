import mongoose from "mongoose";

import arenaFollowerModel from "../../models/arena/arenaFollower.js";
import redis from "../../config/redis.js";

const userFollowedArenas = async (
    userId,
    page = 1,
    limit = 10,
    refreshCache = false
) => {

    try {

        const cacheKey =
            `user:${userId}:followedArenas:page:${page}`;

        // ===========================
        // CHECK REDIS
        // ===========================

        // const cached = await redis.get(cacheKey);

        if (!refreshCache) {
            const cached = await redis.get(cacheKey);
            if (cached) {
              return typeof cached === "string"
                ? JSON.parse(cached)
                : cached;
            }
        }

        // ===========================
        // AGGREGATION
        // ===========================

        const arenas =
            await arenaFollowerModel.aggregate([

                {
                    $match: {
                        user_id: new mongoose.Types.ObjectId(userId)
                    }
                },

                {
                    $sort: {
                        createdAt: -1
                    }
                },

                {
                    $lookup: {
                        from: "arenas",
                        localField: "arena_id",
                        foreignField: "_id",
                        as: "arena"
                    }
                },

                {
                    $unwind: "$arena"
                },

                {
                    $lookup: {
                        from: "users",
                        localField: "arena.owner_id",
                        foreignField: "_id",
                        as: "owner"
                    }
                },

                {
                    $unwind: "$owner"
                },

                {
                    $project: {
                        _id: "$arena._id",
                        arenaName: "$arena.arenaName",
                        talentType: "$arena.talentType",
                        region: "$arena.region",
                        biography: "$arena.biography",
                        description: "$arena.description",
                        profileImage: "$arena.profileImage",
                        coverImage: "$arena.coverImage",
                        followerCount: "$arena.followerCount",
                        starCount: "$arena.starCount",
                        postCount: "$arena.postCount",
                        verified: "$arena.verified",
                        createdAt: "$arena.createdAt",
                        owner: {
                            _id: "$owner._id",
                            username: "$owner.username",
                            fullname: "$owner.fullname",
                            profileImage: "$owner.profileImage",
                            verified: "$owner.verified"
                        }
                    }
                },
                {
                    $facet: {
                        metadata: [
                            {
                                $count: "total"
                            }
                        ],

                        arenas: [
                            {
                                $skip: (page - 1) * limit
                            },
                            {
                                $limit: limit
                            }
                        ]
                    }
                }
            ]);

        const result = arenas
        //  {
        //     page,
        //     limit,
        //     total: arenas[0].metadata[0]?.total || 0,
        //     totalPages:
        //         Math.ceil(
        //             (arenas[0].metadata[0]?.total || 0) /
        //             limit
        //         ),
        //     arenas: arenas[0].arenas
        // };

        // ===========================
        // SAVE PAGE
        // ===========================

        await redis.set(
            cacheKey,
            JSON.stringify(result),
            {
                ex: 60 * 30 // 30 minutes
            }
        );

        return result;

    } catch (error) {

        throw error;

    }

};

export default userFollowedArenas;