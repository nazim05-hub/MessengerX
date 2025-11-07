import { create } from 'zustand';
import { Chat, Message } from '../types';

interface ChatState {
  selectedChat: Chat | null;
  chats: Chat[];
  messages: Record<number, Message[]>;
  typingUsers: Record<number, number[]>; // chat_id -> user_ids[]
  setSelectedChat: (chat: Chat | null) => void;
  setChats: (chats: Chat[]) => void;
  addChat: (chat: Chat) => void;
  updateChat: (chatId: number, updates: Partial<Chat>) => void;
  setMessages: (chatId: number, messages: Message[]) => void;
  addMessage: (chatId: number, message: Message) => void;
  updateMessage: (chatId: number, messageId: number, updates: Partial<Message>) => void;
  deleteMessage: (chatId: number, messageId: number) => void;
  setTypingUsers: (chatId: number, userIds: number[]) => void;
  addTypingUser: (chatId: number, userId: number) => void;
  removeTypingUser: (chatId: number, userId: number) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  selectedChat: null,
  chats: [],
  messages: {},
  typingUsers: {},
  setSelectedChat: (chat) => set({ selectedChat: chat }),
  setChats: (chats) => set({ chats }),
  addChat: (chat) => set((state) => ({ chats: [chat, ...state.chats] })),
  updateChat: (chatId, updates) =>
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId ? { ...chat, ...updates } : chat
      ),
    })),
  setMessages: (chatId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [chatId]: messages },
    })),
  addMessage: (chatId, message) =>
    set((state) => {
      const chatMessages = state.messages[chatId] || [];
      return {
        messages: {
          ...state.messages,
          [chatId]: [...chatMessages, message],
        },
      };
    }),
  updateMessage: (chatId, messageId, updates) =>
    set((state) => {
      const chatMessages = state.messages[chatId] || [];
      return {
        messages: {
          ...state.messages,
          [chatId]: chatMessages.map((msg) =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          ),
        },
      };
    }),
  deleteMessage: (chatId, messageId) =>
    set((state) => {
      const chatMessages = state.messages[chatId] || [];
      return {
        messages: {
          ...state.messages,
          [chatId]: chatMessages.filter((msg) => msg.id !== messageId),
        },
      };
    }),
  setTypingUsers: (chatId, userIds) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [chatId]: userIds },
    })),
  addTypingUser: (chatId, userId) =>
    set((state) => {
      const currentUsers = state.typingUsers[chatId] || [];
      if (currentUsers.includes(userId)) return state;
      return {
        typingUsers: {
          ...state.typingUsers,
          [chatId]: [...currentUsers, userId],
        },
      };
    }),
  removeTypingUser: (chatId, userId) =>
    set((state) => {
      const currentUsers = state.typingUsers[chatId] || [];
      return {
        typingUsers: {
          ...state.typingUsers,
          [chatId]: currentUsers.filter((id) => id !== userId),
        },
      };
    }),
}));

