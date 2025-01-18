import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { MongooseModule } from '@nestjs/mongoose';
// import { ChatGateway } from './chat/chat.gateway';

@Module({
  imports: [
    MongooseModule.forRoot(
      'mongodb+srv://nguyenhuuphuc2004ct:vCcVqke1fytk56mt@duantnmodelchat.7y32g.mongodb.net/DATNChat',
      {
        connectionFactory: (connection) => {
          connection.on('errođr', (err) => {
            console.error('MongoDB connection error:', err);
          });
          connection.on('connected', () => {
            console.log('MongoDB connected successfully!');
          });
          return connection;
        },
      },
    ),

    ChatModule,
  ],
})
export class AppModule {}
