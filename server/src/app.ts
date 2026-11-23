import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import helmet from "helmet";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const projectRoot = path.resolve(__dirname, "../..");
const distDirectory = path.join(projectRoot, "dist");

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  }

  if (req.method === "OPTIONS") {
    res.sendStatus(origin && allowedOrigins.includes(origin) ? 204 : 403);
    return;
  }

  next();
});
app.use(express.json({ limit: "128kb" }));
app.use(routes);

if (existsSync(path.join(distDirectory, "index.html"))) {
  app.use(express.static(distDirectory));
  app.get("*", (req, res, next) => {
    if (!req.accepts("html")) {
      next();
      return;
    }
    res.sendFile(path.join(distDirectory, "index.html"), (error) => {
      if (error) next(error);
    });
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
