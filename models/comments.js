const mongoose = require('mongoose')


const commentSchema = new mongoose.Schema({
     user_id :{
        type:Number,
        min: 0,
        require:true,
    },
    post_id :{
        type:Number,
        min: 0,
        require:true,
    },
     content:[]
},
 { versionKey: false }
 )
commentSchema.index({user_id:1})
commentSchema.index({post_id:1})
commentSchema.index({user_id:1,post_id:1});

let commentModel = mongoose.model("comments",commentSchema);

module.exports = commentModel ;