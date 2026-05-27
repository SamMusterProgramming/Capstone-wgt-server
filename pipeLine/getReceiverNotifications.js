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