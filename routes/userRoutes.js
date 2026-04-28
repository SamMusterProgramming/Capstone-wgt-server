

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
// import admin from '../service/firebase.js';


dotenv.config();
const route = express.Router();


// auth user, login , sign up 
route.post("/auth/login", login);
route.post("/auth/signup", signup);
route.get("/auth/me", protect, getMe);
route.post("/auth/google", googleLogin);
route.post("/auth/anonymous", anonymouslogin);


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

// route.post("/saveProfileImage", async (req, res) => {
//   const { userId ,fileId , fileName, deleteFileId, deleteFileName} = req.body;
//   const signedUrl = await getPublicUrlFromB2(fileName)
//   await userModel.findByIdAndUpdate(userId, {
//     profileImage: {
//       fileId : fileId ,
//       fileName :fileName,
//       publicUrl : signedUrl,
//     },
//   });   
//   console.log(deleteFileName)
//   await deleteFileFromB2_Public(deleteFileName,deleteFileId)
//   res.json({ signedUrl });
// });

route.post("/saveProfileImage", protect, async (req, res) => {
  try {
    const { userId, fileId, fileName, deleteFileId, deleteFileName } = req.body;

    if (!userId || !fileId || !fileName) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    console.log(deleteFileId, deleteFileName)
    const signedUrl = await getPublicUrlFromB2(fileName);
    const cdnUrl = signedUrl.replace(
      "https://f005.backblazeb2.com",
      "https://cdn.challenmemey.com"
    );

    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          profileImage: {
            fileId,
            fileName,
            publicUrl: cdnUrl,
          },
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (deleteFileId && deleteFileName) {
      deleteFileFromB2_Public(deleteFileName, deleteFileId)
        .catch(err => console.error("Delete error:", err));
    }

    await talentModel.updateMany(
      {},
      {
        $set: {
          "contestants.$[c].profile_img": cdnUrl,
          "queue.$[q].profile_img": cdnUrl,
          "eliminations.$[e].profile_img": cdnUrl,
        },
      },
      {
        arrayFilters: [
          { "c.user_id": userId },
          { "q.user_id": userId },
          { "e.user_id": userId },
        ],
      }
    );
    let findFriend = await friendModel.findOne({ user_id: userId });
    findFriend.profile_img = cdnUrl ; 
    await findFriend .save()

    return res.json(updatedUser);

  } catch (err) {
    console.error("SAVE PROFILE IMAGE ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

route.post("/saveCoverImage",protect,  async (req, res) => {
  try {
    const { userId, fileId, fileName, deleteFileId, deleteFileName } = req.body;

    if (!userId || !fileId || !fileName) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const signedUrl = await getPublicUrlFromB2(fileName);

    const cdnUrl = signedUrl.replace(
      "https://f005.backblazeb2.com",
      "https://cdn.challenmemey.com"
    );
    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          coverImage: {
            fileId,
            fileName,
            publicUrl: cdnUrl,
          },
        },
      },
      { new: true }
    );

    let findFriend = await friendModel.findOne({ user_id: userId });
    findFriend.cover_img = cdnUrl ; 
    await findFriend.save()

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // 3️⃣ Delete old file (NON-BLOCKING)
    if (deleteFileId && deleteFileName) {
      deleteFileFromB2_Public(deleteFileName, deleteFileId)
        .catch(err => console.error("Delete error:", err));
    }

    return res.json( updatedUser );

  } catch (err) {
    console.error("SAVE PROFILE IMAGE ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
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
      .patch(validateMongoObjectId, protect, async(req,res)=>{ // update user infos by _id
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
    route.get('/user/:id',protect,validateMongoObjectId, async(req,res)=>{ 
      const userId = req.params.id
      const user = await userModel.findById(userId)
      if(!user) return res.json({error:"cant find the user"}).status(404)
      res.status(200).json(user)
    })

    // update user 
    route.patch('/user/:id',protect,validateMongoObjectId, async(req,res)=>{ 
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
               
    
    

// followings
route.get('/followings/:id',protect,validateMongoObjectId,async(req,res)=>{
  const user_id = req.params.id
  const followinglist = await followerModel.findOne({user_id:user_id})
  if(!followinglist) return res.json([])
  const followings = followinglist.followings;
  return res.json(followings)
})



//*********************** notifications */

route.get('/notifications/:id',protect,async(req,res)=>{
  const receiver_id = req.params.id;
  const notifications = await notificationModel.find({receiver_id:receiver_id}).sort({ createdAt: -1 });
  res.json(notifications).status(200)
})  

route.patch('/notifications/:id',protect,async(req,res)=>{
  const _id = req.params.id;
  const notification = await notificationModel.findById(_id)
  if(!notification) return res.json("notification expired")
  notification.isRead = true;
  await notification.save();
  res.json(notification).status(200)
})  

route.delete('/notifications/:id',protect,validateMongoObjectId,async(req,res)=>{
  const _id = req.params.id;
  const notifications = await notificationModel.findByIdAndDelete(_id)
  res.json("deleted").status(200)
})  


//********************************* search for users */

route.get('/find/search',protect,async(req,res)=>{
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
route.get('/isAuthenticated',protect ,async(req, res) =>{
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
    
// function protect  (req,res,next){
//   const token = req.headers.authorization?.split(' ')[1]; // Assuming token is sent in Authorization header
//   if (!token) return res.status(401).json({ message: 'No token provided' });
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//     if (err) return res.status(403).send({ message: 'Failed to authenticate token' });
//     req.user = decoded; // Store decoded user information in the request object
//     next();
// });   
// }


export default route; 