import { Schema, Document } from 'mongoose';
import * as mongoose from 'mongoose';

export interface IMessage extends Document {
  roomId: string;
  senderId: string;
  messageText: string;
  files?: Array<{ url: string; public_id: string }>;
  timestamp: Date;
  readBy: string[];
}

export const MessageSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  senderId: { type: String, required: true },
  messageText: { type: String, required: false },
  files: [
    {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
  ],
  timestamp: { type: Date, default: Date.now },
  readBy: { type: [String], default: [] },
});
