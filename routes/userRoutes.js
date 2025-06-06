const express = require('express')
const userModel = require('../models/users')
const session = require('express-session')
const {ObjectId} = require('mongodb')
const data = require('../utilities/data')
const followerModel = require('../models/followers')
const friendModel = require('../models/friends')
const notificationModel = require('../models/notifications')
const jwt = require('jsonwebtoken')
// const friendModel = require('../models/friends')
require('dotenv').config()
route = express.Router();


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
        console.log(newUser)
      await newUser.save() 
      const findFriend = await friendModel.findOne({receiver_id:user._id})  
      if(!findFriend)  await  new friendModel(
        {
          receiver_id:newUser._id,
          user_email:user.email,
          user_name:user.name,
          profile_img:user.profile_img
      }).save() 
      const findFollower = await followerModel.findOne({user_id:newUser._id})  
      if(!findFollower)  await  new followerModel({user_id:newUser._id,user_email:user.email}).save()   
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
        following_id:req.body.following_id,
        following_email :req.body.following_email,
        following_profileimg : req.body.following_profileimg,
        following_name : req.body.following_name
      }
      const follow= await followerModel.findOneAndUpdate(
              {user_id:user_id},
              {
                  $push: { followings : following },
                  $inc: { followings_count: 1 }
               },
               { new:true } 
              )

      const follower = await followerModel.findOneAndUpdate(
                {user_id:req.body.following_id},
                {
                    $push: { followers : {
                      follower_id:user_id,
                      follower_email:follow.user_email,
                      follower_profileimg:req.body.follower_profileimg,
                      follower_name : req.body.follower_name
                    }},
                    $inc: { followers_count: 1 }
                 },
               { new:true } 
        )
  
      res.json(follow.followings).status(200)

  })   

    // unfollow
    route.patch('/unfollowing/:id',verifyJwt,validateMongoObjectId,async(req,res)=>{
      //  if (req.params.id == req.body.following_id) return res.json("can't follow your self")
      const user_id = req.params.id;

      const following = {
        following_id:req.body.following_id,
        following_email :req.body.following_email,
        following_profileimg:req.body.following_profileimg,
        following_name :req.body.following_name
      }
      const follow= await followerModel.findOneAndUpdate(
              {user_id:user_id},
              {
                  $pull: { followings : following },
                  $inc: { followings_count: -1 }
               },
               { new:true } 
              )

      const follower = await followerModel.findOneAndUpdate(
                {user_id:req.body.following_id},
                {
                    $pull: { followers : {
                      follower_id:user_id,
                      follower_email:follow.user_email,
                      follower_profileimg:req.body.follower_profileimg,
                      follower_name:req.body.follower_name
                    }},
                    $inc: { followers_count: -1 }

                 },
                 { new:true } 
        )
  
      res.json(follow.followings).status(200)

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
  const receiver_id = req.params.id;
  const friend_request = {
    sender_id:req.body._id,
    name:req.body.name,
    email:req.body.email,
    profile_img:req.body.profile_img
  }
  const find_request= await friendModel.findOne({
    receiver_id:req.body._id,
  'friend_request_received.sender_id':receiver_id})
  if(find_request) return  res.json("request exists")

  const friend = await friendModel.findOneAndUpdate(
          {receiver_id:receiver_id},
          {
              $push: { friend_request_received :friend_request },
           },
           { new:true } 
          )
  const notification = new notificationModel({
     receiver_id:receiver_id,
     content: {
      sender_id:req.body._id,
      name:req.body.name,
      profile_img:req.body.profile_img,
      email:req.body.email
     },
     message:"sent you a friend request",
     type:"friend request",
     isRead:false,
  })
  await notification.save();
  res.json(friend).status(200)
})   


