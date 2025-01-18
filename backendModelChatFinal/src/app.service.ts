import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConversationSchema } from './schemas/conversation.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel('Conversation')
    private readonly conversationModel: Model<typeof ConversationSchema>,
  ) {}

  async createConversation(accountId: string, shopId: string): Promise<any> {
    const newConversation = new this.conversationModel({ accountId, shopId });
    return newConversation.save();
  }

  async getConversations(): Promise<any[]> {
    return this.conversationModel.find().exec();
  }
}
