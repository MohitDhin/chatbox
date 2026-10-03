import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";

import { firestore } from "../config/firebase.js";
import type { ChatMessage, LastSeenEntry } from "../types/chat.js";
import { HttpError } from "../utils/http-error.js";
import {
  assertChatExists,
  assertChatMember,
  touchChat,
} from "../repositories/chat.repository.js";

const messagesCollection = (chatId: string) =>
  firestore.collection("chats").doc(chatId).collection("messages");

const readReceiptsCollection = (chatId: string) =>
  firestore.collection("chats").doc(chatId).collection("readReceipts");

const lastSeenCollection = (chatId: string) =>
  firestore.collection("chats").doc(chatId).collection("lastSeen");

const timestampToIso = (value: unknown): string => {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date().toISOString();
};

const mapMessage = (
  snapshot:
    | DocumentSnapshot<DocumentData>
    | QueryDocumentSnapshot<DocumentData>
): ChatMessage => {
  const data = snapshot.data();

  if (!data) {
    throw new HttpError(500, "Message snapshot has no data");
  }

  const readBy =
    data.readBy && typeof data.readBy === "object"
      ? Object.fromEntries(
          Object.entries(data.readBy as Record<string, unknown>).map(
            ([userId, readAt]) => [userId, timestampToIso(readAt)]
          )
        )
      : {};

  return {
    id: snapshot.id,
    chatId: String(data.chatId),
    senderId: String(data.senderId),
    text: String(data.text),
    createdAt: timestampToIso(data.createdAt),
    ...(data.updatedAt ? { updatedAt: timestampToIso(data.updatedAt) } : {}),
    ...(data.deletedAt ? { deletedAt: timestampToIso(data.deletedAt) } : {}),
    readBy,
  };
};

export const sendMessage = async (
  chatId: string,
  senderId: string,
  text: string
): Promise<ChatMessage> => {
  await assertChatMember(chatId, senderId);

  const ref = await messagesCollection(chatId).add({
    chatId,
    senderId,
    text,
    createdAt: FieldValue.serverTimestamp(),
    readBy: {},
  });

  await touchChat(chatId);

  const created = await ref.get();
  if (!created.exists) {
    throw new HttpError(500, "Message was not created");
  }

  return mapMessage(created);
};

export const getMessages = async (
  chatId: string,
  limit: number
): Promise<ChatMessage[]> => {
  await assertChatExists(chatId);

  const snapshot = await messagesCollection(chatId)
    .orderBy("createdAt", "asc")
    .limit(limit)
    .get();

  return snapshot.docs.map(mapMessage);
};

export const markMessageRead = async (
  chatId: string,
  messageId: string,
  userId: string
): Promise<void> => {
  await assertChatMember(chatId, userId);

  const messageRef = messagesCollection(chatId).doc(messageId);
  const message = await messageRef.get();

  if (!message.exists) {
    throw new HttpError(404, "Message not found");
  }

  await firestore.runTransaction(async (transaction) => {
    transaction.set(
      readReceiptsCollection(chatId).doc(messageId),
      {
        messageId,
        readBy: {
          [userId]: FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );

    transaction.update(messageRef, {
      [`readBy.${userId}`]: FieldValue.serverTimestamp(),
    });
  });
};

export const updateLastSeen = async (
  chatId: string,
  userId: string,
  messageId: string
): Promise<LastSeenEntry> => {
  await assertChatMember(chatId, userId);

  const message = await messagesCollection(chatId).doc(messageId).get();

  if (!message.exists) {
    throw new HttpError(404, "Message not found");
  }

  const ref = lastSeenCollection(chatId).doc(userId);
  await ref.set(
    {
      userId,
      messageId,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const updated = await ref.get();
  const data = updated.data();

  if (!data) {
    throw new HttpError(500, "Last seen entry was not updated");
  }

  return {
    userId,
    messageId: String(data.messageId),
    updatedAt: timestampToIso(data.updatedAt),
  };
};
