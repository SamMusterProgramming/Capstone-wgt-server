// getReceiverNotifications.js

import mongoose from "mongoose";
import notificationModel from "../models/notifications.js";
import { getUserProfile } from "../controllers/userController.js";
import { notificationViewBuilders } from "../templates/notificationViewBuilders.js";
// import notificationModel from "../models/notificationModel.js";
// import { getUserProfile } from "../controllers/userController.js";
// import { notificationViewBuilders } from "../templates/notificationViewBuilders.js";



export const getReceiverNotifications =
async ({
  receiverId,
  limit = 20,
  page = 1,
}) => {

  try {
    const notifications =
      await notificationModel
        .find({
          receiver_id:
            new mongoose.Types.ObjectId(
              receiverId
            ),
        })
        .sort({
          createdAt: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    const formatted =
      await Promise.all(
        notifications.map(
          async (notification) => {
            // sender profile
            const sender =
              await getUserProfile(
                notification.sender_id,
              ) || null;
            // template builder
            const builder =
              notificationViewBuilders[
                notification.type
              ];
            // final presentation
            const presentation =
              builder
                ? builder({
                    sender:
                      sender || {},
                    metadata:
                      notification.metadata || {},
                  })
                : null;
            return {
              _id:
                notification._id,
              receiver_id:receiverId,
              type:
                notification.type,
              category:
                notification.category,
              is_read:
                notification.is_read,
              createdAt:
                notification.createdAt,
              // sender,
              metadata:
                notification.metadata,
              presentation,
            };
          }
        )
      );
    return formatted;
  } catch (err) {
    console.log(
      "GET RECEIVER NOTIFICATIONS ERROR:",
      err
    );
    return [];
  }
};

export async function buildPushNotification(notification) {
      // sender profile
      const sender =
      await getUserProfile(
        notification.sender_id,
      ) || null;
    // template builder
    const builder =
      notificationViewBuilders[
        notification.type
      ];
    // final presentation
    const presentation =
      builder
        ? builder({
            sender:
              sender || {},
            metadata:
              notification.metadata || {},
          })
        : null;
    return {
      _id:
        notification._id,
      type:
        notification.type,
      category:
        notification.category,
      is_read:
        notification.is_read,
      createdAt:
        notification.createdAt,
      sender,
      metadata:
        notification.metadata,
      presentation,
    };
}


export async function sendPushNotification(expoPushToken, payload) {
  if(!expoPushToken) return ;
  const message = {
    to: expoPushToken,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
  };
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

}