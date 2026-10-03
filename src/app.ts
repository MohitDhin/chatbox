import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from "express";
import { ZodError } from "zod";

import { chatRouter } from "./routes/chat.routes.js";
import { isHttpError } from "./utils/http-error.js";

const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Route not found" });
};

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: error.issues,
    });
    return;
  }

  if (isHttpError(error)) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error(error);
  res.status(500).json({ error: "Internal server error" });
};

export const createApp = () => {
  const app = express();

  app.use(express.json());
  app.use(chatRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
