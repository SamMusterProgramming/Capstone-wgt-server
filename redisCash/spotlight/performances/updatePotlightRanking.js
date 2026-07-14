import { recalculateSpotlightScore } from "../../../controllers/arenaController.js";
import arenaPostModel from "../../../models/arenaPost.js";


const updateSpotlightRanks = async (performances) => {
        // Refresh scores (age decay)
        for (const performance of performances) {
            const newScore = recalculateSpotlightScore(performance);
            if (newScore !== performance.spotlightScore) {
                performance.spotlightScore = newScore;
            }
        }
   
        // Sort again because scores may have changed
        performances.sort(
            (a, b) => b.spotlightScore - a.spotlightScore
        );
        const bulkOperations = [];
        const spotlightIds = [];

        performances.forEach((performance, index) => {

            const rank = index + 1;
            const page = Math.ceil(rank / 5);

            // Keep track of Top 500 ids
            spotlightIds.push(performance._id);

            bulkOperations.push({
                updateOne: {
                    filter: {
                        _id: performance._id
                    },
                    update: {
                        $set: {
                            spotlightScore: performance.spotlightScore,
                            spotlightRank: rank,
                            spotlightPage: page,
                            spotlightUpdatedAt: new Date()
                        }
                    }
                }
            });

        });
        if (bulkOperations.length > 0) {
            await arenaPostModel.bulkWrite(bulkOperations);
        }
        const bulkOperations1 =[]
        // Remove ranking information from performances
        // that are no longer inside the Top 500
        bulkOperations1.push({
            updateMany: {
                filter: {
                    _id: { $nin: spotlightIds },
                    spotlightRank: { $ne: null }
                },
                update: {
                    $set: {
                        spotlightRank: null,
                        spotlightPage: null,
                        spotlightUpdatedAt: null
                    }
                }
            }
        });

        if (bulkOperations1.length > 0) {
            await arenaPostModel.bulkWrite(bulkOperations1);
        }

        return performances;
};

export default updateSpotlightRanks ;