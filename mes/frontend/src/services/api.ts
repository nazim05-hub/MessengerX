import { api } from '../config/api';
import { User, Chat, Message, Call, AuthTokens } from '../types';

// Auth API
export const authApi = {
  register: async (data: { email: string; username: string; password: string; full_name?: string }) => {
    const response = await api.post<User>('/api/auth/register', data);
    return response.data;
  },
  
  login: async (data: { email: string; password: string }) => {
    const response = await api.post<AuthTokens>('/api/auth/login', data);
    return response.data;
  },
  
  getMe: async () => {
    const response = await api.get<User>('/api/auth/me');
    return response.data;
  },
  
  verifyEmail: async (token: string) => {
    const response = await api.post('/api/auth/verify-email', null, { params: { token } });
    return response.data;
  },
  
  logout: async () => {
    const response = await api.post('/api/auth/logout');
    return response.data;
  },
};

// Users API
export const usersApi = {
  getUsers: async (search?: string) => {
    const response = await api.get<User[]>('/api/users/', { params: { search } });
    return response.data;
  },
  
  getUser: async (userId: number) => {
    const response = await api.get<User>(`/api/users/${userId}`);
    return response.data;
  },
  
  updateMe: async (data: Partial<User>) => {
    const response = await api.put<User>('/api/users/me', data);
    return response.data;
  },
  
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<{ avatar: string }>('/api/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

// Chats API
export const chatsApi = {
  getChats: async () => {
    const response = await api.get<Chat[]>('/api/chats/');
    return response.data;
  },
  
  getChat: async (chatId: number) => {
    const response = await api.get<Chat>(`/api/chats/${chatId}`);
    return response.data;
  },
  
  createChat: async (data: { name?: string; is_group: boolean; participant_ids: number[] }) => {
    const response = await api.post<Chat>('/api/chats/', data);
    return response.data;
  },
  
  getMessages: async (chatId: number, skip = 0, limit = 50) => {
    const response = await api.get<Message[]>(`/api/chats/${chatId}/messages`, {
      params: { skip, limit },
    });
    return response.data;
  },
  
  sendMessage: async (chatId: number, data: { content?: string; message_type?: string; reply_to?: number }) => {
    const response = await api.post<Message>(`/api/chats/${chatId}/messages`, {
      ...data,
      chat_id: chatId,
    });
    return response.data;
  },
  
  updateMessage: async (messageId: number, content: string) => {
    const response = await api.put<Message>(`/api/chats/messages/${messageId}`, { content });
    return response.data;
  },
  
  deleteMessage: async (messageId: number) => {
    const response = await api.delete(`/api/chats/messages/${messageId}`);
    return response.data;
  },
};

// Calls API
export const callsApi = {
  createCall: async (data: { chat_id: number; call_type: 'audio' | 'video' }) => {
    const response = await api.post<Call>('/api/calls/', data);
    return response.data;
  },
  
  acceptCall: async (callId: number) => {
    const response = await api.put(`/api/calls/${callId}/accept`);
    return response.data;
  },
  
  rejectCall: async (callId: number) => {
    const response = await api.put(`/api/calls/${callId}/reject`);
    return response.data;
  },
  
  endCall: async (callId: number) => {
    const response = await api.put(`/api/calls/${callId}/end`);
    return response.data;
  },
  
  getCallHistory: async () => {
    const response = await api.get<Call[]>('/api/calls/history');
    return response.data;
  },
};

