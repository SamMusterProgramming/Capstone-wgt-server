
import { generateToken } from "../middleware/jwtProtect.js";
import followerModel from "../models/followers.js";
import friendModel from "../models/friends.js";
import userModel from "../models/users.js";
import admin from "../service/firebase.js";

// ---------------- SIGNUP ----------------
export const signup = async (req, res) => {
    try {
      const { token } = req.body;
      // 🔥 verify firebase token
      const decoded = await admin.auth().verifyIdToken(token);
      const { uid , email, email_verified } = decoded;
      // 🔥 check if user exists
      let user = await userModel.findOne({ uid: uid });

      if (!user) {
        user = await userModel.create({
          uid: uid,
          email: email,
          username: email.split("@")[0], // default username
          email_verified:email_verified ,
          profileImage:{
            fileId:null ,
            fileName:null ,
            publicUrl :"https://cdn.challenmemey.com/file/challengify-Images/avatar/avatar.png"
          },
          coverImage:{
            fileId:null ,
            fileName:null ,
            publicUrl :"https://cdn.challenmemey.com/file/challengify-Images/avatar/challengify.jpg"
          }
        });
      }
      console.log(user)
      user.save()
      if (!email_verified) {
        return res.status(400).json({ message: "Email not verified" });
      }
      
      const jwtToken = generateToken(user);
    
      res.json({   
        token: jwtToken,
        user,
      });    
    
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Signup failed" });
    }
  };
  
  // ---------------- LOGIN ----------------
  export const login = async (req, res) => {
    try {
      const { token } = req.body;
      const decoded = await admin.auth().verifyIdToken(token);
  
      const { uid } = decoded;
      console.log(uid)
      const user = await userModel.findOne({ uid: uid });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      user.email_verified = true ;
      const findFollower = await followerModel.findOne({user_id:user._id})  
      if(!findFollower)  await  new followerModel(
              {
                user_id:user._id,
                email:user.email,
                profile_img:user.profile_img,
                name:user.name,
                followers:[],
                followings:[],
              }
            ).save()   
      const findFriend = await friendModel.findOne({user_id:user._id})  
      if(!findFriend)  await  new friendModel(
        {
          user_id:user._id,
          email:user.email,
          name:user.name,
          profile_img:user.profile_img,
          friend_request_sent:[],
          friends:[]
      }).save()   
      await user.save()
      const jwtToken = generateToken(user);
      res.json({
        token: jwtToken,
        user,
      });
  
    } catch (err) {
      res.status(500).json({ message: "Login failed" });
    }
  };

//********************google login  */

export const googleLogin = async (req, res) => {
    try {
      const { token } = req.body;
  
      if (!token) {
        return res.status(400).json({
          message: "Firebase token is required",
        });
      }
  
      // 🔥 1. VERIFY FIREBASE TOKEN
      const decoded = await admin.auth().verifyIdToken(token);
  
      const {
        uid,
        email,
        email_verified,
        name,
      } = decoded;
  
      if (!email) {
        return res.status(400).json({
          message: "Email not found in Google account",
        });
      }
  
      // 🔍 2. FIND USER
      let user = await userModel.findOne({ uid: uid });
  
      // 🆕 3. CREATE USER IF NOT EXISTS
      if (!user) {
        user = await User.create({
            uid: uid,
            email: email,
            username: email.split("@")[0], // default username
            email_verified:email_verified ,
            name: name,
            profileImage:{
              fileId:null ,
              fileName:null ,
              publicUrl :"https://cdn.challenmemey.com/file/challengify-Images/avatar/avatar.png"
            },
            coverImage:{
              fileId:null ,
              fileName:null ,
              publicUrl :"https://cdn.challenmemey.com/file/challengify-Images/avatar/challengify.jpg"
            }
        });
      }
  
      // 🔐 4. GENERATE JWT
      const jwtToken = generateToken(user._id);
  
      // 📦 5. RESPONSE
      return res.status(200).json({
        message: "Google login successful",
        token: jwtToken,
        user: user
      });
  
    } catch (error) {
      console.error("GOOGLE AUTH ERROR:", error);
  
      return res.status(401).json({
        message: "Invalid or expired Firebase token",
      });
    }
  };
  

  
  // ---------------- ME ----------------
  export const getMe = async (req, res) => {
    try {
      const user = await userModel.findById(req.user._id);
      console.log(user)
      if(!user) return  res.json({user:false})
      res.json({ user });
    } catch (err) {
      res.status(500).json({ message: "Error fetching user" });
    }
  };