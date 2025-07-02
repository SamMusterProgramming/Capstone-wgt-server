const mongoose = require('mongoose')
const validator = require('validator');


const dataSchema = new mongoose.Schema({ 
    owner_id:{
       type:String,
       required: true   
    },
    post_id:{ 
       type:String,
       required:true,
    },
    likes:[],
    votes:[],
    flags:[],
    comments: [] 
},
 { timestamps: true, versionKey: false }
 )
dataSchema.index({user_id:1});
dataSchema.index({post_id:1});
dataSchema.index({user_id:1,post_id:1});

let talentPostDataModel = mongoose.model("postData",dataSchema);

module.exports = talentPostDataModel ;