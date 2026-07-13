

import cron from "node-cron";
import { rebuildSpotlight } from "../redisCash/spotlight/performances/rebuildSpotlight.js";



export const startSpotlightJob = () => {
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