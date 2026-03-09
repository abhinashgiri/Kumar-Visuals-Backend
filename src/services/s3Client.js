import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import { Agent } from "node:https";

dotenv.config({ path: "./.env" });

/* ============================================================
   REQUIRED ENV VARIABLES
============================================================ */

const requiredEnvVars = [
  "S3_REGION",
  "S3_ENDPOINT",
  "BACKBLAZE_ACCESS_KEY_ID",
  "BACKBLAZE_SECRET_ACCESS_KEY",
  "S3_BUCKET_NAME",
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(", ")}`
  );
}


const endpoint = process.env.S3_ENDPOINT.replace(/\/+$/, "");



const httpsAgent = new Agent({
  keepAlive: true,
  maxSockets: 50,
});



const s3Client = new S3Client({
  region: process.env.S3_REGION,

  endpoint,

  credentials: {
    accessKeyId: process.env.BACKBLAZE_ACCESS_KEY_ID,
    secretAccessKey: process.env.BACKBLAZE_SECRET_ACCESS_KEY,
  },

  forcePathStyle: true,

  maxAttempts: 3,

  requestHandler: new NodeHttpHandler({
    httpsAgent,
    connectionTimeout: 5000,
    socketTimeout: 30000,
  }),
});


export default s3Client;