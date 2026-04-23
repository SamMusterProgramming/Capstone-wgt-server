
import { generateToken } from "../middleware/jwtProtect.js";
import followerModel from "../models/followers.js";
import friendModel from "../models/friends.js";
import userModel from "../models/users.js";
import admin from "../service/firebase.js";
import { ensureUserRelations } from "../utilities/helper.js";

// ---------------- SIGNUP ----------------
export const signup = async (req, res) => {
    try {
      const { token } = req.body;
      // 🔥 verify firebase token
      const decoded = await admin.auth().verifyIdToken(token);
      const { uid , email, email_verified } = decoded;
      // 🔥 check if user exists
      const normalizedEmail = email.toLowerCase();
      let user = await userModel.findOne({ email: normalizedEmail });

      if (user) {
        return res.status(409).json({
          message: "User already exists. Please login instead.",
          color:"red"
        });
      }

      if (!user) {
        user = await userModel.create({
          uid: uid,
          email: email,
          username: normalizedEmail.split("@")[0],
          email_verified:email_verified ,
          providers: ["email"],
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
        
      return res.status(201).json({
        message: "Signup successful. Please verify your email before logging in." ,
         color:"lightgreen"
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
  
      const { uid, email } = decoded;
      const user = await userModel.findOne({ email: email.toLowerCase() });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.providers.includes("email")){
        return res.status(403).json({
          message: "Please login using Google",
        });
      }
      user.email_verified = true ;
      user.uid = uid;
      await user.save()
      await ensureUserRelations(user);
      const jwtToken = generateToken(user);
      res.json({
        token: jwtToken,
        user,
      });
  
    } catch (err) {
      res.status(500).json({ message: "Login failed" });
    }
  };


  //**********************anynomousLogin */

  export const anonymouslogin = async (req, res) => {
    try {
     
      const { token , email } = req.body;
      const decoded = await admin.auth().verifyIdToken(token);
      const { uid } = decoded;
      console.log(decoded)
      
      const user = await userModel.findOne({ email: email });
      console.log(user)
      if (!user || !user.providers.includes("anonymous")
      ) {
        return res.status(404).json({ message: "User not found" });
      }  
      // if (!user.providers.includes("email")){
      //   return res.status(403).json({
      //     message: "Please login using Google",
      //   });
      // }
      user.providers = "anonymous";
      user.email_verified = true ;
      user.uid = uid;
      console.log(user)
      await user.save()
      await ensureUserRelations(user);
      const jwtToken =  generateToken(user);
      res.json({
        token: jwtToken,
        user,
      });
  
    } catch (err) {
      res.status(500).json({ message: "Login failed" });
    }
  };

//******************** google login  */

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
  
      const { uid, email, email_verified, name } = decoded;
  
      if (!email) {
        return res.status(400).json({
          message: "Email not found in Google account",
        });
      }
      const normalizedEmail = email.toLowerCase();

  
      // 🔍 2. FIND USER BY EMAIL (IMPORTANT FIX)
      let user = await userModel.findOne({ email:normalizedEmail });
  
      // 🆕 3. CREATE USER IF NOT EXISTS
      if (!user) {
        user = await userModel.create({
          uid,
          email: normalizedEmail,
          username: normalizedEmail.split("@")[0],
          email_verified,
          name,
          providers: ["google"],
          profileImage: {
            fileId: null,
            fileName: null,
            publicUrl:
              "https://cdn.challenmemey.com/file/challengify-Images/avatar/avatar.png",
          },
          coverImage: {
            fileId: null,
            fileName: null,
            publicUrl:
              "https://cdn.challenmemey.com/file/challengify-Images/avatar/challengify.jpg",
          },
        });
      } else {
        // 🔗 LINK ACCOUNT (VERY IMPORTANT)
        if (!user.providers.includes("google")) {
          user.providers.push("google"); // merge provider
        }
        user.uid = uid;
        if (!user.email_verified && email_verified) {
          user.email_verified = true; // mark verified if Google verified
        }
  
        await user.save();
      }
      
      await ensureUserRelations(user);

      // 🔐 4. GENERATE JWT
      const jwtToken = generateToken(user);
  
      // 📦 5. RESPONSE
      return res.status(200).json({
        message: "Google login successful",
        token: jwtToken,
        user,
      });
  
    } catch (error) {
      console.error("GOOGLE AUTH ERROR:", error);
  
      return res.status(401).json({
        message: error.message || "Invalid or expired Firebase token",
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