import cron from "node-cron";

import rebuildSpotlight from "../rebuild/rebuildSpotlight.js";
import { SPOTLIGHT_COUNTRIES, SPOTLIGHT_REGIONS } from "../../../../utilities/data.js";





const startSpotlightJobs = () => {
    /*
        GLOBAL SPOTLIGHT

        Every 6 hours
    */
    cron.schedule(
        "0 */6 * * *",
        async()=>{
            console.log(
                "🔥 rebuilding global spotlight"
            );
            try{
                await rebuildSpotlight({
                    type:"global"
                });
                console.log(
                    "✅ global spotlight complete"
                );
            }catch(error){
                console.error(
                    "❌ global spotlight failed",
                    error
                );
            }
        }
    );

    /*
        REGIONAL SPOTLIGHT

        Every 2 hours
    */
    cron.schedule(
        "0 */2 * * *",
        async()=>{
            console.log(
                "🔥 rebuilding regional spotlights"
            );
            try{
                for(
                    const region of SPOTLIGHT_REGIONS
                ){
                    await rebuildSpotlight({
                        type:"regional",
                        region
                    });
                }
                console.log(
                    "✅ regional spotlights complete"
                );
            }catch(error){
                console.error(
                    "❌ regional spotlight failed",
                    error
                );
            }
        }
    );

    /*
        LOCAL SPOTLIGHT

        Every 2 hours
    */
    cron.schedule(
        "30 */2 * * *",
        async()=>{
            console.log(
                "🔥 rebuilding local spotlights"
            );
            try{
                for(
                    const country of SPOTLIGHT_COUNTRIES
                ){
                    await rebuildSpotlight({
                        type:"local",
                        country
                    });
                }
                console.log(
                    "✅ local spotlights complete"
                );
            }catch(error){
                console.error(
                    "❌ local spotlight failed",
                    error
                );
            }
        }
    );
};

export default startSpotlightJobs;