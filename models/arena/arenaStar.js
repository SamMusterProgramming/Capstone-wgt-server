import mongoose from "mongoose";

const ArenaStarSchema =
new mongoose.Schema({
    arena_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Arena",
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
ArenaStarSchema.index(
{
    arena_id:1,
    user_id:1
},
{
    unique:true
});
let arenaStarModel = mongoose.model(
    "ArenaStar",
    ArenaStarSchema
);
export default  arenaStarModel ; 