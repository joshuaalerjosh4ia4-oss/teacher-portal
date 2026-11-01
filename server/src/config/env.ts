import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  port: Number(process.env.PORT ?? 5001),
};

if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}
