const express = require('express')
const userModel = require('../models/users')
const session = require('express-session')
const {ObjectId} = require('mongodb')
const data = require('../utilities/data')
const followerModel = require('../models/followers')
const jwt = require('jsonwebtoken')
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
      const user = req.body
      const newUser = new userModel(user)
      if(! newUser) return res.json({error:"can't save user"})
      await newUser.save() 
      res.json(newUser).status(200)      
   })   

async function validateUserRegistration(req,res,next) {
    if(!req.body.email || !req.body.password )
       return res.status(404).json({error:"invalid entry"})
    const query = {email:req.body.email}
    const user = await userModel.findOne(query)
    if(user) return res.status(400).json({error:"email exist already"})
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
    route.get('/user/:id',validateMongoObjectId, async(req,res)=>{ 
      const userId = req.params.id
      const user = await userModel.findById(userId)
      if(!user) return res.json({error:"cant find the user"}).status(404)
      res.status(200).json(user)
    })
    route.patch('/user/:id',validateMongoObjectId, async(req,res)=>{ 
     
      const userId = req.params.id
      const user = await userModel.findByIdAndUpdate(
               userId,
              req.body,
              { new: true }
            )
            console.log(user)
      if(!user) return res.json({error:"cant find the user"}).status(404)
      res.status(200).json(user)
    })
               
    
    

  // add following
  route.post('/followings/add/:id',validateMongoObjectId,async(req,res)=>{
      //  if (req.params.id == req.body.following_id) return res.json("can't follow your self")
      const user_id = req.params.id;
      const following = {
        following_id:req.body.following_id,
        following_email :req.body.following_email
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
                    $push: { followers : {follower_id:user_id,follower_email:follow.user_email}},
                    $inc: { followers_count: 1 }
                 },
               { new:true } 
        )
  
      res.json(follow.followings).status(200)

  })   

    // unfollow
    route.patch('/unfollowing/:id',validateMongoObjectId,async(req,res)=>{
      //  if (req.params.id == req.body.following_id) return res.json("can't follow your self")
      const user_id = req.params.id;
      console.log(user_id)

      const following = {
        following_id:req.body.following_id,
        following_email :req.body.following_email
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
                    $pull: { followers : {follower_id:user_id,follower_email:follow.user_email}},
                    $inc: { followers_count: -1 }

                 },
                 { new:true } 
        )
  
      res.json(follow.followings).status(200)

  })   

// get follow Data
route.get('/follow/data/:id',validateMongoObjectId,async(req,res)=>{
    console.log(req.params.id)
    const user_id = req.params.id
    let follow = await followerModel.findOne({user_id:user_id})
    return res.json(follow).status(200)
})

// followings
route.get('/followings/:id',validateMongoObjectId,async(req,res)=>{
  console.log(req.params.id)
  const user_id = req.params.id
  const followinglist = await followerModel.findOne({user_id:user_id})
  if(!followinglist) return res.json([])
  const followings = followinglist.followings;
  console.log(followings)
  return res.json(followings)
})

//I use this route to log in a user with session if successfully Authenticated 
route.get('/login', isAuthenticated, async (req, res) => {
    if(!req.session.user) res.status(400).json("not looged in n")
    res.status(200).json(req.session.user)
})
    
route.post('/login', async(req, res)=>{      
    if(!req.body.email || !req.body.password) return res.json({error:"invalid loggin"}).status(404)
    const query = {email:req.body.email,password:req.body.password}
    const userEmail = await userModel.findOne({username:req.body.email})
    if(!userEmail) return res.json({error:"user not found"}).status(404)
    const user = await userModel.findOne(query)
    if(!user) return res.json({error:"invalid password"}).status(404)
    const findFollower = await followerModel.findOne({user_id:user._id})  
    if(!findFollower)  await  new followerModel({user_id:user._id,user_email:user.email}).save()   
    // const accessToekn = jwt.sign(user.email , process.env.ACCESS_TOKEN_SECRET)  
    return res.status(200).json(user)
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
function isAuthenticated (req, res, next) {
    if (req.session.user) next()
    else res.redirect('/')
}

     
function validatePost(req,res,next) {
      if(!req.body.id || !req.body.user_id || !req.body.image_url)
         return res.status(404).json({error:"invalid entry"}) 
      next()
  }  

module.exports = route; 