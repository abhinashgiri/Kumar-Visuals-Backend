import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 4000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI environment variable is required");
  process.exit(1);
}


// Handle unexpected errors
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  process.exit(1);
});

let server;

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Database connected");

    server = app.listen(PORT, () => {
      console.log(`Server is listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Fatal error starting server:", err);
    process.exit(1);
  }
}

await startServer();

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");

  if (server) {
    server.close(() => {
      console.log("HTTP server closed");

      mongoose.connection.close(false, () => {
        console.log("MongoDB connection closed");
        process.exit(0);
      });
    });
  } else {
    process.exit(0);
  }
});
