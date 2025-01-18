import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConversationSchema } from '../schemas/conversation.schema';
import { MessageSchema } from '../schemas/message.schema';
import { SocketConnectionSchema } from '../schemas/socket-connection.schema'; // Thêm dòng này
import { ChatGateway } from './chat.gateway';
import { CloudinaryService } from 'src/uploadFile/CloudinaryService ';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Conversation', schema: ConversationSchema },
      { name: 'Message', schema: MessageSchema },
      { name: 'SocketConnection', schema: SocketConnectionSchema }, //
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, CloudinaryService],
  exports: [ChatService, CloudinaryService],
})
export class ChatModule {}
