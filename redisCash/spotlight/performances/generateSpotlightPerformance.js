import mongoose from "mongoose";
import arenaPostModel from "../../../models/arenaPost.js";

const generateSpotlightPerformance = async (postId) => {

    const performances = await arenaPostModel.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(postId)
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
                localField: "owner_id",
                foreignField: "_id",
                as: "owner"
            }
        },

        {
            $unwind: "$owner"
        },

        {
            $project: {

                caption: 1,
                media: 1,

                spotlightScore: 1,
                spotlightRank: 1,
                spotlightPage: 1,
                spotlightUpdatedAt: 1,

                createdAt: 1,
                lastInteractionAt: 1,

                viewCount: 1,
                fireCount: 1,
                commentCount: 1,
                shareCount: 1,

                arena: {
                    _id: "$arena._id",
                    arenaName: "$arena.arenaName",
                    talentType: "$arena.talentType",
                    region: "$arena.region",
                    profileImage: "$arena.profileImage",
                    coverImage: "$arena.coverImage",
                    verified: "$arena.verified"
                },

                owner: {
                    _id: "$owner._id",
                    name: "$owner.name",
                    username: "$owner.username",
                    profileImage: "$owner.profileImage"
                }

            }
        }

    ]);

    return performances[0];

};

export default generateSpotlightPerformance;