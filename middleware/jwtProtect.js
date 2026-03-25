
import dotenv from 'dotenv';
import jwt from "jsonwebtoken";
dotenv.config();

// 🔐 VERIFY JWT MIDDLEWARE

  export const protect = (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
  
      if (!token) {
        return res.status(401).json({ message: "No token" });
      }
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      req.user = decoded;
      console.log(decoded)
      next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }
  };

 export  const generateToken = (user) => {
    return jwt.sign(
      {
        _id: user._id,
        uid: user.uid,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "7d" }
    );
  };