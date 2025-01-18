// src/chat/schemas/conversation.schema.ts
import { Schema, Document, Date } from 'mongoose';

export interface IConversation extends Document {
  shopId: string;
  accountId: string;
  lastMessage?: string;
  updatedAt?: Date;
  unreadCounts?: Record<string, number>;
  createdAt: Date;
}

export const ConversationSchema = new Schema<IConversation>({
  accountId: { type: String, required: true, index: true },
  shopId: { type: String, required: true, index: true },
  lastMessage: { type: String },
  updatedAt: { type: Date, default: Date.now, index: true },
  unreadCounts: { type: Map, of: Number, default: {} },
  createdAt: { type: Date, default: Date.now },
  // readBy: [{ type: String }],
});
