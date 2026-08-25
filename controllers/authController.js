
import mongoose from "mongoose";
import { generateToken } from "../middleware/jwtProtect.js";
import followerModel from "../models/followers.js";
import friendModel from "../models/friends.js";
import userModel from "../models/users.js";
import admin from "../service/firebase.js";
import { ensureUserRelations, getSpotlightRegion } from "../utilities/helper.js";
import { Resend } from "resend";
import { resend } from "../config/resend.js";
import { getUserProfile, updateUserProfileRedis } from "./userController.js";
import rebuildSpotlight from "../redisCash/spotlight/performances/rebuild/rebuildSpotlight.js";
import { SPOTLIGHT_REGIONS } from "../utilities/data.js";
import redis from "../config/redis.js";
import FollowModal from "../models/follow.js";





const migrateFollowersToFollow = async () => {
  try {
    console.log("Starting follower migration...");

    const oldDocuments = await followerModel
      .find({})
      .select({
        user_id: 1,
        followers: 1,
        followings: 1,
      })
      .lean();

    console.log(
      `Found ${oldDocuments.length} old follower documents`
    );

    const operations = [];

    for (const document of oldDocuments) {
      const userId = document.user_id;

      if (!userId) {
        continue;
      }

      /*
       * =====================================================
       * FOLLOWERS
       *
       * If A is in user.followers:
       *
       * A follows user
       *
       * followerId  = A
       * followingId = user
       * =====================================================
       */

      for (const followerId of document.followers || []) {
        if (!followerId) {
          continue;
        }

        operations.push({
          updateOne: {
            filter: {
              followerId,
              followingId: userId,
            },

            update: {
              $setOnInsert: {
                followerId,
                followingId: userId,
              },
            },

            upsert: true,
          },
        });
      }

      /*
       * =====================================================
       * FOLLOWINGS
       *
       * If X is in user.followings:
       *
       * user follows X
       *
       * followerId  = user
       * followingId = X
       * =====================================================
       */

      for (const followingId of document.followings || []) {
        if (!followingId) {
          continue;
        }

        operations.push({
          updateOne: {
            filter: {
              followerId: userId,
              followingId,
            },

            update: {
              $setOnInsert: {
                followerId: userId,
                followingId,
              },
            },

            upsert: true,
          },
        });
      }
    }

    console.log(
      `Prepared ${operations.length} follow relationships`
    );

    /*
     * =====================================================
     * WRITE IN BATCHES
     *
     * Don't send hundreds of thousands of operations
     * in one gigantic bulkWrite.
     * =====================================================
     */

    const BATCH_SIZE = 1000;

    let inserted = 0;
    let processed = 0;

    for (
      let i = 0;
      i < operations.length;
      i += BATCH_SIZE
    ) {
      const batch = operations.slice(
        i,
        i + BATCH_SIZE
      );

      const result =
        await FollowModal.bulkWrite(
          batch,
          {
            ordered: false,
          }
        );

      inserted +=
        result.upsertedCount || 0;

      processed += batch.length;

      console.log(
        `Processed ${processed}/${operations.length}`
      );
    }

    console.log(
      `Migration complete. Created ${inserted} follow relationships.`
    );

    return {
      oldDocuments: oldDocuments.length,
      relationshipsProcessed: operations.length,
      relationshipsCreated: inserted,
    };

  } catch (error) {
    console.error(
      "Follower migration error:",
      error
    );

    throw error;
  }
};


// ---------------- SIGNUP ----------------
export const signup = async (req, res) => {
    try {
      const { token ,form } = req.body;
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
          name:form.name,
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
      const verificationLink =
        await admin
          .auth()
          .generateEmailVerificationLink(email);
          await resend.emails.send({
            from:
              "Challengify <verify@challenmemey.com>",
            to: email,
            subject:
              "Verify your Challengify account",
            html: `
              <h2>Welcome to Challengify</h2>
              <a href="${verificationLink}">
                Verify Email
              </a>
            `,
          });

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
      const user = await userModel.findOne({ email : email.toLowerCase() });
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
      await updateUserProfileRedis(user)
      const jwtToken = generateToken(user);
      res.json({
        token: jwtToken,
        user,
      });
    } catch (err) {
      res.status(500).json({ message: "Login failed" });
    }
  };

  //********************** anynomousLogin ************************/

  export const anonymouslogin = async (req, res) => {
    try {
      const { token , email } = req.body;
      const decoded = await admin.auth().verifyIdToken(token);
      const { uid } = decoded;
      const user = await userModel.findOne({ email:email.toLowerCase() });
      if (!user || !user.providers.includes("anonymous")
      ) {
        return res.status(404).json({ message: "User not found" });
      }  
      // if (!user.providers.includes("email")){
      //   return res.status(403).json({
      //     message: "Please login using Google",
      //   });
      // }
      user.email_verified = true ;
      user.uid = uid;
      await user.save()
      await ensureUserRelations(user);
      await updateUserProfileRedis(user)
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
      await updateUserProfileRedis(user)
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
      const user =  await getUserProfile(req.user._id) //await userModel.findById(req.user._id);
      // console.log(user)
      if(!user) return  res.json({user:false})
      // await rebuildSpotlight();
      
      
      // const keys = [];
      // for (let i =1 ; i<=50 ; i++) {
      //       keys.push(
      //           `spotlight:global:page:${i}`
      //       );
      // }
      // await redis.del(...keys);
      // await migrateFollowersToFollow()

      await rebuildSpotlight({
          type:"global"
      });
     const region =  getSpotlightRegion(user.country);
     await rebuildSpotlight({
      type:"regional",
      region
      });
     await rebuildSpotlight({
      type:"local",
      country : user.country
     });
      // await rebuildSpotlight(region)
      res.json({ user });
    } catch (err) {
      res.status(500).json({ message: "Error fetching user" });
    }
  };                       

  //------------------- pushToken ---------------
  export const addPushToken = async (req, res) => {
    const { userId, expoPushToken } = req.body;
    await userModel.updateMany(
      {
        expoPushToken : expoPushToken,
        _id: { $ne: userId }
      },
      {
        $unset: {
          expoPushToken: ""
        }
      }
    );
    const user = await userModel.findByIdAndUpdate(userId, {
      expoPushToken,
    },
    { new: true });
    await updateUserProfileRedis (user)
    res.sendStatus(200);
  }
 
  //----------------- delete pushToken
  export const deletePushToken = async (req, res) => {
    const user_id = req.params.id;
    const user = await userModel.findByIdAndUpdate(
      user_id,
      {
        $unset: {
          expoPushToken: ""
        }
      },{ new: true }
    );
    // console.log(user)
    await updateUserProfileRedis (user)
    res.sendStatus(200);
  }