

import cron from "node-cron";
import { rebuildSpotlight } from "../redisCash/spotlight/performances/rebuildSpotlight.js";
import { SPOTLIGHT_REGIONS } from "../utilities/data.js";



export const startSpotlightGlobalJob = () => {
    // Every 6 hours
    cron.schedule("0 */6 * * *", async () => {

        console.log(
            "🔥 Starting Spotlight rebuild..."
        );
        try {
            await rebuildSpotlight();
            console.log(
                "✅ Spotlight rebuild completed"
            );
        } catch(error){
            console.error(
                "❌ Spotlight rebuild failed",
                error
            );

        }

    });

};

export const startSpotlightRegionalJob = () => {
    // Every 6 hours
    cron.schedule("0 */2 * * *", async () => {

        console.log(
            "🔥 Starting Spotlight rebuild..."
        );
        try {
            for (const region of SPOTLIGHT_REGIONS) {
                await rebuildSpotlight(region);
            }
        } catch(error){
            console.error(
                "❌ Spotlight rebuild failed",
                error
            );

        }

    });

};

