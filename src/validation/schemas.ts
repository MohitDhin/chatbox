import { z } from "zod";

export const idSchema = z.string().trim().uuid();
export const messageIdSchema = z.string().trim().min(1).max(200);

export const createChatSchema = z.object({
  userAId: idSchema,
  userBId: idSchema,
});

export const sendMessageSchema = z.object({
  senderId: idSchema,
  text: z.string().trim().min(1).max(5000),
});

export const userIdSchema = z.object({
  userId: idSchema,
});

export const lastSeenSchema = z.object({
  userId: idSchema,
  messageId: messageIdSchema,
});

export const chatParamsSchema = z.object({
  chatId: idSchema,
});

export const messageParamsSchema = z.object({
  chatId: idSchema,
  messageId: messageIdSchema,
});

export const messagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
