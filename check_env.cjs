const dotenv = require('dotenv');
dotenv.config();
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "NOT SET");
console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET || "NOT SET");
console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY || "NOT SET");
