import { useEffect, useState } from 'react';
import { Grid, Paper, Modal, TextInput, Button, Stack, MultiSelect } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { ChatList } from '../components/Chat/ChatList';
import { ChatWindow } from '../components/Chat/ChatWindow';
import { CallModal } from '../components/Call/CallModal';
import { useChatStore } from '../stores/chatStore';
import { useCallStore } from '../stores/callStore';
import { chatsApi, usersApi, callsApi } from '../services/api';
import { wsService } from '../services/websocket';
import { webrtcService } from '../services/webrtc';
import { useAuthStore } from '../stores/authStore';
import { notifications } from '@mantine/notifications';

export function ChatPage() {
  const { user } = useAuthStore();
  const { selectedChat, setChats } = useChatStore();
  const { currentCall, incomingCall, setCurrentCall } = useCallStore();
  const [newChatOpened, setNewChatOpened] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [chatName, setChatName] = useState('');
  const [callModalOpened, setCallModalOpened] = useState(false);

  // Загрузка чатов
  const { data: chats = [] } = useQuery({
    queryKey: ['chats'],
    queryFn: chatsApi.getChats,
  });

  useEffect(() => {
    if (chats) {
      setChats(chats);
    }
  }, [chats, setChats]);

  // Загрузка пользователей для создания чата
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getUsers(),
    enabled: newChatOpened,
  });

  // Подключение к WebSocket
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      wsService.connect(token);
    }

    return () => {
      wsService.disconnect();
    };
  }, []);

  // Показать модальное окно звонка
  useEffect(() => {
    if (currentCall || incomingCall) {
      setCallModalOpened(true);
    } else {
      setCallModalOpened(false);
    }
  }, [currentCall, incomingCall]);

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) {
      notifications.show({
        title: 'Ошибка',
        message: 'Выберите хотя бы одного пользователя',
        color: 'red',
      });
      return;
    }

    try {
      const isGroup = selectedUsers.length > 1;
      const chat = await chatsApi.createChat({
        name: isGroup ? chatName : undefined,
        is_group: isGroup,
        participant_ids: selectedUsers.map(Number),
      });

      useChatStore.getState().addChat(chat);
      setNewChatOpened(false);
      setSelectedUsers([]);
      setChatName('');
      
      notifications.show({
        title: 'Успешно',
        message: 'Чат создан',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.detail || 'Не удалось создать чат',
        color: 'red',
      });
    }
  };

  const handleCall = async (type: 'audio' | 'video') => {
    if (!selectedChat) return;

    try {
      const call = await callsApi.createCall({
        chat_id: selectedChat.id,
        call_type: type,
      });

      setCurrentCall(call);
      
      // Start WebRTC
      const otherUser = selectedChat.participants.find((p) => p.id !== user?.id);
      if (otherUser) {
        await webrtcService.startCall(otherUser.id, type === 'video');
      }
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось начать звонок',
        color: 'red',
      });
    }
  };

  const userOptions = users
    .filter((u) => u.id !== user?.id)
    .map((u) => ({
      value: String(u.id),
      label: u.full_name || u.username,
    }));

  return (
    <>
      <Grid h="100vh" m={0} gutter={0}>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper h="100%" style={{ borderRadius: 0 }}>
            <ChatList chats={chats} onNewChat={() => setNewChatOpened(true)} />
          </Paper>
        </Grid.Col>
        
        <Grid.Col span={{ base: 12, md: 8 }}>
          {selectedChat ? (
            <Paper h="100%" style={{ borderRadius: 0 }}>
              <ChatWindow chat={selectedChat} onCall={handleCall} />
            </Paper>
          ) : (
            <Paper h="100%" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: 'var(--mantine-color-dimmed)' }}>
                Выберите чат, чтобы начать общение
              </div>
            </Paper>
          )}
        </Grid.Col>
      </Grid>

      {/* New Chat Modal */}
      <Modal
        opened={newChatOpened}
        onClose={() => setNewChatOpened(false)}
        title="Новый чат"
        centered
      >
        <Stack>
          <MultiSelect
            label="Выберите пользователей"
            placeholder="Начните вводить имя..."
            data={userOptions}
            value={selectedUsers}
            onChange={setSelectedUsers}
            searchable
          />
          
          {selectedUsers.length > 1 && (
            <TextInput
              label="Название группы"
              placeholder="Моя группа"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
            />
          )}
          
          <Button onClick={handleCreateChat}>
            Создать чат
          </Button>
        </Stack>
      </Modal>

      {/* Call Modal */}
      <CallModal
        opened={callModalOpened}
        onClose={() => setCallModalOpened(false)}
      />
    </>
  );
}

