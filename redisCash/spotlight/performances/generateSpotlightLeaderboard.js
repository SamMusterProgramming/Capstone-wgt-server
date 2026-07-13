import arenaPostModel from "../../../models/arenaPost.js";

 
const generateSpotlightLeaderboard = async () => {

    const performances = await arenaPostModel.aggregate([
        // Ignore performances with no engagement
        {
            $match: {
                spotlightScore: { $gt: 5 }
            }
        },
        // Highest score first
        {
            $sort: {
                spotlightScore: -1
            }
        },
        // Only top 500
        {
            $limit: 500
        },

        // Arena
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

        // Owner
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

        // Keep only useful fields
        {
            $project: {
                spotlightScore: 1,
                createdAt: 1,
                caption: 1,
                media: 1,
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
                    profileImage: "$owner.profileImage",
                    coverImage: "$owner.coverImage" ,
                    city: "$owner.city",
                    state: "$owner.state",
                    country: "$owner.country",
                }

            }
        }

    ]);

    return performances;

};

export default generateSpotlightLeaderboard;