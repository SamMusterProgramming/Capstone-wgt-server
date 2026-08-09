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

        if (!refreshCache) {
            const cached = await redis.get(cacheKey);
            if (cached) {
              return typeof cached === "string"
                ? JSON.parse(cached)
                : cached;
            }
        }
        
        // const arenas = await arenaFollowerModel.aggregate([
        //     {
        //         $match:{
        //             user_id:new mongoose.Types.ObjectId(userId)
        //         }
        //     },
        //     {
        //         $sort:{
        //             createdAt:-1
        //         }
        //     },
        //     {
        //         $skip:(page-1)*limit
        //     },
        //     {
        //         $limit:limit
        //     },
        //     {
        //         $lookup:{
        //             from:"arenas",
        //             localField:"arena_id",
        //             foreignField:"_id",
        //             as:"arena"
        //         }
        //     },
        //     {
        //         $unwind:"$arena"
        //     },
        //     {
        //         $lookup:{
        //             from:"users",
        //             localField:"arena.owner_id",
        //             foreignField:"_id",
        //             as:"owner"
        //         }
        //     },
        //     {
        //         $unwind:"$owner"
        //     },
        //     {
        //         $project:{
        //             _id:"$arena._id",
        //             arenaName:"$arena.arenaName",
        //             talentType:"$arena.talentType",
        //             region:"$arena.region",
        //             biography:"$arena.biography",
        //             description:"$arena.description",
        //             profileImage:"$arena.profileImage",
        //             coverImage:"$arena.coverImage",
        //             followerCount:"$arena.followerCount",
        //             postCount:"$arena.postCount",
        //             starCount:"$arena.starCount",
        //             verified:"$arena.verified",
        //             owner:{
        //                 _id:"$owner._id",
        //                 username:"$owner.username",
        //                 fullname:"$owner.fullname",
        //                 verified:"$owner.verified",
        //                 profileImage:"$owner.profileImage"
        //             }
        //         }
        //     }
        // ]);

        const arenas = await arenaFollowerModel.aggregate([
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
                $skip: (page - 1) * limit
            },
            {
                $limit: limit
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
                $lookup: {
                    from: "arenaposts",
                    let: {
                        arenaId: "$arena._id"
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
                        }
                    ],
                    as: "posts"
                }
            },
            {
                $project: {
                    _id: "$arena._id",
                    arenaName: "$arena.arenaName",
                    talentType: "$arena.talentType",
                    region: "$arena.region",
                    biography: "$arena.biography",
                    description: "$arena.description",
                    coverImage: "$arena.coverImage",
                    profileImage: "$arena.profileImage",
                    followerCount: "$arena.followerCount",
                    starCount: "$arena.starCount",
                    postCount: "$arena.postCount",
                    viewCount: "$arena.viewCount",
                    verified: "$arena.verified",
                    createdAt: "$arena.createdAt",
                    owner: {
                        _id: "$owner._id",
                        username: "$owner.username",
                        fullname: "$owner.name",
                        profileImage: "$owner.profileImage",
                        verified: "$owner.verified"
                    },
                    posts: "$posts"
                }
            }
        ]);

        const result = arenas

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