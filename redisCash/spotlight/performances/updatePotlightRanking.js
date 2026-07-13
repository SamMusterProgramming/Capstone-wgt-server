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
        spotlightIds.push(performance._id);
        bulkOperations.push({
            updateOne: {
                filter: {
                    _id: performance._id
                },
                update: {
                    $set: {
                        spotlightScore: performance.spotlightScore,
                        spotlight: true,
                        spotlightRank: index + 1,
                        spotlightUpdatedAt: new Date()
                    }
                }
            }
        });
    });

    // Remove spotlight flag from performances
    // that are no longer inside Top 500

    bulkOperations.push({
        updateMany: {
            filter: {
                _id: {
                    $nin: spotlightIds
                },
                spotlight: true
            },
            update: {
                $set: {
                    spotlight: false,
                    spotlightRank: null
                }
            }

        }
    });

    if (bulkOperations.length > 0) {
        await arenaPostModel.bulkWrite(
            bulkOperations
        );

    }
    return performances;
};

export default updateSpotlightRanks ;