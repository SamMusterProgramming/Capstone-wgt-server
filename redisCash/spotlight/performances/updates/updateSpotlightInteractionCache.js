import redis from "../../../../config/redis.js";


const updateRedisSpotlightPage = async ({
    cacheKey,
    page,
    performance
}) => {

    if (!page) return;
    const key = `${cacheKey}:page:${page}`;
    const cached = await redis.get(key);
    if (!cached) return;
    const performances =
        typeof cached === "string"
            ? JSON.parse(cached)
            : cached;
    const index = performances.findIndex(
        p => p._id.toString() === performance._id.toString()
    );
    if (index === -1) return;
    performances[index] = {
        ...performances[index],
        spotlightScore: performance.spotlightScore,
        viewCount: performance.viewCount,
        fireCount: performance.fireCount,
        commentCount: performance.commentCount,
        shareCount: performance.shareCount,
        lastInteractionAt: performance.lastInteractionAt
    };
    await redis.set(
        key,
        JSON.stringify(performances),
        {
            KEEPTTL: true
        }
    );
};

const updateSpotlightInteractionCache = async (performance) => {
    const updates = [];
    // Global Spotlight
    if (performance.globalSpotlight?.spotlight) {
        updates.push(
            updateRedisSpotlightPage({
                cacheKey: "spotlight:global",
                page: performance.globalSpotlight.page,
                performance
            })
        );
    }
    // Regional Spotlight
    if (performance.regionalSpotlight?.spotlight) {
        updates.push(
            updateRedisSpotlightPage({
                cacheKey: `spotlight:regional:${performance.regionalSpotlight.region}`,
                page: performance.regionalSpotlight.page,
                performance
            })
        );
    }
    // Local Spotlight
    if (performance.localSpotlight?.spotlight) {
        updates.push(
            updateRedisSpotlightPage({
                cacheKey: `spotlight:local:${performance.localSpotlight.country}`,
                page: performance.localSpotlight.page,
                performance
            })
        );
    }
    await Promise.all(updates);
};

export default updateSpotlightInteractionCache;