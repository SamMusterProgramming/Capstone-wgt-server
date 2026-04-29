import  mongoose from 'mongoose'




const contestantSchema = new mongoose.Schema({

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    performances: [],
    votes: {
      type: Number,
      default: 0,
    },
  
    likes: {
      type: Number,
      default: 0,
    },
  
    rank: {
      type: Number,
      default: 0,
    },
  
    createdAt: {
      type: Date,
      default: Date.now,
    },
  
  }, { _id: true });


const talentSchema = new mongoose.Schema({ 
    name:{
        type:String,   
        default:"unkown"
    },
    contestants:
       { type: [contestantSchema],
         default: [] 
        }
    ,
    eliminations: { type: [contestantSchema],
        default: [] 
       }
    ,
    queue: { type: [contestantSchema],
        default: [] 
       }
    ,

    voters:[],
    editions:[],
    desc:{
        type:String,
        required:false,
        default: "add description"
    },
    region:{
        type:String
    },
    MAXCONTESTANTS: {
        type: Number,
        default: 22, 
      },
    invited_friends:[],
 
    thumbNail_URL : {
        type:String
    },
    comments: [] // to store comment of a user in an array of object for the challenge 
},
 { timestamps: true, versionKey: false }
 )
talentSchema.index({region:1 , name:1});
talentSchema.index({ "contestants.user_id": 1 });
talentSchema.index({ "queue.user_id": 1 });
talentSchema.index({ "eliminations.user_id": 1 });

let talentModel = mongoose.model("talents",talentSchema);

export default talentModel ;    