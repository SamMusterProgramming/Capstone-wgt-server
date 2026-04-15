import axios from "axios";

export const getLocationFromIP = async (ip) => {
  try {
    const response = await axios.get(`https://ipapi.co/${ip}/json/`);
    return {
      countryCode: response.data.country_code,
      country: response.data.country_name,
    };
  } catch (error) {
    console.error("IP lookup failed:", error.message);
    return null;
  }
};

export const getClientIp = (req) => {
    return (
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip
    );
  };
