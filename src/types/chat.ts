export interface ChatRow {
  id: string;
  type: "direct" | "group";
  created_at: Date;
  updated_at: Date;
}

export interface ChatSummary {
  chatId: string;
  type: ChatRow["type"];
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  readBy: Record<string, string>;
}

export interface LastSeenEntry {
  userId: string;
  messageId: string;
  updatedAt: string;
}
