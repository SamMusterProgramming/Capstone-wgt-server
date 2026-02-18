import mongoose from 'mongoose';
import validator from 'validator';

const userSchema = new mongoose.Schema({
    
     name:{
        type:String,
        default:"Unknown Some"
     },
     profile_img:{
        type:String,
        required:false,
        default:"/static/images/avatar.avif"
     },
     profileImage: {
      fileId: String,
      fileName: String,
      publicUrl: String,
    },
     cover_img:{
      type:String,
      required:false,
      default:"/static/images/avatar.avif"
     },
     email:{
        type:String,
        required:true,
        unique: true,
        validate: {
            validator: validator.isEmail,
            message: 'Invalid email format'
        }   
     },   
     password: {
        type: String,
        required: true
      },
     username :{    
        type:String,
        required:true,
     },
     city:{
      type:String,
      default:"Charlotte"
     },
     state:{
      type:String,
      default:"North Carolina"
     },
     country:{
      type:String,
      default:"US"
     },
     talent:{
      type:String,
      default:   "add your profession"
     },
     tellus:{
      type:String,
      default: ""
     },
     followers: {
      type:Number,
      default: 0 ,
      required:false  
     }
   },
    { timestamps: true , versionKey: false }
 )

// userSchema.index({email:1});
userSchema.index({username:1});   
userSchema.index({email:1,password:1});

let userModel = mongoose.model("users",userSchema);

export default  userModel ;