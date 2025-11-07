import { Paper, Text, Group, Avatar, ActionIcon, Menu } from '@mantine/core';
import { IconDots, IconEdit, IconTrash } from '@tabler/icons-react';
import { Message } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface MessageBubbleProps {
  message: Message;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
}

export function MessageBubble({ message, onEdit, onDelete }: MessageBubbleProps) {
  const { user } = useAuthStore();
  const isOwn = message.sender_id === user?.id;

  return (
    <Group
      gap="xs"
      justify={isOwn ? 'flex-end' : 'flex-start'}
      wrap="nowrap"
      align="flex-start"
    >
      {!isOwn && (
        <Avatar src={message.sender.avatar} size="sm" radius="xl">
          {message.sender.username[0]}
        </Avatar>
      )}
      
      <div style={{ maxWidth: '70%' }}>
        {!isOwn && (
          <Text size="xs" c="dimmed" mb={4}>
            {message.sender.full_name || message.sender.username}
          </Text>
        )}
        
        <Paper
          p="sm"
          radius="lg"
          style={{
            backgroundColor: isOwn ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-1)',
            color: isOwn ? 'white' : 'inherit',
          }}
        >
          <Group gap="xs" justify="space-between" wrap="nowrap">
            <Text size="sm" style={{ wordBreak: 'break-word' }}>
              {message.content}
            </Text>
            
            {isOwn && (
              <Menu shadow="md" width={150}>
                <Menu.Target>
                  <ActionIcon size="sm" variant="transparent" color={isOwn ? 'white' : 'gray'}>
                    <IconDots size={16} />
                  </ActionIcon>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconEdit size={14} />}
                    onClick={() => onEdit?.(message)}
                  >
                    Редактировать
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconTrash size={14} />}
                    color="red"
                    onClick={() => onDelete?.(message)}
                  >
                    Удалить
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
          </Group>
          
          <Text size="xs" c={isOwn ? 'white' : 'dimmed'} ta="right" mt={4}>
            {formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
              locale: ru,
            })}
            {message.is_edited && ' (изменено)'}
          </Text>
        </Paper>
      </div>
      
      {isOwn && (
        <Avatar src={message.sender.avatar} size="sm" radius="xl">
          {message.sender.username[0]}
        </Avatar>
      )}
    </Group>
  );
}

