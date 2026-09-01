
import userModel from "../../models/users.js";
import { buildPushNotification, sendPushNotification } from "../../pipeLine/getReceiverNotifications.js";
import notificationService from "../../service/notificationService.js";

export const processNotification = async ({
    receiverId,
    senderId,
    category,
    type,
    metadata = {},
}) => {

    const notification = await notificationService.emit({
        receiverId,
        senderId,
        category,
        type,
        metadata,
    });
    console.log(notification)
    const pushNotification =
        await buildPushNotification(notification);

    const receiver =await userModel
    .findById(receiverId)
    .select("expoPushToken")
    .lean();

    if (!receiver?.expoPushToken) {
        console.log(
            `ℹ️ User ${receiverId} has no push token`
        );

        return {
            notificationId: notification._id,
            pushSent: false,
        };
    }

    await sendPushNotification(
        receiver.expoPushToken,
        {
            title: "New Activity",
            body: pushNotification.presentation.text,
            data: {
                ...pushNotification.metadata,
                type: notification.type,
                notification_id: notification._id,
            },
        }
    );
    return {
        notificationId: notification._id,
        pushSent: true,
    };
};