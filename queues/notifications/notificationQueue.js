import { Queue } from "bullmq";
import bullmqRedis from "../../config/bullmqRedis.js";

const notificationQueue = new Queue(
    "notifications",
    {
        connection: bullmqRedis,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 1000,
            },
            removeOnComplete: {
                age: 60 * 60,
                count: 1000,
            },
            removeOnFail: {
                age: 24 * 60 * 60,
            },
        },
    }
);

export default notificationQueue;