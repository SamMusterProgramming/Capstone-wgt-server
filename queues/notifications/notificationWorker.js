import { Worker } from "bullmq";

import bullmqRedis from "../../config/bullmqRedis.js";
import { processNotification } from "./processNotification.js";



const notificationWorker = new Worker(
    "notifications",
    async (job) => {  
        console.log(
            "🔔 Processing notification job:",
            job.id
        );
        console.log(
            "Job data:",
            job.data
        );
        const result = await processNotification(job.data);
        console.log(
            "✅ Notification processed:",
            result
        );
        return result;
    },
    {
        connection: bullmqRedis,
        concurrency: 10,
    }
);

notificationWorker.on(
    "completed",
    (job) => {
        console.log(
            `✅ Notification job ${job.id} completed`
        );
    }
);

notificationWorker.on(
    "failed",
    (job, error) => {

        console.error(
            `❌ Notification job ${job?.id} failed:`,
            error
        );

    }
);

export default notificationWorker;