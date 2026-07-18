import arenaPostModel from "../../../../models/arenaPost.js";



const generateSpotlightCandidates = async (filter = {}) => {

    const performances = await arenaPostModel.aggregate([
        {
            $match: {
                spotlightScore: {
                    $gt: 2
                },
                ...filter
            }
        },
        {
            $sort: {
                spotlightScore: -1
            }
        },
        {
            $limit: 500
        },


        // Arena data
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


        // Owner data
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
                _id:1,
                spotlightScore:1,
                caption:1,
                media:1,
                viewCount:1,
                fireCount:1,
                commentCount:1,
                shareCount:1,
                createdAt:1,
                arena:{
                    _id:"$arena._id",
                    arenaName:"$arena.arenaName",
                    talentType:"$arena.talentType",
                    region:"$arena.region",
                    country:"$arena.country",
                    profileImage:"$arena.profileImage",
                    coverImage:"$arena.coverImage",
                    verified:"$arena.verified"
                },
                owner:{
                    _id:"$owner._id",
                    name:"$owner.name",
                    username:"$owner.username",
                    profileImage:"$owner.profileImage",
                    coverImage:"$owner.coverImage",
                    city:"$owner.city",
                    state:"$owner.state",
                    country:"$owner.country"
                }
            }
        }
    ]);
    return performances;
};
export default generateSpotlightCandidates;