import redis from "../../../config/redis.js";
import generateSpotlightPerformance from "./generateSpotlightPerformance.js";

const updateCachedSpotlightPerformance = async (post) => {

    // Performance is not currently inside the cached leaderboard
    if (!post.spotlightPage) {
        return;
    }

    const cacheKey = `spotlight:global:page:${post.spotlightPage}`;

    const cached = await redis.get(cacheKey);

    if (!cached) {
        return;
    }

    const page =
        typeof cached === "string"
            ? JSON.parse(cached)
            : cached;

    const updatedPerformance =
        await generateSpotlightPerformance(post._id);

    if (!updatedPerformance) {
        return;
    }

    const index = page.findIndex(
        performance =>
            performance._id.toString() ===
            updatedPerformance._id.toString()
    );

    if (index === -1) {
        return;
    }

    page[index] = updatedPerformance;

    await redis.set(
        cacheKey,
        JSON.stringify(page),
        {
            EX: 60 * 60 * 12
        }
    );

};

export default updateCachedSpotlightPerformance;