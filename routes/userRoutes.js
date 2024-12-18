const express = require('express')
const userModel = require('../models/users')
const postModel = require('../models/posts')
const session = require('express-session')
const {ObjectId} = require('mongodb')
const data = require('../utilities/data')
const { v4: uuidv4 } = require('uuid');
const followerModel = require('../models/followers')

route = express.Router();

route.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true   
})) 
 
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
    if(!req.body.email || !req.body.password || !req.body.username )
       return res.status(404).json({error:"invalid entry"}) //redirect('/registration')
    const query = {email:req.body.email}
    const user = await userModel.findOne(query)
    if(user) return res.status(400).json({error:"email exisit already"})
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
      console.log("start the user"+  req.params.id)
      const userId = req.params.id
      const user = await userModel.findById(userId)
      if(!user) return res.json({error:"cant find the user"}).status(404)
        console.log(user)
      res.status(200).json(user)
    })
          
    
    

  // add follower
  route.post('/followers/add/:id',validateMongoObjectId,async(req,res)=>{
    console.log(req.body)
       if (req.params.id == req.body.follower_id) return res.json("can't follow your self")
      const user_id = req.params.id
      let follower = await followerModel.findOne(
              {user_id:user_id}
              )
      // if(follower) follower = await new followerModel({user_id:user_id, user_email:req.body.user_email,followers_count:1}).save()
      let findFollower = false; 
      follower.followers.forEach(follower =>{
        if(follower.follower_id === req.body.follower_id) findFollower = true ;
      }) 

      console.log(findFollower)
      if(findFollower) 
        {
          follower.followers = follower.followers.filter(el => el.follower_id.toString() !== req.body.follower_id)
          await follower.save()
          return res.json({isFollowing:false}).status(200)
        }
      else {
       const newFollower = {  
            follower_id:req.body.follower_id,
            follower_email: req.body.email
       }
       follower.followers.push(newFollower)  
       await follower.save()
       return res.json({isFollowing:true}).status(200)
      }
  })   


// find follower
route.post('/followers/:id',validateMongoObjectId,async(req,res)=>{
    console.log(req.params.id)
     if (req.params.id == req.body.follower_id) return res.json({noDisplay:true})
    const user_id = req.params.id
    let follower = await followerModel.findById(user_id)
    if(!follower)  return res.json({noDisplay:true}) //follower = await new followerModel({user_id:user_id, user_email:req.body.user_email}).save()
    const elementFollower = follower.followers.find(el => el.follower_id.toString() === req.body.follower_id);
    console.log(elementFollower) 
    if(elementFollower) return res.json({isFollowing:true})
    return res.json({isFollowing:false})
})




    
//I use this route to log in a user with session if successfully Authenticated 
route.get('/login', isAuthenticated, async (req, res) => {
    if(!req.session.user) res.status(400).json("not looged in n")
    res.status(200).json(req.session.user)
})
    
route.post('/login', async(req, res)=>{ 
  console.log(req.body)      
    if(!req.body.email || !req.body.password) return res.json({error:"invalid loggin "}).status(404)
    const query = {email:req.body.email,password:req.body.password}
    const user = await userModel.findOne(query)
    if(!user) return res.json({error:"user not found "}).status(404)
    const findFollower = await followerModel.findOne({user_id:user._id})  
    if(!findFollower)  await  new followerModel({user_id:user._id,user_email:user.email}).save()   
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