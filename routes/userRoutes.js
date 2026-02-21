

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
import { getPublicUrlFromB2, getUploadPrivateUrl, getUploadPublicUrl } from '../utilities/blackBlazeb2.js';

// const friendModel = require('../models/friends')
// require('dotenv').config()

dotenv.config();
const route = express.Router();

// Backblaze client

// await b2.authorize();

route.post("/getUploadVideoUrl", async (req, res) => {
  try {
    const { userId ,name , type } = req.body;
    console.log(userId + name)
    // type = "profile" | "cover" | "post"
    let fileName =  ""
    if(type == "profile" || type == "cover") 
         fileName =`users/${name.replace(/\s+/g, "")}_${userId}/${type}/${type}_${Date.now()}.jpg` 
    if (type == "talent" || type == "challenge" )
        fileName = `users/${name.replace(/\s+/g, "")}_${userId}/${type}_contests/submission_${Date.now()}.mp4`
    if (type == "thumbnail")  
          fileName = `users/${name.replace(/\s+/g, "")}_${userId}/${type}/thumbnail_${Date.now()}.jpg`;
    const uploadUrlResponse = await getUploadPrivateUrl()
    res.json({
      uploadUrl: uploadUrlResponse.data.uploadUrl,
      authorizationToken: uploadUrlResponse.data.authorizationToken,
      fileName:fileName,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

route.post("/getUploadImageUrl", async (req, res) => {
  try {
    const { userId ,name , type } = req.body;
    console.log(userId + name)
    // type = "profile" | "cover" | "post"
    let fileName =  ""
    if(type == "profile" || type == "cover") 
         fileName =`users/${name.replace(/\s+/g, "")}_${userId}/${type}/${type}_${Date.now()}.jpg` 
    // if (type == "talent" || type == "challenge" )
    //     fileName = `users/${name.replace(/\s+/g, "")}_${userId}/${type}_contests/submission_${Date.now()}.mp4`
    if (type == "thumbnail")  
          fileName = `users/${name.replace(/\s+/g, "")}_${userId}/${type}/thumbnail_${Date.now()}.jpg`;
    const uploadUrlResponse = await getUploadPublicUrl ()
    res.json({
      uploadUrl: uploadUrlResponse.data.uploadUrl,
      authorizationToken: uploadUrlResponse.data.authorizationToken,
      fileName:fileName,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

route.post("/saveProfileImage", async (req, res) => {
  const { userId,fileId ,  fileName } = req.body;
  const signedUrl = await getPublicUrlFromB2(fileName)
  await userModel.findByIdAndUpdate(userId, {
    profileImage: {
      fileId : fileId ,
      fileName :fileName,
      publicUrl : signedUrl,
    },
  });   
  res.json({ signedUrl });
});


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



route.route('/')
   .get(async(req,res)=>{ // get all users
     const users = await userModel.find({}).limit(20)
     if(!users) return res.json({error:"users list is empty"})
     res.json(users).status(200)   
   })   

   .post(validateUserRegistration,async(req,res)=> {  // add or register user
      const user = {...req.body,name:req.body.firstname+" "+req.body.lastname}
      const newUser = new userModel(user)
      if(! newUser) return res.json({error:"can't save user"})
      await newUser.save() 
      const findFriend = await friendModel.findOne({user_id:user._id})  
      if(!findFriend)  await  new friendModel(
        {
          user_id:newUser._id,
          email:user.email,
          name:user.name,
          profile_img:user.profile_img
      }).save() 
      const findFollower = await followerModel.findOne({user_id:newUser._id})  
      if(!findFollower)  await  new followerModel({
                               user_id:newUser._id,
                               email:user.email,
                               profile_img:user.profile_img,
                               name:user.name
                        }).save()   
       const id = newUser._id  
       const  token = jwt.sign(
          {id}, process.env.ACCESS_TOKEN_SECRET,{ expiresIn: '23h' }
       );
        
       res.status(200).json( {auth:true ,token:token , user:newUser})
      // res.json(newUser).status(200)        
   })   

async function validateUserRegistration(req,res,next) {

    if(!req.body.email || !req.body.password )
       return res.status(404).json({error:"invalid entry"})
    const query = {email:req.body.email}
    const user = await userModel.findOne(query)
    if(user) return res.json({error:"email exist already"}).status(400)
    next()
}  

route.route('/users/:id')
      .get(validateMongoObjectId,async(req,res)=>{ // get single user by _id
        const userId = req.params.id
        const user = await userModel.findById(userId)
        if(!user) return res.json({error:"cant find the user"}).status(404)
        res.status(200).json(user)
      })
      .delete(validateMongoObjectId,async(req,res)=>{ // delete single user by _id
        const userId = req.params.id
        const user = await userModel.findByIdAndDelete(userId)
        if(!user) return res.json({error:"cant find the user"}).status(404)
        res.status(200).json(user)
      })
      .patch(validateMongoObjectId,async(req,res)=>{ // update user infos by _id
        const userId = req.params.id
        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            req.body,
            { new: true }   
        )
        if(!updatedUser) return res.json({error:"cant find the user"}).status(404)
        res.status(200).json(updatedUser)
      })  

function validateMongoObjectId(req,res,next) {
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({Error:"error in request ID"});
    next()
    }    

       
  // challenge  get user by Id
    route.get('/user/:id',verifyJwt,validateMongoObjectId, async(req,res)=>{ 
      const userId = req.params.id
      const user = await userModel.findById(userId)
      if(!user) return res.json({error:"cant find the user"}).status(404)
      res.status(200).json(user)
    })
    // update user 
    route.patch('/user/:id',verifyJwt,validateMongoObjectId, async(req,res)=>{ 
      console.log(req.body)
      const userId = req.params.id
      const user = await userModel.findByIdAndUpdate(
               userId,
              req.body,
              { new: true }
            )
      if(!user) return res.json({error:"cant find the user"}).status(404)
      res.status(200).json(user)
    })
               
    
    

  // add following
  route.post('/followings/add/:id',verifyJwt,validateMongoObjectId,async(req,res)=>{
      const user_id = req.params.id;
      
      const following = {
        user_id:req.body.user_id,
        email:req.body.email,
        profile_img:req.body.profile_img,
        name:req.body.name
      }
      const follow = await followerModel.findOneAndUpdate(
              {user_id:user_id},
              {
                  // $push:
                  $addToSet:{ followings : following },
               },
               { new:true } 
              )

      const follower = await followerModel.findOneAndUpdate(
                {user_id:req.body.user_id},
                {
                    $push: { followers : {
                      user_id:user_id,
                      email:follow.email,
                      profile_img:follow.profile_img,
                      name: follow.name
                    }}
                 },
               { new:true } 
        )
  
      res.json(follow).status(200)

  })   

    // unfollow
    route.patch('/unfollowing/:id',verifyJwt,validateMongoObjectId,async(req,res)=>{
      //  if (req.params.id == req.body.following_id) return res.json("can't follow your self")
      const user_id = req.params.id;
      console.log(req.body)
      const following = {
        user_id:req.body.user_id,
        email:req.body.email,
        profile_img:req.body.profile_img,
        name:req.body.name
      }
      const follow = await followerModel.findOneAndUpdate(
              {user_id:user_id},
              {
                  $pull: { followings : following },
               },
               { new:true } 
           )

      const follower = await followerModel.findOneAndUpdate(
                {user_id:req.body.user_id},
                {
                    $pull: { followers : {
                      user_id:user_id,
                      // email:follow.email,
                      // profileimg:follow.profile_img,
                      // name:follow.name
                    }},

                 },
                 { new:true } 
        )
  
      res.json(follow).status(200)

  })   

// get follow Data
route.get('/follow/data/:id',verifyJwt,validateMongoObjectId,async(req,res)=>{
    const user_id = req.params.id
    let follow = await followerModel.findOne({user_id:user_id})
    return res.json(follow).status(200)
})

// followings
route.get('/followings/:id',verifyJwt,validateMongoObjectId,async(req,res)=>{
  const user_id = req.params.id
  const followinglist = await followerModel.findOne({user_id:user_id})
  if(!followinglist) return res.json([])
  const followings = followinglist.followings;
  return res.json(followings)
})



//*********************** Friends request , adding */

route.post('/friends/request/:id',verifyJwt,validateMongoObjectId,async(req,res)=>{
  const user_id = req.params.id;
  console.log(req.body)
  const friend_request = {
    user_id:req.body._id,
    name:req.body.name,
    email:req.body.email,
    profile_img:req.body.profile_img
  }
  const find_request= await friendModel.findOne
   ({
       user_id:req.body._id,
      'friend_request_sent.user_id':user_id
   })
  if(find_request) return  res.json("exist")

  const friend = await friendModel.findOneAndUpdate(
          {user_id:user_id},
          {
              $push: { friend_request_sent :friend_request },
           },  
           { new:true } 
          )
  const notification = new notificationModel({
     receiver_id:req.body._id,
     content: {
      sender_id:user_id,
      name:friend.name,
      profile_img:friend.profile_img,
      email:friend.email
     },
     message:"sent you a friend request",
     type:"friend request",
     isRead:false,
  })
  await notification.save();
  res.json(friend).status(200)
})   


route.post('/friends/unfriend/:id',verifyJwt,validateMongoObjectId,async(req,res)=>{
  const user_id = req.params.id;
  const friend_1 = {
    user_id:req.body._id,
    name:req.body.name,
    email:req.body.email,
    profile_img:req.body.profile_img
  }

  const find_friend = await friendModel.findOne({
    user_id:user_id,
    'friends.user_id': req.body._id})
  if(find_friend){
  const friend1 = await friendModel.findOneAndUpdate(
          {user_id:user_id},
          {
              $pull: { friends :{user_id:req.body._id} },
           },
           { new:true } 
          )
        }

  // const friend_2 = {
  //     user_id:friend1.user_id,
  //     name:friend1.name,
  //     email:friend1.email,
  //     profile_img:friend1.profile_img
  // }
  // const find_friendx = await friendModel.findOne({
  //   user_id:req.body._id,
  //  'friends.user_id': user_id})
  // if(!find_friendx){
  const friend2 = await friendModel.findOneAndUpdate(
    {user_id:req.body._id},
    {
        $pull: { friends :{user_id:user_id} },
     },
     { new:true } 
    )
  // }
  res.json(friend2).status(200)
})   


route.post('/friends/cancel/:id',verifyJwt,validateMongoObjectId,async(req,res)=>{
  const user_id = req.params.id;
  const friend_request = {
    user_id:req.body._id,
    name:req.body.name,
    email:req.body.email,
    profile_img:req.body.profile_img
  }
  
  await friendModel.findOneAndUpdate(
          {user_id:req.body._id},
          {
              $pull: { friend_request_sent :{user_id:user_id} },
           },
           { new:true }   
          )
  const friend = await friendModel.findOneAndUpdate(
            {user_id:user_id},
            {
                $pull: { friend_request_sent :{user_id:req.body._id} },
             },
             { new:true }   
        )

  await notificationModel.findOneAndDelete({
       receiver_id:req.body._id,
       type:"friend request",
      'content.sender_id': user_id} ,
      { new:true }   
    )
  await notificationModel.findOneAndDelete({
      receiver_id:user_id,
      type:"friend request",
     'content.sender_id': req.body._id} ,
     { new:true }   
   )
  
  res.json(friend).status(200)
})  

route.post('/friends/accept/:id',verifyJwt,validateMongoObjectId,async(req,res)=>{
  const user_id = req.params.id;
  const friend_request = {
    user_id:req.body._id,
    name:req.body.name,
    email:req.body.email,
    profile_img:req.body.profile_img
  }
  const find_request = await friendModel.findOne({
    user_id:user_id,
    'friend_request_sent.user_id':req.body._id})
  if(!find_request) return  res.json("expired")
  const friend = await friendModel.findOneAndUpdate(
          {user_id:user_id},
          {
              $pull: { friend_request_sent :{user_id:req.body._id}},
              $push: {friends : friend_request},
           },
           { new:true }   
          )
  const sender ={
     user_id:friend.user_id,
     name:friend.name,
     email:friend.email,
     profile_img:friend.profile_img
  }        
  const friend_sender = await friendModel.findOneAndUpdate(
            {user_id:req.body._id},
            {
                $push: {friends : sender},
             },
             { new:true }     
            )
         
  let notification = await notificationModel.findOne({
       receiver_id:req.body._id,
       type:"friend request",
      'content.sender_id': user_id}
    )
  notification.type = "friends"    
  notification.message = "is now a friend, start sharing"
  notification.isRead = true
  await notification.save()

  const newNotification = new notificationModel({
     receiver_id:user_id,
     content: {
     sender_id:req.body._id,
     name:req.body.name,  
     email:req.body.email,
     profile_img:req.body.profile_img
    },
    message:"has accepted your friend request, start sharing",
    type:"friends",   
    isRead:true,
  })
  await newNotification.save()
  res.json(friend_sender).status(200)
})  


route.get('/friends/list/:id',validateMongoObjectId,async(req,res)=>{
  const user_id = req.params.id;
  const friendlist = await friendModel.findOne({user_id:user_id})
  res.json(friendlist).status(200)

})   


//*********************** notifications */

route.get('/notifications/:id',validateMongoObjectId,async(req,res)=>{
  const receiver_id = req.params.id;
  const notifications = await notificationModel.find({receiver_id:receiver_id}).sort({ createdAt: -1 });
  res.json(notifications).status(200)
})  

route.patch('/notifications/:id',validateMongoObjectId,async(req,res)=>{
  const _id = req.params.id;
  const notification = await notificationModel.findById(_id)
  if(!notification) return res.json("notification expired")
  notification.isRead = true;
  await notification.save();
  res.json(notification).status(200)
})  

route.delete('/notifications/:id',verifyJwt,validateMongoObjectId,async(req,res)=>{
  const _id = req.params.id;
  const notifications = await notificationModel.findByIdAndDelete(_id)
  res.json("deleted").status(200)
})  


//********************************* search for users */

route.get('/find/search',verifyJwt,async(req,res)=>{
  const { name } = req.query;
  const users = await userModel.find({ name: { $regex: name, $options: 'i' } }); 
  res.json({users:users})
})   

//****************************** login user here */
route.post('/login', async(req, res)=>{     
 
    if(!req.body.email || !req.body.password) return res.json({error:"invalid loggin"}).status(404)
    const query = {email:req.body.email.toLowerCase(),password:req.body.password}
    const userEmail = await userModel.findOne({username:req.body.email.toLowerCase()})
    if(!userEmail) return res.json({error:"user not found"}).status(404)
    const user = await userModel.findOne(query)
    if(!user) return res.json({error:"invalid password"}).status(404)
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
    const id = user._id  
    const  token = jwt.sign(
      {id}, process.env.ACCESS_TOKEN_SECRET,{ expiresIn: '23h' }
   );
    
   res.status(200).json( {auth:true ,token:token , user:user})
})
   
//log out a user and reset session to null
route.get('/logout',async(req,res)=>{
    req.session.user = null  
    req.session.save(function (err) {  
      if (err) return err
      req.session.regenerate(function (err) {
        if (err) return err
        return res.redirect('/')  
      })
    })   
})

// middleware to test if authenticated
route.get('/isAuthenticated',verifyJwt ,async(req, res) =>{
    const userId = req.user.id.toString()
    const user =await  userModel.findById(userId)
    res.json(user)
}
)
     
function validatePost(req,res,next) {
      if(!req.body.id || !req.body.user_id || !req.body.image_url)
         return res.status(404).json({error:"invalid entry"}) 
      next()
  }  
    
function verifyJwt  (req,res,next){
  const token = req.headers.authorization?.split(' ')[1]; // Assuming token is sent in Authorization header
  if (!token) return res.status(401).json({ message: 'No token provided' });
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(403).send({ message: 'Failed to authenticate token' });
    req.user = decoded; // Store decoded user information in the request object
    next();
});   
}


export default route; 