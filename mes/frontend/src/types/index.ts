export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  phone_number?: string;
  avatar?: string;
  status?: string;
  user_status: 'online' | 'offline' | 'away';
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
}

export interface Chat {
  id: number;
  name?: string;
  is_group: boolean;
  avatar?: string;
  created_at: string;
  participants: User[];
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: number;
  chat_id: number;
  sender_id: number;
  content?: string;
  message_type: 'text' | 'image' | 'video' | 'document' | 'audio';
  file_url?: string;
  reply_to?: number;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  sender: User;
  reactions?: MessageReaction[];
  read_by?: MessageRead[];
}

export interface MessageReaction {
  id: number;
  message_id: number;
  user_id: number;
  emoji: string;
  created_at: string;
}

export interface MessageRead {
  id: number;
  message_id: number;
  user_id: number;
  read_at: string;
}

export interface Call {
  id: number;
  chat_id: number;
  initiator_id: number;
  call_type: 'audio' | 'video';
  status: 'ringing' | 'active' | 'ended' | 'missed' | 'rejected';
  started_at: string;
  ended_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface WSMessage {
  type: string;
  data: any;
}

