// import { Test, TestingModule } from '@nestjs/testing';
// import { ChatController } from './chat/chat.controller';
// import { ChatService } from './chat/chat.service';

// describe('ChatController', () => {
//   let chatController: ChatController;
//   let chatService: ChatService;

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       controllers: [ChatController],
//       providers: [
//         {
//           provide: ChatService,
//           useValue: {
//             createConversation: jest.fn(),
//             getConversations: jest.fn(),
//           },
//         },
//       ],
//     }).compile();

//     chatController = module.get<ChatController>(ChatController);
//     chatService = module.get<ChatService>(ChatService);
//   });

//   describe('createConversation', () => {
//     it('should create a conversation', async () => {
//       const body = { accountId: '123', shopId: '456' };
//       const result = { accountId: '123', shopId: '456' }; // Fake response

//       jest.spyOn(chatService, 'createConversation').mockResolvedValue(result);

//       expect(await chatController.createMessage(body)).toEqual(result);
//     });
//   });
// });
