import admin from 'firebase-admin';
// import serviceAccount from "../config/serviceAccountKey.json" assert { type: "json" };
console.log("PRIVATE KEY START:", process.env.FIREBASE_PRIVATE_KEY?.slice(0, 30));
admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY
    }),
  });
   
export default admin;  