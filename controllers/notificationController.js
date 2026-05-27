import redis from "../config/redis.js";
import { getReceiverNotifications, sendPush } from "../pipeLine/getReceiverNotifications.js";
import notificationService from "../service/notificationService.js";
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
    await notificationService.emit({
        receiverId,
        senderId,
        category,
        type,
        metadata,
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
      const user = getUserProfile(receiverId)
      await sendPush(user.expoPushToken, {
        title: "New Activity",
        body: "A friend joined a stage",
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

  