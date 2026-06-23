import redis from "../../config/redis.js";
import talentModel from "../../models/talent.js";


const TRENDING_STAGES_CACHE_SECONDS = 60 * 5; // 5 minutes

const trendingStages = async(
    userCountryCode,
    otherCountries,
    refreshCache = false) => {
    
    const cacheKey = `trending_stages_${userCountryCode}`;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(
    thirtyDaysAgo.getDate() - 30
    );

    try {
        // REDIS
        if (!refreshCache) {
            const cached =
            await redis.get(cacheKey);
            if (cached) {
            return typeof cached === "string"
                ? JSON.parse(cached)
                : cached;
            }
        }
        const buildPipeline = (countries) => [
            {
            $match: {
                region: {
                $in: countries,
                },
        
                updatedAt: {
                $gte: thirtyDaysAgo,
                },
            },
            },
        
            {
            $addFields: {
                contestantsCount: {
                $size: {
                    $ifNull: [
                    "$contestants",
                    [],
                    ],
                },
                },
        
                queueCount: {
                $size: {
                    $ifNull: [
                    "$queue",
                    [],
                    ],
                },
                },
        
                votersCount: {
                $size: {
                    $ifNull: [
                    "$voters",
                    [],
                    ],
                },
                },
        
                eliminationsCount: {
                $size: {
                    $ifNull: [
                    "$eliminations",
                    [],
                    ],
                },
                },
            },
            },
        
            {
            $match: {
                contestantsCount: {
                $gt: 0,
                },
            },
            },
        
            {
            $addFields: {
                hotScore: {
                $add: [
                    {
                    $multiply: [
                        {
                        $divide: [
                            "$contestantsCount",
                            "$MAXCONTESTANTS",
                        ],
                        },
                        100,
                    ],
                    },
        
                    {
                    $multiply: [
                        "$queueCount",
                        4,
                    ],
                    },
        
                    {
                    $multiply: [
                        "$votersCount",
                        2,
                    ],
                    },
        
                    {
                    $multiply: [
                        "$eliminationsCount",
                        3,
                    ],
                    },
                ],
                },
            },
            },
        
            {
            $sort: {
                hotScore: -1,
                updatedAt: -1,
            },
            },
        
            {
            $project: {
                hotScore: 0,
                contestantsCount: 0,
                queueCount: 0,
                votersCount: 0,
                eliminationsCount: 0,
            },
            },
        ];
        const localStages = await talentModel.aggregate(
            [...buildPipeline([userCountryCode]), { $limit: 15 }]
        );
            
        const regionalStages = await talentModel.aggregate(
            [...buildPipeline(otherCountries), { $limit: 15 }]
            );
        const stages = [
            ...localStages,
            ...regionalStages,
            ];
        await redis.set(
            cacheKey,
            JSON.stringify(stages),
            {
                ex:
                TRENDING_STAGES_CACHE_SECONDS,
            }
            );
        
        return stages;
    }catch (error) {

        console.error(
          "trendingStages error:",
          error
        );
    
        throw error;
    }
}

export default trendingStages ;