
import mongoose from "mongoose";


const PostLikeSchema =
new mongoose.Schema({

    post_id:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        index:true,
    },

    stage_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"stages",
        required:true,
        index:true,
    },

    liker_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"users",
        required:true,
        index:true,
    },


    createdAt:{
        type:Date,
        default:Date.now
    }


},
{
    versionKey:false
});


PostLikeSchema.index(
{
    liker_id:1,
    stage_id:1,
    post_id:1
},
{
    unique:true
});

let StagePostLikeModel = mongoose.model(
    "StagePostLike",
    PostLikeSchema
);
export default StagePostLikeModel