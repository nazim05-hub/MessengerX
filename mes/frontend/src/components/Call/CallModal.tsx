import { Modal, Stack, Group, Avatar, Text, ActionIcon, Button, Center } from '@mantine/core';
import { IconPhone, IconPhoneOff, IconMicrophone, IconMicrophoneOff, IconVideo, IconVideoOff, IconScreenShare } from '@tabler/icons-react';
import { useEffect, useRef } from 'react';
import { useCallStore } from '../../stores/callStore';
import { webrtcService } from '../../services/webrtc';
import { callsApi } from '../../services/api';
import { notifications } from '@mantine/notifications';

interface CallModalProps {
  opened: boolean;
  onClose: () => void;
}

export function CallModal({ opened, onClose }: CallModalProps) {
  const {
    currentCall,
    incomingCall,
    localStream,
    remoteStreams,
    isAudioMuted,
    isVideoMuted,
    isSharingScreen,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    endCall,
  } = useCallStore();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<number, HTMLVideoElement>>(new Map());

  // Set local stream
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Set remote streams
  useEffect(() => {
    Object.entries(remoteStreams).forEach(([userId, stream]) => {
      const video = remoteVideosRef.current.get(Number(userId));
      if (video) {
        video.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  const handleEndCall = async () => {
    if (currentCall) {
      try {
        await callsApi.endCall(currentCall.id);
      } catch (error) {
        console.error('Error ending call:', error);
      }
    }
    
    webrtcService.endAllCalls();
    endCall();
    onClose();
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    
    try {
      await callsApi.acceptCall(incomingCall.id);
      // WebRTC logic будет обработана в WebSocket handler
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось принять звонок',
        color: 'red',
      });
    }
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;
    
    try {
      await callsApi.rejectCall(incomingCall.id);
      useCallStore.getState().setIncomingCall(null);
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось отклонить звонок',
        color: 'red',
      });
    }
  };

  const handleToggleScreenShare = async () => {
    try {
      await webrtcService.toggleScreenShare();
      toggleScreenShare();
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  };

  // Incoming call view
  if (incomingCall && !currentCall) {
    return (
      <Modal
        opened={opened}
        onClose={() => {}}
        withCloseButton={false}
        centered
        size="sm"
      >
        <Stack align="center" gap="xl" p="xl">
          <Avatar size={100} radius="xl" />
          <div>
            <Text size="xl" fw={500} ta="center">
              Входящий звонок
            </Text>
            <Text c="dimmed" ta="center">
              {incomingCall.call_type === 'video' ? 'Видео' : 'Аудио'} звонок
            </Text>
          </div>
          
          <Group gap="xl">
            <ActionIcon
              size={60}
              radius="xl"
              color="red"
              variant="filled"
              onClick={handleRejectCall}
            >
              <IconPhoneOff size={30} />
            </ActionIcon>
            <ActionIcon
              size={60}
              radius="xl"
              color="green"
              variant="filled"
              onClick={handleAcceptCall}
            >
              <IconPhone size={30} />
            </ActionIcon>
          </Group>
        </Stack>
      </Modal>
    );
  }

  // Active call view
  if (currentCall) {
    const isVideoCall = currentCall.call_type === 'video';

    return (
      <Modal
        opened={opened}
        onClose={() => {}}
        withCloseButton={false}
        fullScreen
        padding={0}
      >
        <Stack h="100vh" gap={0} style={{ backgroundColor: '#1a1a1a' }}>
          {/* Remote videos */}
          <div style={{ flex: 1, position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8 }}>
            {Object.keys(remoteStreams).length === 0 ? (
              <Center h="100%">
                <Stack align="center">
                  <Avatar size={100} radius="xl" />
                  <Text c="white" size="xl">
                    Ожидание подключения...
                  </Text>
                </Stack>
              </Center>
            ) : (
              Object.entries(remoteStreams).map(([userId, stream]) => (
                <video
                  key={userId}
                  ref={(el) => {
                    if (el) remoteVideosRef.current.set(Number(userId), el);
                  }}
                  autoPlay
                  playsInline
                  style={{
                    flex: 1,
                    minWidth: '300px',
                    maxHeight: '100%',
                    borderRadius: 8,
                    objectFit: 'cover',
                  }}
                />
              ))
            )}
          </div>

          {/* Local video */}
          {isVideoCall && localStream && (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                position: 'absolute',
                bottom: 100,
                right: 20,
                width: 150,
                height: 200,
                borderRadius: 8,
                objectFit: 'cover',
                border: '2px solid white',
              }}
            />
          )}

          {/* Controls */}
          <Group justify="center" p="xl" gap="xl">
            <ActionIcon
              size={60}
              radius="xl"
              variant="filled"
              color={isAudioMuted ? 'red' : 'gray'}
              onClick={toggleAudio}
            >
              {isAudioMuted ? <IconMicrophoneOff size={30} /> : <IconMicrophone size={30} />}
            </ActionIcon>

            {isVideoCall && (
              <>
                <ActionIcon
                  size={60}
                  radius="xl"
                  variant="filled"
                  color={isVideoMuted ? 'red' : 'gray'}
                  onClick={toggleVideo}
                >
                  {isVideoMuted ? <IconVideoOff size={30} /> : <IconVideo size={30} />}
                </ActionIcon>

                <ActionIcon
                  size={60}
                  radius="xl"
                  variant="filled"
                  color={isSharingScreen ? 'blue' : 'gray'}
                  onClick={handleToggleScreenShare}
                >
                  <IconScreenShare size={30} />
                </ActionIcon>
              </>
            )}

            <ActionIcon
              size={60}
              radius="xl"
              color="red"
              variant="filled"
              onClick={handleEndCall}
            >
              <IconPhoneOff size={30} />
            </ActionIcon>
          </Group>
        </Stack>
      </Modal>
    );
  }

  return null;
}

