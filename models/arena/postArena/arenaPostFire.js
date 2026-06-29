import mongoose from "mongoose";


const PostFireSchema =
new mongoose.Schema({

    post_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"ArenaPost",
        required:true,
        index:true,
    },


    user_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
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


PostFireSchema.index(
{
    post_id:1,
    user_id:1
},
{
    unique:true
});

let arenaPostFireModel = mongoose.model(
    "ArenaPostFire",
    PostFireSchema
);
export default arenaPostFireModel