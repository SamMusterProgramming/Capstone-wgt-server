import generateSpotlightLeaderboard from "./generateSpotlightLeaderboard.js";
import cacheSpotlightPerformances from "./spotlightCache.js";
import updateSpotlightRanks from "./updatePotlightRanking.js";


export const rebuildSpotlight = async(region = null)=>{
    const filter = region
    ? { spotlightRegion : region }
    : {};

    const performances = await generateSpotlightLeaderboard(filter);

    await updateSpotlightRanks( performances
    )
    await cacheSpotlightPerformances(
        performances,
        region
        ? `spotlight:${region}`
        : "spotlight:global"
    );

};