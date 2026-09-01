import IORedis from "ioredis";

const bullmqRedis = new IORedis(
    process.env.BULLMQ_REDIS_URL,
    {
        maxRetriesPerRequest: null,
    }
);


bullmqRedis.on("error", (error) => {
    console.error(
        "❌ BullMQ Redis error:",
        error
    );
});

export default bullmqRedis;