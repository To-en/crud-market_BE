import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

export default {
  log: {
    level: process.env.LOG_LEVEL || "info", 
  },
  port:              process.env.PORT || 3000,
  database: {
    url:             process.env.DATABASE_URL,
    logging:         process.env.DATABASE_LOGGING === "true",
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    publishable_key: process.env.SUPABASE_PUBLISHABLE_KEY,
    secret_key:      process.env.SUPABASE_SECRET_KEY, 
    jwks_url:        process.env.SUPABASE_JWKS_URL,
    bucket_name:     process.env.SUPABASE_BUCKET
  },
  jwtsecret: {
    access:          process.env.JWT_SECRET,
    accessExpire:    process.env.JWT_ACCESS_EXP,
    refresh:         process.env.JWT_REFRESH_SECRET,
    refreshExpire:   process.env.JWT_REFRESH_EXP,
  },
};
