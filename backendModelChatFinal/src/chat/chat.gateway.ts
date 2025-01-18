import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { CloudinaryService } from 'src/uploadFile/CloudinaryService ';
import { IMessage } from 'src/schemas/message.schema';

@WebSocketGateway({ namespace: '/chat', cors: true })
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  private logger: Logger = new Logger('ChatGateway');
  private activeUsers: Map<string, string> = new Map();
  private activeShops: Map<string, string> = new Map();
  private userConversations: Map<string, Set<string>> = new Map();
  private messageHistory: { [roomId: string]: any[] } = {};

  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket đã được khởi tạo thành công');
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    const shopId = client.handshake.query.shopId as string;

    // Kiểm tra nếu có userId hoặc shopId và đảm bảo kết nối vẫn giữ lại
    if (userId) {
      // Khi client kết nối lại, bạn có thể lấy lại cuộc trò chuyện của user từ database
      this.logger.log(`User ${userId} connected (Socket ID: ${client.id})`);
    }

    if (shopId) {
      // Tương tự, khi shop kết nối lại, bạn cũng cần phục hồi dữ liệu từ database
      this.logger.log(`Shop ${shopId} connected (Socket ID: ${client.id})`);
    }
  }

  handleDisconnect(client: Socket) {
    // Kiểm tra userId và xóa khi ngắt kết nối
    const userId = this.activeUsers.get(client.id);

    if (userId) {
      this.activeUsers.delete(client.id); // Xóa theo client.id thay vì userId
      this.logger.log(
        `Người dùng ${userId} đã ngắt kết nối (Socket ID: ${client.id})`,
      );
    } else {
      this.logger.warn(
        `Client không xác định đã ngắt kết nối (Socket ID: ${client.id})`,
      );
    }

    // Kiểm tra shopId và xóa khi ngắt kết nối nếu cần
    const shopId = this.activeShops.get(client.id);

    if (shopId) {
      this.activeShops.delete(client.id); // Xóa theo client.id thay vì shopId
      this.logger.log(
        `Cửa hàng ${shopId} đã ngắt kết nối (Socket ID: ${client.id})`,
      );
    } else {
      this.logger.warn(
        `Client không xác định đã ngắt kết nối (Socket ID: ${client.id})`,
      );
    }
  }

  @SubscribeMessage('joinRoom') // cho user
  async handleJoinRoom(
    client: Socket,
    payload: { roomId: string; userId: string },
  ) {
    const { roomId, userId } = payload;

    if (!roomId || !userId) {
      client.emit('error', {
        message: 'Cần cung cấp roomId và userId để tham gia phòng',
      });
      this.logger.warn(`Tham gia phòng thất bại: thiếu roomId hoặc userId`);
      return;
    }

    client.join(roomId);

    // Thêm phòng vào danh sách phòng của người dùng
    if (!this.userConversations.has(userId)) {
      this.userConversations.set(userId, new Set());
    }
    this.userConversations.get(userId)?.add(roomId);

    this.logger.log(`Người dùng ${userId} đã tham gia phòng ${roomId}`);

    // Lấy tất cả tin nhắn trong phòng từ cơ sở dữ liệu
    const messages = await this.chatService.getMessagesByRoom(roomId);

    // Gửi lại tất cả các tin nhắn đã có trong phòng cho người tham gia
    client.emit('messageHistory', messages);

    this.server.to(roomId).emit('userJoined', { roomId, userId });
  }

  @SubscribeMessage('joinRoom2') //cho shop
  async handleJoinRoom2(
    client: Socket,
    payload: { roomId: string; shopId: string; currentRoomId: string },
  ) {
    const { roomId, shopId, currentRoomId } = payload;

    if (!roomId || !shopId) {
      client.emit('error', {
        message: 'Cần cung cấp roomId và userId để tham gia phòng',
      });
      this.logger.warn(`Tham gia phòng thất bại: thiếu roomId hoặc userId`);
      return;
    }
    client.leave(currentRoomId);
    //client.
    client.join(roomId);

    // Thêm phòng vào danh sách phòng của người dùng
    if (!this.userConversations.has(shopId)) {
      this.userConversations.set(shopId, new Set());
    }
    this.userConversations.get(shopId)?.add(roomId);

    this.logger.log(`Người dùng ${shopId} đã tham gia phòng ${roomId}`);

    // Lấy tất cả tin nhắn trong phòng từ cơ sở dữ liệu
    const messages = await this.chatService.getMessagesByRoom(roomId);

    // Gửi lại tất cả các tin nhắn đã có trong phòng cho người tham gia
    client.emit('messageHistory', messages);

    this.server.to(roomId).emit('userJoined', { roomId, shopId });
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    client: Socket,
    payload: { roomId: string; senderId: string; message: string },
  ) {
    const { roomId, senderId, message } = payload;

    if (!roomId || !senderId || !message) {
      client.emit('error', {
        message: 'Thiếu thông tin roomId, senderId hoặc message',
      });
      this.logger.warn(`Gửi tin nhắn thất bại: thiếu thông tin cần thiết`);
      return;
    }

    try {
      // Gọi phương thức lưu tin nhắn vào DB
      const savedMessage = await this.chatService.sendMessage(
        roomId, // Chắc chắn rằng roomId được truyền đúng
        senderId,
        message,
      );

      // Lưu tin nhắn vào lịch sử phòng chat
      if (!this.messageHistory[roomId]) {
        this.messageHistory[roomId] = [];
      }
      this.messageHistory[roomId].push(savedMessage);

      // Phát tin nhắn tới tất cả các thành viên trong phòng
      this.server.to(roomId).emit('message', {
        conversationId: roomId,
        senderId,
        messageText: savedMessage.messageText,
        timestamp: savedMessage.timestamp,
      });

      this.logger.log(
        `Người dùng ${senderId} đã gửi tin nhắn tới phòng ${roomId}: ${message}`,
      );

      // Xác nhận với client đã gửi tin thành công
      client.emit('messageSent', {
        success: true,
        messageId: savedMessage._id,
      });

      return savedMessage;
    } catch (error) {
      this.logger.error(
        `Lỗi khi gửi tin nhắn từ người dùng ${senderId} tới phòng ${roomId}`,
        error.stack,
      );
      client.emit('error', {
        message: 'Không thể gửi tin nhắn. Vui lòng thử lại.',
      });
    }
  }

  @SubscribeMessage('getConversations')
  async handleGetConversations(
    client: Socket,
    { userId, shopId }: { userId?: string; shopId?: string },
  ) {
    let conversations;

    if (userId) {
      conversations = await this.chatService.getConversations2({ userId });
    } else if (shopId) {
      conversations = await this.chatService.getConversations2({ shopId });
    } else {
      client.emit('error', 'Either userId or shopId must be provided');
      return;
    }

    for (const conversation of conversations) {
      const lastMessage = await this.chatService.getLastMessageByRoom(
        conversation._id,
      );
      conversation.lastMessage = lastMessage
        ? lastMessage.messageText
        : 'Không có tin nhắn';
    }

    client.emit('conversations', conversations);
  }

  @SubscribeMessage('sendFile')
  async handleSendFile(
    client: Socket,
    payload: { roomId: string; senderId: string; files: Express.Multer.File[] },
  ) {
    const { roomId, senderId, files } = payload;

    // Kiểm tra thông tin đầu vào
    if (!roomId || !senderId || !files || files.length === 0) {
      client.emit('error', {
        message: 'Thiếu thông tin roomId, senderId hoặc file',
      });
      this.logger.warn('Gửi file thất bại: thiếu thông tin cần thiết');
      return;
    }

    try {
      let uploadResults: any[] = [];

      const imageFiles = files.filter((file) =>
        file.mimetype.startsWith('image/'),
      );
      const videoFiles = files.filter((file) =>
        file.mimetype.startsWith('video/'),
      );

      // Upload hình ảnh lên Cloudinary
      if (imageFiles.length > 0) {
        const imageResults =
          await this.cloudinaryService.uploadFiles(imageFiles);
        uploadResults = [...uploadResults, ...imageResults];
      }

      if (videoFiles.length > 0) {
        const videoResults =
          await this.cloudinaryService.uploadFiles(videoFiles);
        uploadResults = [...uploadResults, ...videoResults];
      }

      const savedMessages = await Promise.all(
        uploadResults.map(async (uploadResult) => {
          return await this.chatService.sendMessage(
            roomId, // conversationId
            senderId,
            '',
            uploadResult.url,
          );
        }),
      );

      if (!this.messageHistory[roomId]) {
        this.messageHistory[roomId] = [];
      }
      this.messageHistory[roomId].push(...savedMessages);

      savedMessages.forEach((message) => {
        this.server.to(roomId).emit('file', message);
      });

      this.logger.log(
        `Người dùng ${senderId} đã gửi ${files.length} file tới phòng ${roomId}`,
      );

      client.emit('fileSent', {
        success: true,
        messageIds: savedMessages.map((msg) => msg._id),
      });

      return savedMessages;
    } catch (error) {
      this.logger.error(
        `Lỗi khi gửi file từ người dùng ${senderId} tới phòng ${roomId}`,
        error.stack,
      );
      client.emit('error', {
        message: 'Không thể gửi file. Vui lòng thử lại.',
      });
    }
  }

  @SubscribeMessage('newFile')
  public async emitFileToRoom(
    roomId: string,
    message: IMessage,
  ): Promise<void> {
    this.server.to(roomId).emit('newFile', message);
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    client: Socket,
    { messageId, userId }: { messageId: string; userId: string },
  ) {
    try {
      const updatedMessage = await this.chatService.markMessageAsRead(
        messageId,
        userId,
      );
      // Gửi sự kiện tới tất cả các client liên quan để cập nhật trạng thái tin nhắn
      client.emit('messageRead', {
        messageId,
        userId,
        readBy: updatedMessage.readBy,
      });
      client.broadcast.emit('messageRead', {
        messageId,
        userId,
        readBy: updatedMessage.readBy,
      });
    } catch (error) {
      client.emit('error', 'Không thể đánh dấu tin nhắn là đã đọc');
    }
  }
}
