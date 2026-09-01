import notificationQueue from "../../queues/notifications/notificationQueue.js";

export const queueBroadcastNotification = async (
    receivers = [],
    senderId,
    category,
    type,
    metadata = {}
) => {

    const uniqueReceivers = [
        ...new Set(
            receivers
                .filter(Boolean)
                .map((id) => String(id))
        )
    ];

    if (!uniqueReceivers.length) {
        return [];
    }

    const jobs = uniqueReceivers.map((receiverId) => ({
        name: "send-notification",
        data: {
            receiverId,
            senderId: String(senderId),
            category,
            type,
            metadata,
        },
    }));

    const createdJobs = await notificationQueue.addBulk(jobs);

    console.log(
        `📨 Queued ${createdJobs.length} notification jobs`
    );

    return createdJobs;
};