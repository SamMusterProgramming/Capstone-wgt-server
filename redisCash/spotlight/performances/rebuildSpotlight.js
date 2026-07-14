import generateSpotlightLeaderboard from "./generateSpotlightLeaderboard.js";
import cacheSpotlightPerformances from "./spotlightCache.js";
import updateSpotlightRanks from "./updatePotlightRanking.js";


export const rebuildSpotlight = async()=>{

    const performances =
        await generateSpotlightLeaderboard();

    await updateSpotlightRanks(performances)
    await cacheSpotlightPerformances(
        performances
    );

};