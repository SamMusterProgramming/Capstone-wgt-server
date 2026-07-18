
import { recalculateSpotlightScore } from "../../../../controllers/arenaController.js";
import arenaPostModel from "../../../../models/arenaPost.js";


const PAGE_SIZE = 10;
const MAX_SPOTLIGHT = 500;


const buildSpotlightLeaderboard = async ({
                    performances,
                    type,
                    region = null,
                    country = null
                }) => {

    // 1. Refresh scores (age decay)
    for (const performance of performances) {
        performance.spotlightScore =
            recalculateSpotlightScore(performance);
    }
    // 2. Sort after score refresh
    performances.sort(
        (a,b)=>
        b.spotlightScore - a.spotlightScore
    );


    const bulkOperations = [];
    const spotlightIds = [];

    // 3. Assign ranking
    performances
    .slice(0, MAX_SPOTLIGHT)
    .forEach((performance,index)=>{
        const rank = index + 1;
        const page =  Math.ceil(rank / PAGE_SIZE);
        spotlightIds.push(
            performance._id
        );
        let spotlightData;
        if(type === "global"){
            spotlightData = {
                spotlight:true,
                rank,
                page,
                updatedAt:new Date()
            };
        }
        if(type === "regional"){
            spotlightData = {
                spotlight:true,
                region,
                rank,
                page,
                updatedAt:new Date()
            };
        }
        if(type === "local"){
            spotlightData = {
                spotlight:true,
                country,
                rank,
                page,
                updatedAt:new Date()
            };
        }

        bulkOperations.push({
            updateOne:{
                filter:{
                    _id:performance._id
                },
                update:{
                    $set:{
                        spotlightScore:
                            performance.spotlightScore,
                        [`${type}Spotlight`]:
                            spotlightData
                    }
                }
            }
        });
    });

    // 4. Save new leaderboard
    if(bulkOperations.length){
        await arenaPostModel.bulkWrite(
            bulkOperations
        );
    }

    // 5. Remove performances that left this spotlight
    let removeFilter;
    if(type === "global"){
        removeFilter = {
            "globalSpotlight.spotlight":true
        };
    }
    if(type === "regional"){
        removeFilter = {
            "regionalSpotlight.spotlight":true,
            "regionalSpotlight.region":region
        };
    }
    if(type === "local"){
        removeFilter = {
            "localSpotlight.spotlight":true,
            "localSpotlight.country":country
        };
    }
    const removeUpdate = {};
    if(type === "global"){
        removeUpdate.globalSpotlight = {
            spotlight:false,
            rank:null,
            page:null,
            updatedAt:null
        };
    }

    if(type === "regional"){
        removeUpdate.regionalSpotlight = {
            spotlight:false,
            rank:null,
            page:null,
            region:null,
            updatedAt:null
        };
    }

    if(type === "local"){
        removeUpdate.localSpotlight = {
            spotlight:false,
            rank:null,
            page:null,
            country:null,
            updatedAt:null
        };
    }


    await arenaPostModel.updateMany(
        {
            ...removeFilter,
            _id:{
                $nin:spotlightIds
            }
        },
        {
            $set:removeUpdate
        }
    );
    return performances.slice(
        0,
        MAX_SPOTLIGHT
    );
};


export default buildSpotlightLeaderboard;