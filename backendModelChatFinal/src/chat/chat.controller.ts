import { ChatGateway } from './chat.gateway';
import { CloudinaryService } from '../uploadFile/CloudinaryService ';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly ChatGateway: ChatGateway,

    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post('create-conversation')
  async createConversation(
    @Body() body: { accountId: string; shopId: string },
  ) {
    const existingConversation = await this.chatService.findConversation(
      body.accountId,
      body.shopId,
    );

    if (existingConversation) {
      this.ChatGateway.server.emit(
        'existingConversation',
        existingConversation,
      );
      return existingConversation;
    }

    const newConversation = await this.chatService.createConversation(
      body.accountId,
      body.shopId,
    );

    this.ChatGateway.server.emit('newConversation', newConversation);
    return newConversation;
  }

  @Get('conversations') // Lấy all ds hội thoại http://localhost:8000/chat/conversations
  async getConversations() {
    return this.chatService.getConversations();
  }

  @Post('messages') // tạo 1 tin nhắn
  async createMessage(
    @Body()
    body: {
      conversationId: string;
      senderId: string;
      messageText: string;
    },
  ) {
    return this.chatService.sendMessage(
      body.conversationId,
      body.senderId,
      body.messageText,
    );
  }

  @Get('messages/:conversationId') // Lấy ds tin nhắn
  async getMessages(@Param('conversationId') conversationId: string) {
    return this.chatService.getMessages(conversationId);
  }

  @Get('conversations/:userId')
  async getConversationsByUser(@Param('userId') userId: string) {
    return this.chatService.getConversationsByUser(userId);
  }

  @Get('conversations/:shopId')
  async getConversationsByShop(@Param('shopId') shopId: string) {
    return this.chatService.getConversationsByShop(shopId);
  }

  @Get('conversations2')
  async getConversations2(
    @Query('userId') userId: string,
    @Query('shopId') shopId: string,
  ) {
    return this.chatService.getConversations2({ userId, shopId });
  }

  @Post('send-file')
  @UseInterceptors(FilesInterceptor('files'))
  async sendFile(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: { roomId: string; senderId: string },
  ) {
    const { roomId, senderId } = body;

    if (!files || files.length === 0 || !roomId || !senderId) {
      throw new BadRequestException('Thiếu file hoặc thông tin phòng/sender');
    }

    const imageFiles = files.filter((file) =>
      file.mimetype.startsWith('image/'),
    );
    const videoFiles = files.filter((file) =>
      file.mimetype.startsWith('video/'),
    );

    const uploadedImages =
      imageFiles.length > 0
        ? await this.cloudinaryService.uploadFiles(imageFiles) // Sử dụng uploadFiles hỗ trợ cả ảnh và video
        : [];

    const uploadedVideos =
      videoFiles.length > 0
        ? await this.cloudinaryService.uploadFiles(videoFiles) // Sử dụng uploadFiles hỗ trợ cả ảnh và video
        : [];

    const uploadedFiles = [...uploadedImages, ...uploadedVideos];

    // Tạo và lưu tin nhắn mới vào database
    const savedMessage = await this.chatService.sendMessage(
      roomId, // conversationId
      senderId,
      '',
      uploadedFiles,
    );

    this.ChatGateway.emitFileToRoom(roomId, savedMessage);

    return savedMessage;
  }
}
