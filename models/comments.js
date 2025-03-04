const mongoose = require('mongoose')


const commentSchema = new mongoose.Schema({
    post_id :{
        type:String,
        require:true,
    },
    user_id :{
        type:String,
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