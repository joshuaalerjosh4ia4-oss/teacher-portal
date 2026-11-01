import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import helmet from "helmet";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const projectRoot = path.resolve(__dirname, "../..");
const distDirectory = path.join(projectRoot, "dist");

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "32kb" }));
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
