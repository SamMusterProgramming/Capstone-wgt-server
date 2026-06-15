
import dotenv from 'dotenv';
import express from 'express';
import { addPerformanceToArena, createArena, getArenaByUser, getPostsArena } from '../controllers/arenaController.js';
import { protect } from '../middleware/jwtProtect.js';


dotenv.config();
const route = express.Router();
route.post("/create/:id",protect, createArena);
route.get('/user/:id' , protect ,getArenaByUser)
//add to arena post  performances , delete 
route.post("/addPost/:id",protect, addPerformanceToArena);
route.get('/posts/:id' , protect ,getPostsArena)

export default route; 