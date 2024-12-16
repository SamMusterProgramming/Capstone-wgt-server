const mongoose = require('mongoose')
require('dotenv').config();
const connectDB = async () => {
    try
    {
        const conn =await mongoose.connect(
           process.env.ATLAS_URL 
           );
        console.log(conn.connection.host)
    }
    catch(error)
    {
       console.log(error)
    }
}
module.exports = connectDB;