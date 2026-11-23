

import mongoose from "mongoose";


const PostVoteSchema =
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

    voter_id:{
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


PostVoteSchema.index(
{
    voter_id:1,
    stage_id:1
},
{
    unique:true
});

let StagePostVoteModel = mongoose.model(
    "StagePostVote",
    PostVoteSchema
);
export default StagePostVoteModel