import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import connectDB from './db.js';
import userModel from './models/users.js';
import userRoute from './routes/userRoutes.js';
import challengeRoute from './routes/challengeRoutes.js';
import talentRoute from './routes/talentRoutes.js';
import B2 from 'backblaze-b2';

dotenv.config();


connectDB() 
const app = express();
app.use(express.urlencoded({ extended: true, limit: "200mb" }));

app.use(express.json({ limit: "200mb" }));

const urlencodedParser = bodyParser.urlencoded({ extended: false });

app.use(cors())
// app.use(urlencodedParser)
app.use('/static', express.static('public'))
app.use(express.json())
app.use('/users',userRoute)
app.use('/challenges',challengeRoute)
app.use('/talents',talentRoute)
app.use(validateRequestNetwork)


app.get('/',(req,res)=>{
     res.send('welcome to our app')
})    
    
// // Backblaze client
// const b2 = new B2({
//     applicationKeyId: process.env.B2_KEY_ID,
//     applicationKey: process.env.B2_APP_KEY,
//   });
  
// await b2.authorize();



function validateRequestNetwork(req,res,next) {
    try {  
        next()
    } catch (error) {
        console.log(error)
    }
}
    
    
app.listen(process.env.PORT,()=> {
    console.log("running on port" + process.env.PORT)
})

