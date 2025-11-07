import { ScrollArea, Stack, TextInput, Avatar, Group, Text, Badge, Paper, ActionIcon } from '@mantine/core';
import { IconSearch, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { Chat } from '../../types';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ChatListProps {
  chats: Chat[];
  onNewChat: () => void;
}

export function ChatList({ chats, onNewChat }: ChatListProps) {
  const [search, setSearch] = useState('');
  const { selectedChat, setSelectedChat } = useChatStore();
  const { user } = useAuthStore();

  const filteredChats = chats.filter((chat) => {
    if (!search) return true;
    
    if (chat.is_group) {
      return chat.name?.toLowerCase().includes(search.toLowerCase());
    } else {
      const otherUser = chat.participants.find((p) => p.id !== user?.id);
      return otherUser?.username.toLowerCase().includes(search.toLowerCase()) ||
             otherUser?.full_name?.toLowerCase().includes(search.toLowerCase());
    }
  });

  const getChatName = (chat: Chat) => {
    if (chat.is_group) {
      return chat.name || 'Групповой чат';
    } else {
      const otherUser = chat.participants.find((p) => p.id !== user?.id);
      return otherUser?.full_name || otherUser?.username || 'Пользователь';
    }
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.is_group) {
      return chat.avatar;
    } else {
      const otherUser = chat.participants.find((p) => p.id !== user?.id);
      return otherUser?.avatar;
    }
  };

  const getLastMessageTime = (chat: Chat) => {
    if (!chat.last_message) return '';
    
    return formatDistanceToNow(new Date(chat.last_message.created_at), {
      addSuffix: true,
      locale: ru,
    });
  };

  return (
    <Stack h="100%" gap={0}>
      <Group p="md" justify="space-between">
        <TextInput
          placeholder="Поиск чатов..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <ActionIcon size="lg" variant="filled" onClick={onNewChat}>
          <IconPlus size={20} />
        </ActionIcon>
      </Group>

      <ScrollArea style={{ flex: 1 }}>
        <Stack gap="xs" p="xs">
          {filteredChats.map((chat) => (
            <Paper
              key={chat.id}
              p="md"
              withBorder
              style={{
                cursor: 'pointer',
                backgroundColor: selectedChat?.id === chat.id ? 'var(--mantine-color-blue-light)' : undefined,
              }}
              onClick={() => setSelectedChat(chat)}
            >
              <Group wrap="nowrap">
                <Avatar src={getChatAvatar(chat)} size="lg" radius="xl">
                  {getChatName(chat)[0]}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Group justify="space-between" wrap="nowrap">
                    <Text fw={500} truncate>
                      {getChatName(chat)}
                    </Text>
                    {chat.last_message && (
                      <Text size="xs" c="dimmed">
                        {getLastMessageTime(chat)}
                      </Text>
                    )}
                  </Group>
                  {chat.last_message && (
                    <Text size="sm" c="dimmed" truncate>
                      {chat.last_message.content}
                    </Text>
                  )}
                </div>
                {chat.unread_count && chat.unread_count > 0 && (
                  <Badge size="sm" circle>
                    {chat.unread_count}
                  </Badge>
                )}
              </Group>
            </Paper>
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

