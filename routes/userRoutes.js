

import express from 'express';
import userModel from '../models/users.js';
import session from 'express-session';
import { ObjectId } from 'mongodb';
import { users, challenges } from '../utilities/data.js';
import followerModel from '../models/followers.js';
import friendModel from '../models/friends.js';
import notificationModel from '../models/notifications.js';
import jwt from 'jsonwebtoken';
import B2 from 'backblaze-b2';
import dotenv from 'dotenv';
import b2 from '../B2.js' 
import { deleteFileFromB2_Public, getPublicUrlFromB2, getUploadPrivateUrl, getUploadPublicUrl } from '../utilities/blackBlazeb2.js';
import { verifyFirebaseToken } from '../middleware/auth.js';
import { anonymouslogin, getMe, googleLogin, login, signup } from '../controllers/authController.js';
import { protect } from '../middleware/jwtProtect.js';
import talentModel from '../models/talent.js';
import { acceptRequest, cancelRequest, friendRequest, getFriendList, unfriendRequest } from '../controllers/friendController.js';
import { followingRequest, getFollowersList, unfollowingRequest } from '../controllers/followController.js';
import { deleteNotificationById, deleteUserById, getUploadImageUrl, getUploadVideoUrl, getUserById, getUserNotificationsByUserId, saveProfileImage, updateNotificationById, updateUserInfoById } from '../controllers/userController.js';
// import admin from '../service/firebase.js';


dotenv.config();
const route = express.Router();


// auth user, login , sign up 
route.post("/auth/login", login);
route.post("/auth/signup", signup);
route.get("/auth/me", protect, getMe);
route.post("/auth/google", googleLogin);
route.post("/auth/anonymous", anonymouslogin);

// update user ,  name , profile image , cover , get user,  materials... 
route.route('/user/:id')
     .get(protect,validateMongoObjectId,getUserById)
     .delete(protect,validateMongoObjectId,deleteUserById)
     .patch(protect,validateMongoObjectId,updateUserInfoById)  
route.post("/saveProfileImage",protect,saveProfileImage)
route.post("/saveCoverImage",protect, saveProfileImage);
route.post("/getUploadVideoUrl",protect, getUploadVideoUrl);
route.post("/getUploadImageUrl", protect , getUploadImageUrl);

//friends , requests ... 
route.post("/friends/request/:id",protect,validateMongoObjectId,friendRequest);
route.post("/friends/cancel/:id",protect,validateMongoObjectId,cancelRequest);
route.post('/friends/accept/:id',protect,validateMongoObjectId,acceptRequest);
route.post('/friends/unfriend/:id',protect,validateMongoObjectId , unfriendRequest)
route.get('/friends/list/:id',protect,validateMongoObjectId,getFriendList)

// follows, requests 
route.post("/followings/add/:id",protect,validateMongoObjectId,followingRequest)
route.patch('/unfollowing/:id',protect,validateMongoObjectId,unfollowingRequest)
route.get('/follow/data/:id',protect,validateMongoObjectId,getFollowersList)

// user notification
route.route('/notifications/:id')
     .get(protect , getUserNotificationsByUserId)
     .patch(protect , updateNotificationById)  
     .delete(protect,deleteNotificationById)  


// seeds the database with prototype data
route.get('/seed',async(req,res)=>{
    userModel.collection.drop() // delete the collection document
    data.users.forEach(async(user) => {
      await new userModel(user).save()
    })
    const users = await userModel.find({}).limit(20)
    if(!users) return res.json({error:"users list is empty"})
    res.json(users).status(200) 
})

route.get('/followers/seed',async(req,res)=>{
  followerModel.collection.drop() // delete the collection document
  res.json("done").status(200) 
})


function validateMongoObjectId(req,res,next) {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({Error:"error in request ID"});
    next()
    }    

       
  // challenge  get user by Id
    // route.get('/user/:id',protect,validateMongoObjectId, async(req,res)=>{ 
    //   const userId = req.params.id
    //   const user = await userModel.findById(userId)
    //   if(!user) return res.json({error:"cant find the user"}).status(404)
    //   res.status(200).json(user)
    // })









//********************************* search for users */

route.get('/find/search',protect,async(req,res)=>{
  const { name } = req.query;
  const users = await userModel.find({ name: { $regex: name, $options: 'i' } }); 
  res.json({users:users})
})   




export default route; 