

import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  receiver_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  category: {
    type: String,
    enum: [
      'friends',
      'arena',
      'competition',
      'voting',
      'admin',
      'system',
    ],
    required: true,
  },

  type: {
    type: String,
    enum: [

      // SOCIAL
      'followed',
      'friend_request',
      'friend_request_accepted',
      'friend_request_accepted_byou',

      //arena
      'arena_created',
      "follow_arena" ,
      "star_arena" ,
      'performance_added',
      "fire_received",
      "comment_received",
      "spotlight_featured",


      // COMPETITION
      'performance_posted',
      'contest_joined',
      "contest_queued",
      'advanced_to_next_round',
      'eliminated',

      // VOTING
      'vote_received',
      'top_ranked',

      // TALENT ROOM
      'room_invite',
      'room_message',

      // ADMIN
      'admin_announcement',
      'account_warning',

      // SYSTEM
      'system_update',

    ],
    required: true,
  },

  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  is_read: {
    type: Boolean,
    default: false,
  },

  read_at: {
    type: Date,
    default: null,
  }
  // createdAt: {
  //   type: Date,
  //   default: Date.now,
  // },
 
},
{
  timestamps: true,
},
{
  versionKey: false,
});


// notificationSchema.index({receiver_id:1});   
let notificationModel = mongoose.model('Notification', notificationSchema);

export default  notificationModel