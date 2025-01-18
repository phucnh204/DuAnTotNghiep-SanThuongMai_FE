import { CloudinaryService } from '../uploadFile/CloudinaryService ';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatGateway } from './chat.gateway';
import { IMessage } from 'src/schemas/message.schema';
import { IConversation } from './../schemas/conversation.schema';
import { SocketConnectionSchema } from 'src/schemas/socket-connection.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel('Conversation')
    private readonly conversationModel: Model<IConversation>,
    @InjectModel('Message')
    private readonly messageModel: Model<IMessage>,

    @InjectModel('SocketConnection')
    private readonly socketConnectionModel: Model<
      typeof SocketConnectionSchema
    >,

    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,

    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async createConversation(accountId: string, shopId: string): Promise<any> {
    const newConversation = new this.conversationModel({ accountId, shopId });
    return newConversation.save();
  }

  async getConversations(): Promise<any[]> {
    return this.conversationModel.find().exec();
  }

  async getMessages(conversationId: string) {
    return this.messageModel
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .exec();
  }

  async sendMessage(
    roomId: string,
    senderId: string,
    messageText: string,
    files?: Array<{ url: string; public_id: string }>,
  ) {
    const newMessage = new this.messageModel({
      roomId,
      senderId,
      messageText,
      files: files || [],
      timestamp: new Date(),
      readBy: [],
    });

        const savedMessage = await newMessage.save();
    return savedMessage;
  }

  async getMessagesByRoom(roomId: string) {
    return this.messageModel.find({ roomId }).sort({ timestamp: 1 }).exec(); // Sắp xếp theo thời gian
  }

  async getLastMessageByRoom(roomId: string): Promise<IMessage | null> {
    return this.messageModel
      .findOne({ roomId })
      .sort({ timestamp: -1 }) // Sắp xếp giảm dần theo thời gian
      .exec();
  }

  async addSocketConnection(socketId: string, userId: string): Promise<any> {
    const newConnection = new this.socketConnectionModel({ socketId, userId });
    return await newConnection.save();
  }

  async removeSocketConnection(socketId: string): Promise<any> {
    return await this.socketConnectionModel.findOneAndUpdate(
      { socketId },
      { disconnectedAt: new Date() },
      { new: true },
    );
  }

       async getAllSocketConnections(): Promise<any[]> {
    return await this.socketConnectionModel.find().exec();
  }

  // Lấy tất cả cuộc trò chuyện của người dùng (bao gồm cả tài khoản và shop)
  async getConversationsByShop(shopId: string) {
    return this.conversationModel.find({ shopId: shopId });
  }

  async getConversationsByUser(userId: string) {
    return this.conversationModel
      .find({ accountId: userId })
      .sort({ updatedAt: -1 });
  }

  async getConversations2(filter: { userId?: string; shopId?: string }) {
    const query: any = {};

    if (filter.userId) {
      query.accountId = filter.userId;
    }

    if (filter.shopId) {
      query.shopId = filter.shopId;
    }

    return this.conversationModel.find(query).sort({ createdAt: -1 });
  }

  //tìm  trò chuyện đã tồn tại hay chưa
  async findConversation(
    accountId: string,
    shopId: string,
  ): Promise<IConversation | null> {
    return await this.conversationModel.findOne({ accountId, shopId }).exec();
  }

  async markMessageAsRead(
    messageId: string,
    userId: string,
  ): Promise<IMessage> {
    const message = await this.messageModel.findById(messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    if (!message.readBy.includes(userId)) {
      message.readBy.push(userId);
      await message.save();
    }

    this.messageModel.emit('messageRead', { messageId, userId });

    return message;
  }

  async getUnreadMessages(userId: string): Promise<IMessage[]> {
    const messages = await this.messageModel.find({
      readBy: { $ne: userId },
    });

    return messages;
  }
}
