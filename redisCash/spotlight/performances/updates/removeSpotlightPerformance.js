import redis from "../../../../config/redis.js";


const removeRedisSpotlightPage = async ({
    cacheKey,
    page,
    performanceId
}) => {

    if (!page) return;
    const key = `${cacheKey}:page:${page}`;
    const cached = await redis.get(key);
    if (!cached) return;
    const performances =
        typeof cached === "string"
            ? JSON.parse(cached)
            : cached;
    const updated = performances.filter(
        p => p._id.toString() !== performanceId
    );
    // Performance wasn't in this page
    if (updated.length === performances.length) {
        return;
    }
    await redis.set(
        key,
        JSON.stringify(updated),
        {
            KEEPTTL: true
        }
    );
};

const removeSpotlightPerformance = async (performance) => {

    const updates = [];

    // Global Spotlight
    if (performance.globalSpotlight?.spotlight) {
        updates.push(
            removeRedisSpotlightPage({
                cacheKey: "spotlight:global",
                page: performance.globalSpotlight.page,
                performanceId: performance._id.toString()
            })
        );
    }

    // Regional Spotlight
    if (performance.regionalSpotlight?.spotlight) {
        updates.push(
            removeRedisSpotlightPage({
                cacheKey: `spotlight:regional:${performance.regionalSpotlight.region}`,
                page: performance.regionalSpotlight.page,
                performanceId: performance._id.toString()
            })
        );
    }

    // Local Spotlight
    if (performance.localSpotlight?.spotlight) {
        updates.push(
            removeRedisSpotlightPage({
                cacheKey: `spotlight:local:${performance.localSpotlight.country}`,
                page: performance.localSpotlight.page,
                performanceId: performance._id.toString()
            })
        );
    }

    await Promise.all(updates);
};

export default removeSpotlightPerformance;