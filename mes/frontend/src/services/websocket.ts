import { WS_URL } from '../config/api';
import { useWSStore } from '../stores/wsStore';
import { useChatStore } from '../stores/chatStore';
import { useCallStore } from '../stores/callStore';
import { notifications } from '@mantine/notifications';

export class WebSocketService {
  private static instance: WebSocketService;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `${WS_URL}/ws/${token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      useWSStore.getState().setWs(this.ws);
      useWSStore.getState().setIsConnected(true);
      this.reconnectAttempts = 0;
      
      // Heartbeat
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      useWSStore.getState().setIsConnected(false);
      useWSStore.getState().setWs(null);
      
      // Попытка переподключения
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => {
          console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
          this.connect(token);
        }, this.reconnectDelay);
      }
    };
  }

  private handleMessage(message: any) {
    const { type, data } = message;

    switch (type) {
      case 'new_message':
        // Добавить новое сообщение
        useChatStore.getState().addMessage(data.chat_id, data);
        
        // Показать уведомление
        if (Notification.permission === 'granted') {
          new Notification('Новое сообщение', {
            body: `${data.sender.username}: ${data.content}`,
            icon: data.sender.avatar,
          });
        }
        break;

      case 'user_typing':
        if (data.is_typing) {
          useChatStore.getState().addTypingUser(data.chat_id, data.user_id);
        } else {
          useChatStore.getState().removeTypingUser(data.chat_id, data.user_id);
        }
        break;

      case 'message_read':
        // Обновить статус прочитанности
        break;

      case 'user_status':
        // Обновить статус пользователя
        break;

      case 'incoming_call':
        // Входящий звонок
        useCallStore.getState().setIncomingCall(data);
        
        notifications.show({
          title: 'Входящий звонок',
          message: `${data.initiator.username} звонит вам`,
          color: 'blue',
          autoClose: false,
        });
        break;

      case 'call_accepted':
        // Звонок принят
        notifications.show({
          title: 'Звонок принят',
          message: `${data.username} принял звонок`,
          color: 'green',
        });
        break;

      case 'call_rejected':
        // Звонок отклонён
        notifications.show({
          title: 'Звонок отклонён',
          message: 'Пользователь отклонил звонок',
          color: 'red',
        });
        useCallStore.getState().endCall();
        break;

      case 'call_ended':
        // Звонок завершён
        notifications.show({
          title: 'Звонок завершён',
          message: 'Звонок был завершён',
        });
        useCallStore.getState().endCall();
        break;

      case 'webrtc_signal':
        // WebRTC сигналинг - обработка в WebRTC service
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        console.log('Unknown message type:', type);
    }
  }

  private heartbeatInterval: any;

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000); // 30 seconds
  }

  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    useWSStore.getState().setIsConnected(false);
    useWSStore.getState().setWs(null);
  }

  setTyping(chatId: number, isTyping: boolean) {
    this.send({
      type: 'typing',
      chat_id: chatId,
      is_typing: isTyping,
    });
  }

  markMessageAsRead(messageId: number) {
    this.send({
      type: 'message_read',
      message_id: messageId,
    });
  }

  sendWebRTCSignal(targetUserId: number, signalData: any) {
    this.send({
      type: 'webrtc_signal',
      target_user_id: targetUserId,
      data: signalData,
    });
  }
}

export const wsService = WebSocketService.getInstance();