route.post('/friends/unfriend/:id',verifyJwt,validateMongoObjectId,async(req,res)=>{
  const receiver_id = req.params.id;
  const friend_1 = {
    sender_id:req.body._id,
    name:req.body.name,
    email:req.body.email,
    profile_img:req.body.profile_img
  }

  const find_friend = await friendModel.findOne({
    receiver_id:receiver_id,
  'friends.sender_id': req.body._id})
  if(!find_friend) return  res.json("request expired")

  const friend1 = await friendModel.findOneAndUpdate(
          {receiver_id:receiver_id},
          {
              $pull: { friends :{sender_id:req.body._id} },
              $inc: { friends_count: -1 }
           },
           { new:true } 
          )
  const friend_2 = {
      sender_id:friend1.receiver_id,
      name:friend1.user_name,
      email:friend1.user_email,
      profile_img:friend1.profile_img
  }
  const find_friendx = await friendModel.findOne({
    receiver_id:req.body._id,
  'friends.sender_id': receiver_id})
  if(!find_friendx) return  res.json("request expired")
  const friend2 = await friendModel.findOneAndUpdate(
    {receiver_id:req.body._id},
    {
        $pull: { friends :{sender_id:friend1.receiver_id} },
        $inc: { friends_count:-1 }
     },
     { new:true } 
    )
  res.json(friend1).status(200)
})   


route.post('/friends/cancel/:id',verifyJwt,validateMongoObjectId,async(req,res)=>{
  const receiver_id = req.params.id;
  const friend_request = {
    sender_id:req.body._id,
    name:req.body.name,
    email:req.body.email,
    profile_img:req.body.profile_img
  }
  const find_request = await friendModel.findOne({
    receiver_id:receiver_id,
  'friend_request_received.sender_id': req.body._id})
  if(!find_request){ 
    await notificationModel.findOneAndDelete({
      receiver_id:receiver_id,
      type:"friend request",
     'content.sender_id': req.body._id} ,
     { new:true }   
   )
    return res.json("couldn't find request expired")
  }
  const friend = await friendModel.findOneAndUpdate(
          {receiver_id:receiver_id},
          {
              $pull: { friend_request_received :{sender_id:req.body._id} },
           },
           { new:true }   
          )
  let notifications = await notificationModel.findOneAndDelete({
       receiver_id:receiver_id,
       type:"friend request",
      'content.sender_id': req.body._id} ,
      { new:true }   
    )
  
  res.json(friend).status(200)
})  

route.post('/friends/accept/:id',verifyJwt,validateMongoObjectId,async(req,res)=>{
  const receiver_id = req.params.id;
  const friend_request = {
    sender_id:req.body._id,
    name:req.body.name,
    email:req.body.email,
    profile_img:req.body.profile_img
  }
  const find_request = await friendModel.findOne({
    receiver_id:receiver_id,
  'friend_request_received.sender_id':req.body._id})
  if(!find_request) return  res.json("couldn't find request expired")
  const friend = await friendModel.findOneAndUpdate(
          {receiver_id:receiver_id},
          {
              $pull: { friend_request_received :{sender_id:req.body._id}},
              $push: {friends : friend_request},
              $inc: { friends_count: 1 }
           },
           { new:true }   
          )
  const sender ={
     sender_id:friend.receiver_id,
     name:friend.user_name,
     email:friend.user_email,
     profile_img:friend.profile_img
  }        
  const friend_sender = await friendModel.findOneAndUpdate(
            {receiver_id:req.body._id},
            {
                $push: {friends : sender},
                $inc: { friends_count: 1 }
             },
             { new:true }     
            )
  let notification = await notificationModel.findOne({
       receiver_id:receiver_id,
       type:"friend request",
      'content.sender_id': req.body._id}
    )
  notification.type = "friends"    
  notification.message = "is now a friend, start sharing"
  notification.isRead = true
  await notification.save()
  const newNotification = new notificationModel({
     receiver_id:req.body._id,
     content: {
     sender_id:receiver_id,
     name:friend.user_name,
     email:friend.user_email,
     profile_img:friend.profile_img
    },
    message:"is now a friend, start sharing",
    type:"friends",   
    isRead:true,
  })
  await newNotification.save()
  res.json(friend_sender).status(200)
})  



route.get('/friends/list/:id',validateMongoObjectId,async(req,res)=>{
  const receiver_id = req.params.id;
  const friendlist = await friendModel.findOne({receiver_id:receiver_id})
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
    if(!findFollower)  await  new followerModel({user_id:user._id,user_email:user.email}).save()   
    const findFriend = await friendModel.findOne({receiver_id:user._id})  
    if(!findFriend)  await  new friendModel(
      {
        receiver_id:user._id,
        user_email:user.email,
        user_name:user.name,
        profile_img:user.profile_img
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


module.exports = route; 