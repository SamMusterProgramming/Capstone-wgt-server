# Challengify Backend API

Challengify is a web platform that allows users to create, join, and manage challenges. This repository contains the backend API for Challengify, built using Node.js, Express.js, and MongoDB. It handles user registration, authentication, challenge management, and stores data in a MongoDB database.

# Tech Stack
Node.js: JavaScript runtime to build the server.
Express.js: Web framework to handle HTTP requests and routes.
MongoDB: NoSQL database to store user and challenge data.
Mongoose: ODM (Object Document Mapping) for MongoDB.
Multer for file storage

# Features
User Authentication: Register and login users with JWT tokens.
Challenge Management: Create, view, and manage challenges. Users can also participate in challenges.
Secure Routes: Protect certain routes to ensure that only authenticated users can access them.
Database: Store data securely in a MongoDB database using 


# To get started, you'll need:

Node.js: Download and install Node.js.
MongoDB: A MongoDB database (local or cloud using MongoDB Atlas).
Steps
Clone the repository: from my github account 
Install dependencies: Ensure you have the necessary dependencies installed by running:
npm install
Set up environment variables:
      Create a .env file in the root directory and include the following 
      variables: ATLAS_URL to add ytour database string 
      PORT number to run the server on it  


JWT_SECRET: A secret key for signing JWT tokens (e.g., my_secret_key).
PORT: The port number the API server will listen to (default is 5000).
Run the application: Start the API server with the following command:

npm start
The API server should now be running at http://localhost:YOUR_PORT.

