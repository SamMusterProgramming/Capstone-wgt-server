const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const connectDB = require('./db.js')
require('dotenv').config()
const userModel = require('./models/users.js')
const userRoute = require('./routes/userRoutes.js')
const challengeRoute = require('./routes/challengeRoutes.js')

const urlencodedParser = bodyParser.urlencoded({ extended: false })
const PORT = process.env.PORT || 8000
const app = express()   
connectDB() 

app.use(cors())
app.use(urlencodedParser)
app.use('/static', express.static('public'))
app.use(express.json())
app.use('/users',userRoute)
app.use('/challenges',challengeRoute)
app.use(validateRequestNetwork)


app.get('/',(req,res)=>{
     res.send('welcome to our app')
})    
    
function validateRequestNetwork(req,res,next) {
    try {  
        next()
    } catch (error) {
        console.log(error)
    }
}
    
    
app.listen(PORT,()=> {
    console.log("running on port" + PORT)
})