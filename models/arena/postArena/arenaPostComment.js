import mongoose from "mongoose";

const CommentSchema =
new mongoose.Schema({

    post_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"ArenaPost",
        index:true
    },

    user_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        index:true
    },

    text:{
        type:String,
        maxlength:500
    },

    likeCount:{
        type:Number,
        default:0
    },


    createdAt:{
        type:Date,
        default:Date.now
    }

});

let arenaPostCommentModel = mongoose.model(
    "ArenaPostComment",
    CommentSchema
);
export default arenaPostCommentModel