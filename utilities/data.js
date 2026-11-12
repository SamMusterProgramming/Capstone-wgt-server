
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


 const COUNTRY_REGIONS = {
  // AFRICA
  northAfrica: [
    "DZ","EG","LY","MA","SD","TN"
  ],

  westAfrica: [
    "BJ","BF","CV","CI","GM","GH","GN","GW",
    "LR","ML","MR","NE","NG","SN","SL","TG"
  ],

  centralAfrica: [
    "AO","CM","CF","TD","CG","CD","GQ","GA"
  ],

  eastAfrica: [
    "BI","DJ","ER","ET","KE","RW","SO",
    "SS","TZ","UG"
  ],

  southernAfrica: [
    "BW","LS","MG","MW","MU","MZ","NA",
    "SC","SZ","ZA","ZM","ZW","KM"
  ],

  // NORTH AMERICA
  northAmerica: [
    "CA",
    "US"
  ],

  centralAmerica: [
    "BZ","CR","SV","GT",
    "HN","MX","NI","PA"
  ],

  caribbean: [
    "AG","BS","BB","CU","DM","DO",
    "GD","HT","JM","KN","LC",
    "VC","TT"
  ],

  southAmerica: [
    "AR","BO","BR","CL","CO",
    "EC","GY","PY","PE",
    "SR","UY","VE"
  ],

  // EUROPE
  westernEurope: [
    "AT","BE","FR","DE","IE",
    "LI","LU","MC","NL",
    "CH","GB"
  ],

  northernEurope: [
    "DK","EE","FI","IS",
    "LV","LT","NO","SE"
  ],

  southernEurope: [
    "AL","AD","BA","HR","CY",
    "GR","IT","MT","ME",
    "MK","PT","SM","RS",
    "SI","ES","VA"
  ],

  easternEurope: [
    "BY","BG","CZ","HU",
    "MD","PL","RO","RU",
    "SK","UA"
  ],

  // MIDDLE EAST
  middleEast: [
    "BH","IR","IQ","IL","JO",
    "KW","LB","OM","QA",
    "SA","SY","AE","YE","TR"
  ],

  // SOUTH ASIA
  southAsia: [
    "AF","BD","BT","IN",
    "MV","NP","PK","LK"
  ],

  // EAST ASIA
  eastAsia: [
    "CN","JP","KP",
    "KR","MN","TW"
  ],

  // SOUTHEAST ASIA
  southeastAsia: [
    "BN","KH","ID","LA",
    "MY","MM","PH","SG",
    "TH","TL","VN"
  ],

  // CENTRAL ASIA
  centralAsia: [
    "AM","AZ","GE","KZ",
    "KG","TJ","TM","UZ"
  ],

  // OCEANIA
  australiaNewZealand: [
    "AU","NZ"
  ],

  pacificIslands: [
    "FJ","KI","MH","FM",
    "NR","PW","PG","WS",
    "SB","TO","TV","VU"
  ]
};

 const SPOTLIGHT_REGIONS = [
  "northAfrica",
  "westAfrica",
  "centralAfrica",
  "eastAfrica",
  "southernAfrica",
  "northAmerica",
  "centralAmerica",
  "caribbean",
  "southAmerica",
  "westernEurope",
  "northernEurope",
  "southernEurope",
  "easternEurope",
  "middleEast",
  "southAsia",
  "eastAsia",
  "southeastAsia",
  "centralAsia",
  "australiaNewZealand",
  "pacificIslands",
];

export const SPOTLIGHT_COUNTRIES = [

  // Africa
  "DZ","EG","LY","MA","SD","TN",
  "BJ","BF","CV","CI","GM","GH",
  "GN","GW","LR","ML","MR","NE",
  "NG","SN","SL","TG",
  "AO","CM","CF","TD","CG","CD",
  "GQ","GA",
  "BI","DJ","ER","ET","KE","RW",
  "SO","SS","TZ","UG",
  "BW","LS","MG","MW","MU","MZ",
  "NA","SC","SZ","ZA","ZM","ZW","KM",


  // North America
  "US","CA",


  // Central America
  "BZ","CR","SV","GT",
  "HN","MX","NI","PA",


  // Caribbean
  "AG","BS","BB","CU","DM",
  "DO","GD","HT","JM",
  "KN","LC","VC","TT",


  // South America
  "AR","BO","BR","CL",
  "CO","EC","GY","PY",
  "PE","SR","UY","VE",


  // Europe
  "AT","BE","FR","DE",
  "IE","LI","LU","MC",
  "NL","CH","GB",

  "DK","EE","FI","IS",
  "LV","LT","NO","SE",

  "AL","AD","BA","HR",
  "CY","GR","IT","MT",
  "ME","MK","PT","SM",
  "RS","SI","ES","VA",

  "BY","BG","CZ","HU",
  "MD","PL","RO","RU",
  "SK","UA",


  // Middle East
  "BH","IR","IQ","IL",
  "JO","KW","LB","OM",
  "QA","SA","SY","AE",
  "YE","TR",


  // Asia
  "AF","BD","BT","IN",
  "MV","NP","PK","LK",

  "CN","JP","KP",
  "KR","MN","TW",

  "BN","KH","ID","LA",
  "MY","MM","PH","SG",
  "TH","TL","VN",

  "AM","AZ","GE","KZ",
  "KG","TJ","TM","UZ",


  // Oceania
  "AU","NZ",
  "FJ","KI","MH","FM",
  "NR","PW","PG","WS",
  "SB","TO","TV","VU"

];


export const talentStages = [

  // MUSIC
  { id: "0", name: "Singing" },
  { id: "1", name: "Rapping" },
  { id: "2", name: "Beatboxing" },
  { id: "3", name: "Guitar" },
  { id: "4", name: "Piano" },
  { id: "5", name: "Violin" },
  { id: "6", name: "Drumming" },
  { id: "7", name: "DJing" },
  { id: "8", name: "Beatmaking" },

  // DANCE & PHYSICAL PERFORMANCE
  { id: "9", name: "Dancing" },
  { id: "10", name: "Fitness" },
  { id: "11", name: "Acrobatics" },
  { id: "12", name: "Karate" },
  { id: "13", name: "Parkour" },
  { id: "14", name: "Skating" },
  { id: "15", name: "Yoga" },

  // MAGIC & ENTERTAINMENT
  { id: "16", name: "Magic" },
  { id: "17", name: "Mentalism" },
  { id: "18", name: "Comedy" },
  { id: "19", name: "Acting" },
  { id: "20", name: "Ventriloquism" },
  { id: "21", name: "Juggling" },
  { id: "22", name: "Puppetry" },
  { id: "23", name: "Fire Performance" },
  { id: "24", name: "Stunts" },
  { id: "25", name: "Storytelling" },

  // CREATIVE & VISUAL ARTS
  { id: "26", name: "Art" },
  { id: "27", name: "Photography" },
  { id: "28", name: "Filmmaking" },
  { id: "29", name: "Animation" },
  { id: "30", name: "Design" },
  { id: "31", name: "Fashion" },
  { id: "32", name: "Makeup" },

  // TECHNOLOGY
  { id: "33", name: "Tech" },

  // OTHER TALENTS
  { id: "34", name: "Modeling" },
  { id: "35", name: "Eating" },
  { id: "36", name: "Cooking" },
  { id: "37", name: "Speedcubing" },
  { id: "38", name: "Whistling" },

];

export { users, challenges , COUNTRY_REGIONS ,SPOTLIGHT_REGIONS};