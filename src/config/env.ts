import "dotenv/config";
import { z } from "zod";

const quotedString = z
  .string()
  .trim()
  .transform((value) => value.replace(/^["']|["']$/g, ""));

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (value) => {
        try {
          const url = new URL(value);
          return url.hostname !== "host";
        } catch {
          return false;
        }
      },
      {
        message:
          "DATABASE_URL must be a valid PostgreSQL URL and cannot use the placeholder hostname 'host'",
      }
    ),

  FIREBASE_PROJECT_ID: quotedString.pipe(z.string().min(1)),

  FIREBASE_CLIENT_EMAIL: quotedString.pipe(z.string().email()),

  FIREBASE_PRIVATE_KEY: quotedString.pipe(z.string().min(1)),
});

export const env = envSchema.parse(process.env);
