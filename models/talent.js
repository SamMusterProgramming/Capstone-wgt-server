const mongoose = require('mongoose')
const validator = require('validator');


const talentSchema = new mongoose.Schema({ 
    name:{
        type:String,
        default:"unkown"
    },
    contestants:[]
    ,
    like_count:{
        type:Number,
        min:[0]
    },
  
     desc:{
        type:String,
        required:false,
        default: "add description"
    },
    region:{
        type:String
    },
   
    invited_friends:[],
    audience:{
       type:String,
       default: "open"
    },
    thumbNail_URL : {
        type:String
    },
    comments: [] // to store comment of a user in an array of object for the challenge 
},
 { timestamps: true, versionKey: false }
 )
talentSchema.index({region:1 , name:1});

let talentModel = mongoose.model("talents",talentSchema);

module.exports = talentModel ;    