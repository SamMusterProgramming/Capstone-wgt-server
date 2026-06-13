
import dotenv from 'dotenv';
import express from 'express';
import { createArena, getArenaByUser } from '../controllers/arenaController.js';
import { protect } from '../middleware/jwtProtect.js';


dotenv.config();
const route = express.Router();
route.post("/create/:id",protect, createArena);
route.get('/user/:id' , protect ,getArenaByUser)



export default route; 