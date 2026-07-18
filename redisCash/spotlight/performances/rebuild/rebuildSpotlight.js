// import generateSpotlightCandidates from "../generators/generateSpotlightCandidates.js";
import buildSpotlightLeaderboard from "../builders/buildSpotlightLeaderboard.js";
import cacheSpotlightPerformances from "../cache/cacheSpotlightPerformances.js";
import generateSpotlightCandidates from "../generator/generateSpotlightCandidates.js";


const rebuildSpotlight = async ({
    type,
    region = null,
    country = null
}) => {
    
    if(type==="regional" && !region){
        throw new Error(
            "Regional spotlight requires region"
        );
    }
    
    if(type==="local" && !country){
        throw new Error(
            "Local spotlight requires country"
        );
    }
    /*
        1. Build Mongo filter
    */
    let filter = {};
    if(type === "regional"){
        filter.spotlightRegion = region;
    }
    if(type === "local"){
        filter.spotlightCountry = country;
    }

    /*
        2. Get candidates
    */

    const candidates = await generateSpotlightCandidates(
                            filter
                        );

    /*
        3. Build ranking
    */

    const leaderboard =
        await buildSpotlightLeaderboard({
            performances:candidates,
            type,
            region,
            country
        });

    /*
        4. Update Redis
    */

    await cacheSpotlightPerformances({
        performances:leaderboard,
        type,
        region,
        country
    });

    return leaderboard;
};

export default rebuildSpotlight;