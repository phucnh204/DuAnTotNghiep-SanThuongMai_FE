import { Controller, Get, Post, Body } from '@nestjs/common';
import { ChatService } from './chat/chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('create-conversation')
  async createConversation(
    @Body() body: { accountId: string; shopId: string },
  ) {
    return this.chatService.createConversation(body.accountId, body.shopId);
  }

  @Get('conversations')
  async getConversations() {
    return this.chatService.getConversations();
  }
  @Get('hello')
  getHello(): string {
    return 'Hello World!';
  }
}
