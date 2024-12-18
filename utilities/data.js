
const users =[
    {
        
            name: "will junior  Smith",
            profile_img: "../../assets/1.png",
            email: "johnSmith2020@gmail.com",
            password: "johnsmith",
            username: "smithJ2024",
            city:"Charlotte",
            state: "North Carolina",
            profession: "Developper"
    },   
    {
          
            name: "Samir Haddadi",
            profile_img: "../../assets/2.png",
            email: "samcoeur2020@gmail.com",
            password: "samir",
            username: "samcoeur",
            city:"Charlotte",
            state: "North Carolina",
            profession: "Driver" ,
            
    },  
    {
         
            name: "Djamel Haddadi",
            profile_img: "../../assets/3.png",
            email: "Djamel-haddadi1990@gmail.com",
            password: "djamel",
            username: "djimka",
            city:"Algiers",
            state: "Algiers",
            profession: "Delivery driver"  
    },  
    {
         
            name: "Karim Manho",
            profile_img: "../../assets/3.png",
            email: "manhoKarm@gmail.com",
            password: "karim",
            username: "kimka2024",
            city:"Algiers",
            state: "Algiers",
            profession: "Delivery driver"  
    }


]

const challenges = [{
    origin_id:2,
    participants:[ {
      user_id: 2 ,
      video_url: "/static/videos/1.mp4",
      description : "I am the man ",
      likes:15465,
      votes:45612
    },
    {
      user_id: 3 ,
      video_url: "/static/videos/2.mp4",
      description : "I can do it better ",
      likes:1546,
      votes:6537
    }],
    category: "eating context",
    desc: "this is a new challenge",
    like_count:1354635
},
{
  origin_id:3,
  participants:[ {
    user_id: 2 ,
    video_url: "/static/videos/1.mp4",
    description : "I am the man ",
    likes:15465,
    votes:45612
  },
  {
    user_id: 3 ,
    video_url: "/static/videos/2.mp4",
    description : "I can do it better ",
    likes:1546,
    votes:6537
  }],
  category: "eating context",
  desc: "this is a new challenge",
  like_count:1354635
}]


module.exports = { users ,challenges};