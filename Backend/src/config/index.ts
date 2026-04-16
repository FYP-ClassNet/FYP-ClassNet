import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000"),
  nodeEnv: process.env.NODE_ENV || "development",
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || "100"),
};