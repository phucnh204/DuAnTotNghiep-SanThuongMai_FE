// src/chat/schemas/socket-connection.schema.ts
import { Schema } from 'mongoose';

export const SocketConnectionSchema = new Schema({
  socketId: { type: String, required: true, unique: true, index: true },
  accountId: { type: String, index: true },
  shopId: { type: String, index: true },
  connectedAt: { type: Date, default: Date.now },
  disconnectedAt: { type: Date },
});
