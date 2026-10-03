import { pool } from "./db.js";

const statements = [
  `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      name VARCHAR NOT NULL,
      email VARCHAR NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS chats (
      id UUID PRIMARY KEY,
      chat_type VARCHAR NOT NULL DEFAULT 'direct' CHECK (chat_type IN ('direct', 'group')),
      direct_key VARCHAR UNIQUE,
      title VARCHAR,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS chat_members (
      chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (chat_id, user_id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS direct_chats (
      chat_id UUID PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
      user_one_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_two_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_one_id, user_two_id),
      CHECK (user_one_id <> user_two_id)
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_chat_members_user_id
      ON chat_members(user_id)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_chat_members_chat_id
      ON chat_members(chat_id)
  `,
];

export const initializeDatabase = async (): Promise<void> => {
  for (const statement of statements) {
    await pool.query(statement);
  }
};
