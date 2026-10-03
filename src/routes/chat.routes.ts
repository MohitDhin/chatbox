import { Router } from "express";

import {
  createOrGetDirectChat,
  listUserChats,
} from "../repositories/chat.repository.js";
import {
  getMessages,
  markMessageRead,
  sendMessage,
  updateLastSeen,
} from "../services/message.service.js";
import {
  chatParamsSchema,
  createChatSchema,
  lastSeenSchema,
  messageParamsSchema,
  messagesQuerySchema,
  sendMessageSchema,
  userIdSchema,
} from "../validation/schemas.js";

export const chatRouter = Router();

chatRouter.post("/chat/create", async (req, res, next) => {
  try {
    const input = createChatSchema.parse(req.body);
    const chatId = await createOrGetDirectChat(input.userAId, input.userBId);

    res.status(200).json({ chatId });
  } catch (error) {
    next(error);
  }
});

chatRouter.post("/chat/:chatId/message/send", async (req, res, next) => {
  try {
    const { chatId } = chatParamsSchema.parse(req.params);
    const input = sendMessageSchema.parse(req.body);
    const message = await sendMessage(chatId, input.senderId, input.text);

    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
});

chatRouter.get("/chat/:chatId/messages", async (req, res, next) => {
  try {
    const { chatId } = chatParamsSchema.parse(req.params);
    const { limit } = messagesQuerySchema.parse(req.query);
    const messages = await getMessages(chatId, limit);

    res.status(200).json({ messages });
  } catch (error) {
    next(error);
  }
});

chatRouter.post("/chat/:chatId/message/:messageId/read", async (req, res, next) => {
  try {
    const { chatId, messageId } = messageParamsSchema.parse(req.params);
    const { userId } = userIdSchema.parse(req.body);

    await markMessageRead(chatId, messageId, userId);

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

chatRouter.post("/chat/:chatId/lastseen", async (req, res, next) => {
  try {
    const { chatId } = chatParamsSchema.parse(req.params);
    const input = lastSeenSchema.parse(req.body);
    const lastSeen = await updateLastSeen(
      chatId,
      input.userId,
      input.messageId
    );

    res.status(200).json({ lastSeen });
  } catch (error) {
    next(error);
  }
});

chatRouter.get("/user/:userId/chats", async (req, res, next) => {
  try {
    const { userId } = userIdSchema.parse(req.params);
    const chats = await listUserChats(userId);

    res.status(200).json({ chats });
  } catch (error) {
    next(error);
  }
});

chatRouter.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});
