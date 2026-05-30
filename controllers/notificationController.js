import redis from "../config/redis.js";
import { buildPushNotification, getReceiverNotifications,  sendPushNotification } from "../pipeLine/getReceiverNotifications.js";
import notificationService from "../service/notificationService.js";
import { notificationViewBuilders } from "../templates/notificationViewBuilders.js";
import { getUserProfile } from "./userController.js";







export const broadcastNotification = async (
                                    receivers = [],
                                    senderId,
                                    category,
                                    type,
                                    metadata = {},
                                    ) => {
  try {
    const uniqueReceivers =
    [...new Set(receivers)];
        if (!uniqueReceivers.length) return;
        for (const receiverId of uniqueReceivers) {
        const notification = await notificationService.emit({
            receiverId,
            senderId,
            category,
            type,
            metadata,
        });
        const pushNotification = await  buildPushNotification(notification)
        const receiver = await getUserProfile(receiverId)
        await sendPushNotification(receiver.expoPushToken, {
          title: "New Activity",
          body: pushNotification.presentation.text,
          data: {...pushNotification.metadata , type : notification.type}
        });
        }
  } catch (err) {
    console.log(
      'BROADCAST NOTIFICATION ERROR:',
      err
    );
  }
};


export const emitNotification = async (
                                        receiverId,
                                        senderId = null,
                                        category,
                                        type,
                                        metadata = {},
                                        ) => {
    try {
      const notification = await notificationService.emit({
        receiverId,
        senderId,
        category,
        type,
        metadata,
      });
      //try only
      const pushNotification = await  buildPushNotification(notification)
      const receiver = await getUserProfile(receiverId)
      await sendPushNotification(receiver.expoPushToken, {
        title: "New Activity",
        body: pushNotification.presentation.text,
        data: {...pushNotification.metadata , type : notification.type}
      });
      return notification;
    } catch (err) {
      console.log('EMIT NOTIFICATION ERROR:', err);
    }
};


  // controller example
export const getNotifications = async (req, res) => {
  try {
    const notifications =
      await getReceiverNotifications({
        receiverId:req.user._id,
        limit:
          Number(req.query.limit) || 20,
        page:
          Number(req.query.page) || 1,
      });
    return res.status(200).json(
      notifications
    );
  } catch (err) {
    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch notifications",
    });
  }
};

  