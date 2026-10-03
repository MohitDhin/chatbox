import { randomUUID } from "node:crypto";

import { pool } from "../config/db.js";
import { HttpError } from "../utils/http-error.js";
import type { ChatRow, ChatSummary } from "../types/chat.js";

interface ChatWithMembersRow extends ChatRow {
  member_ids: string[];
}

const toIsoString = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const mapChatSummary = (row: ChatWithMembersRow): ChatSummary => ({
  chatId: row.id,
  type: row.type,
  memberIds: row.member_ids,
  createdAt: toIsoString(row.created_at),
  updatedAt: toIsoString(row.updated_at),
});

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "23505";

const findDirectChatId = async (
  userOneId: string,
  userTwoId: string
): Promise<string | undefined> => {
  const result = await pool.query<{ chat_id: string }>(
    `
      SELECT chat_id
      FROM direct_chats
      WHERE user_one_id = $1 AND user_two_id = $2
    `,
    [userOneId, userTwoId]
  );

  return result.rows[0]?.chat_id;
};

export const createOrGetDirectChat = async (
  userAId: string,
  userBId: string
): Promise<string> => {
  if (userAId === userBId) {
    throw new HttpError(400, "userAId and userBId must be different");
  }

  const [userOneId, userTwoId] =
    userAId < userBId ? [userAId, userBId] : [userBId, userAId];
  const directKey = `${userOneId}:${userTwoId}`;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        INSERT INTO users (id, name, email)
        VALUES ($1, $3, $5), ($2, $4, $6)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        userAId,
        userBId,
        `User ${userAId}`,
        `User ${userBId}`,
        `${userAId}@chatbox.local`,
        `${userBId}@chatbox.local`,
      ]
    );

    const existing = await client.query<{ chat_id: string }>(
      `
        SELECT chat_id
        FROM direct_chats
        WHERE user_one_id = $1 AND user_two_id = $2
      `,
      [userOneId, userTwoId]
    );

    const existingChat = existing.rows[0];
    if (existingChat) {
      await client.query("COMMIT");
      return existingChat.chat_id;
    }

    const chatId = randomUUID();

    await client.query(
      `
        INSERT INTO chats (id, chat_type, direct_key)
        VALUES ($1, 'direct', $2)
      `,
      [chatId, directKey]
    );

    await client.query(
      `
        INSERT INTO chat_members (chat_id, user_id)
        VALUES ($1, $2), ($1, $3)
      `,
      [chatId, userAId, userBId]
    );

    await client.query(
      `
        INSERT INTO direct_chats (chat_id, user_one_id, user_two_id)
        VALUES ($1, $2, $3)
      `,
      [chatId, userOneId, userTwoId]
    );

    await client.query("COMMIT");
    return chatId;
  } catch (error) {
    await client.query("ROLLBACK");

    if (isUniqueViolation(error)) {
      const chatId = await findDirectChatId(userOneId, userTwoId);
      if (chatId) {
        return chatId;
      }
    }

    throw error;
  } finally {
    client.release();
  }
};

export const assertChatExists = async (chatId: string): Promise<void> => {
  const result = await pool.query<{ id: string }>(
    "SELECT id FROM chats WHERE id = $1",
    [chatId]
  );

  if (!result.rows[0]) {
    throw new HttpError(404, "Chat not found");
  }
};

export const assertChatMember = async (
  chatId: string,
  userId: string
): Promise<void> => {
  const result = await pool.query<{ user_id: string }>(
    `
      SELECT user_id
      FROM chat_members
      WHERE chat_id = $1 AND user_id = $2
    `,
    [chatId, userId]
  );

  if (!result.rows[0]) {
    throw new HttpError(403, "User is not a member of this chat");
  }
};

export const touchChat = async (chatId: string): Promise<void> => {
  await pool.query("UPDATE chats SET updated_at = NOW() WHERE id = $1", [
    chatId,
  ]);
};

export const listUserChats = async (userId: string): Promise<ChatSummary[]> => {
  const result = await pool.query<ChatWithMembersRow>(
    `
      SELECT
        c.id,
        c.chat_type AS type,
        c.created_at,
        c.updated_at,
        ARRAY_AGG(cm_all.user_id ORDER BY cm_all.user_id) AS member_ids
      FROM chats c
      JOIN chat_members cm_self
        ON cm_self.chat_id = c.id AND cm_self.user_id = $1
      JOIN chat_members cm_all
        ON cm_all.chat_id = c.id
      GROUP BY c.id, c.chat_type, c.created_at, c.updated_at
      ORDER BY c.updated_at DESC
    `,
    [userId]
  );

  return result.rows.map(mapChatSummary);
};
