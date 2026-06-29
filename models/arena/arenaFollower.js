import mongoose from "mongoose";

const ArenaFollowerSchema =
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


// prevent duplicate follows

ArenaFollowerSchema.index(
    {
        arena_id:1,
        user_id:1
    },
    {
        unique:true
    }
);

let arenaFollowerModel = mongoose.model(
    "ArenaFollower",
    ArenaFollowerSchema
);
export default arenaFollowerModel ; 