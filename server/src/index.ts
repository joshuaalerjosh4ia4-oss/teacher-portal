import { createServer } from "node:http";
import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";

const server = createServer(app);

server.on("error", (error: NodeJS.ErrnoException) => {
  console.error("Teacher portal API server error:", error);
  process.exitCode = 1;
});

server.listen(env.port, "0.0.0.0", () => {
  console.log(`Teacher portal API listening on port ${env.port}`);
});

function shutdown(signal: string): void {
  console.log(`${signal} received; closing teacher portal API`);
  server.close((error) => {
    if (error) {
      console.error("Failed to close HTTP server cleanly:", error);
      process.exitCode = 1;
    }
    void prisma.$disconnect().catch((disconnectError: unknown) => {
      console.error("Failed to disconnect from PostgreSQL:", disconnectError);
      process.exitCode = 1;
    });
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
