
import dotenv from 'dotenv';
import express from 'express';
import { addPerformanceToArena, addPostView, createArena, deleteArena, deletePostFromArena, getArenaByProfile, getArenaByUser, getLocalArenas, getPostsArena, isUserFiredPost, isUserFollowingArena, isUserStarredArena, toggleArenaFollower, toggleArenaStar,  toggleFirePost,  updateArena } from '../controllers/arenaController.js';
import { protect } from '../middleware/jwtProtect.js';


dotenv.config();
const route = express.Router();
// arena , star 
route.post("/create/:id", protect , createArena);
route.post("/update/:id", protect , updateArena);
route.post("/delete/:id", protect , deleteArena);

route.get('/user/:id' , protect , getArenaByUser)
route.post('/profile/:id' , protect , getArenaByProfile)
route.get('/local/:id' , protect , getLocalArenas)
//following, starring
route.patch('/arena/star' , protect , toggleArenaStar)
route.get('/arena/isStarred' , protect , isUserStarredArena)
route.patch('/arena/follower' , protect , toggleArenaFollower)
route.get('/arena/isFollowing' , protect , isUserFollowingArena)

//add to arena post  performances , delete 
route.post("/post/addPost/:id",protect, addPerformanceToArena);
route.get('/posts/:id' , protect , getPostsArena)
route.delete('/post/:id' , protect , deletePostFromArena)
// route.patch('/post/spotlight/:id' , protect , toggleSpotlight)
route.patch('/post/fire/' , protect , toggleFirePost)
route.patch('/post/isFired/' , protect , isUserFiredPost)

route.patch('/post/view/:id' , protect , addPostView)


export default route; 