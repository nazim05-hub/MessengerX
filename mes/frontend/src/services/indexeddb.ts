import Dexie, { Table } from 'dexie';
import { Chat, Message, User } from '../types';

export class MessengerDB extends Dexie {
  chats!: Table<Chat, number>;
  messages!: Table<Message, number>;
  users!: Table<User, number>;

  constructor() {
    super('MessengerDB');
    
    this.version(1).stores({
      chats: 'id, created_at',
      messages: 'id, chat_id, created_at',
      users: 'id, username, email',
    });
  }
}

export const db = new MessengerDB();

// IndexedDB service для офлайн-поддержки
export class IndexedDBService {
  // Chats
  async saveChats(chats: Chat[]) {
    await db.chats.bulkPut(chats);
  }

  async getChats(): Promise<Chat[]> {
    return await db.chats.toArray();
  }

  async saveChat(chat: Chat) {
    await db.chats.put(chat);
  }

  async getChat(chatId: number): Promise<Chat | undefined> {
    return await db.chats.get(chatId);
  }

  // Messages
  async saveMessages(chatId: number, messages: Message[]) {
    await db.messages.bulkPut(messages);
  }

  async getMessages(chatId: number): Promise<Message[]> {
    return await db.messages.where('chat_id').equals(chatId).sortBy('created_at');
  }

  async saveMessage(message: Message) {
    await db.messages.put(message);
  }

  async deleteMessage(messageId: number) {
    await db.messages.delete(messageId);
  }

  // Users
  async saveUsers(users: User[]) {
    await db.users.bulkPut(users);
  }

  async getUsers(): Promise<User[]> {
    return await db.users.toArray();
  }

  async saveUser(user: User) {
    await db.users.put(user);
  }

  async getUser(userId: number): Promise<User | undefined> {
    return await db.users.get(userId);
  }

  // Clear all data
  async clearAll() {
    await db.chats.clear();
    await db.messages.clear();
    await db.users.clear();
  }
}

export const indexedDBService = new IndexedDBService();

