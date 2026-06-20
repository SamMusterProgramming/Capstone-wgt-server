
import dotenv from 'dotenv';
import express from 'express';
import { addPerformanceToArena, createArena, deletePostFromArena, getArenaByUser, getLocalArenas, getPostsArena, toggleArenaFollower, toggleArenaStar, toggleFire, toggleSpotlight } from '../controllers/arenaController.js';
import { protect } from '../middleware/jwtProtect.js';


dotenv.config();
const route = express.Router();
// arena , star 
route.post("/create/:id",protect, createArena);
route.get('/user/:id' , protect , getArenaByUser)
route.get('/local/:id' , protect , getLocalArenas)

route.patch('/star/:id' , protect , toggleArenaStar)
route.patch('/follower/:id' , protect , toggleArenaFollower)
//add to arena post  performances , delete 
route.post("/addPost/:id",protect, addPerformanceToArena);
route.get('/posts/:id' , protect , getPostsArena)
route.delete('/post/:id' , protect , deletePostFromArena)
route.patch('/post/spotlight/:id' , protect , toggleSpotlight)
route.patch('/post/fire/:id' , protect , toggleFire)


export default route; 