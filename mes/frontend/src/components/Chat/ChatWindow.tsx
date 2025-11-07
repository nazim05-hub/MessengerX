import { useState, useEffect, useRef } from 'react';
import { Stack, Group, Avatar, Text, TextInput, ActionIcon, ScrollArea, Paper, Loader, Center } from '@mantine/core';
import { IconSend, IconPhone, IconVideo, IconPaperclip } from '@tabler/icons-react';
import { Chat, Message } from '../../types';
import { MessageBubble } from './MessageBubble';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatsApi } from '../../services/api';
import { notifications } from '@mantine/notifications';
import { wsService } from '../../services/websocket';

interface ChatWindowProps {
  chat: Chat;
  onCall: (type: 'audio' | 'video') => void;
}

export function ChatWindow({ chat, onCall }: ChatWindowProps) {
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { user } = useAuthStore();
  const { messages, addMessage, typingUsers } = useChatStore();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const chatMessages = messages[chat.id] || [];

  // Загрузка сообщений
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['messages', chat.id],
    queryFn: () => chatsApi.getMessages(chat.id),
  });

  useEffect(() => {
    if (messagesData) {
      useChatStore.getState().setMessages(chat.id, messagesData);
    }
  }, [messagesData, chat.id]);

  // Отправка сообщения
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => chatsApi.sendMessage(chat.id, { content }),
    onSuccess: (data) => {
      addMessage(chat.id, data);
      setMessageText('');
      scrollToBottom();
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.detail || 'Не удалось отправить сообщение',
        color: 'red',
      });
    },
  });

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    sendMessageMutation.mutate(messageText);
    
    // Остановить индикатор набора текста
    wsService.setTyping(chat.id, false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleTyping = (value: string) => {
    setMessageText(value);
    
    // Отправить индикатор набора текста
    if (!isTyping) {
      setIsTyping(true);
      wsService.setTyping(chat.id, true);
    }
    
    // Сбросить таймер
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Остановить индикатор через 3 секунды
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      wsService.setTyping(chat.id, false);
    }, 3000);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const getChatName = () => {
    if (chat.is_group) {
      return chat.name || 'Групповой чат';
    } else {
      const otherUser = chat.participants.find((p) => p.id !== user?.id);
      return otherUser?.full_name || otherUser?.username || 'Пользователь';
    }
  };

  const getChatAvatar = () => {
    if (chat.is_group) {
      return chat.avatar;
    } else {
      const otherUser = chat.participants.find((p) => p.id !== user?.id);
      return otherUser?.avatar;
    }
  };

  const typingUsersList = typingUsers[chat.id] || [];
  const typingUsersText = typingUsersList
    .map((userId) => chat.participants.find((p) => p.id === userId)?.username)
    .filter(Boolean)
    .join(', ');

  return (
    <Stack h="100%" gap={0}>
      {/* Header */}
      <Paper p="md" withBorder>
        <Group justify="space-between">
          <Group>
            <Avatar src={getChatAvatar()} size="md" radius="xl">
              {getChatName()[0]}
            </Avatar>
            <div>
              <Text fw={500}>{getChatName()}</Text>
              {typingUsersText && (
                <Text size="xs" c="dimmed">
                  {typingUsersText} печатает...
                </Text>
              )}
            </div>
          </Group>
          
          <Group gap="xs">
            <ActionIcon size="lg" variant="subtle" onClick={() => onCall('audio')}>
              <IconPhone size={20} />
            </ActionIcon>
            <ActionIcon size="lg" variant="subtle" onClick={() => onCall('video')}>
              <IconVideo size={20} />
            </ActionIcon>
          </Group>
        </Group>
      </Paper>

      {/* Messages */}
      <ScrollArea style={{ flex: 1 }} p="md" viewportRef={scrollRef}>
        {isLoading ? (
          <Center h="100%">
            <Loader />
          </Center>
        ) : (
          <Stack gap="md">
            {chatMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onEdit={(msg) => {
                  // TODO: Implement edit
                }}
                onDelete={async (msg) => {
                  try {
                    await chatsApi.deleteMessage(msg.id);
                    useChatStore.getState().deleteMessage(chat.id, msg.id);
                  } catch (error) {
                    notifications.show({
                      title: 'Ошибка',
                      message: 'Не удалось удалить сообщение',
                      color: 'red',
                    });
                  }
                }}
              />
            ))}
          </Stack>
        )}
      </ScrollArea>

      {/* Input */}
      <Paper p="md" withBorder>
        <Group gap="xs" wrap="nowrap">
          <ActionIcon size="lg" variant="subtle">
            <IconPaperclip size={20} />
          </ActionIcon>
          <TextInput
            placeholder="Введите сообщение..."
            value={messageText}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            style={{ flex: 1 }}
          />
          <ActionIcon
            size="lg"
            variant="filled"
            onClick={handleSendMessage}
            loading={sendMessageMutation.isPending}
            disabled={!messageText.trim()}
          >
            <IconSend size={20} />
          </ActionIcon>
        </Group>
      </Paper>
    </Stack>
  );
}

