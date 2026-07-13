import generateSpotlightLeaderboard from "./generateSpotlightLeaderboard.js";
import cacheSpotlightPerformances from "./spotlightCache.js";
import updateSpotlightRanks from "./updatePotlightRanking.js";


export const rebuildSpotlight = async()=>{

    const performances =
        await generateSpotlightLeaderboard();
    console.log(performances.map(p => p.spotlightScore))
    await cacheSpotlightPerformances(
        performances
    );

};