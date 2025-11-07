import { create } from 'zustand';
import { Call } from '../types';

interface CallState {
  currentCall: Call | null;
  incomingCall: Call | null;
  localStream: MediaStream | null;
  remoteStreams: Record<number, MediaStream>; // user_id -> stream
  peerConnections: Record<number, RTCPeerConnection>; // user_id -> connection
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isSharingScreen: boolean;
  setCurrentCall: (call: Call | null) => void;
  setIncomingCall: (call: Call | null) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  addRemoteStream: (userId: number, stream: MediaStream) => void;
  removeRemoteStream: (userId: number) => void;
  addPeerConnection: (userId: number, connection: RTCPeerConnection) => void;
  removePeerConnection: (userId: number) => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  endCall: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  currentCall: null,
  incomingCall: null,
  localStream: null,
  remoteStreams: {},
  peerConnections: {},
  isAudioMuted: false,
  isVideoMuted: false,
  isSharingScreen: false,
  setCurrentCall: (call) => set({ currentCall: call }),
  setIncomingCall: (call) => set({ incomingCall: call }),
  setLocalStream: (stream) => set({ localStream: stream }),
  addRemoteStream: (userId, stream) =>
    set((state) => ({
      remoteStreams: { ...state.remoteStreams, [userId]: stream },
    })),
  removeRemoteStream: (userId) =>
    set((state) => {
      const { [userId]: removed, ...rest } = state.remoteStreams;
      return { remoteStreams: rest };
    }),
  addPeerConnection: (userId, connection) =>
    set((state) => ({
      peerConnections: { ...state.peerConnections, [userId]: connection },
    })),
  removePeerConnection: (userId) =>
    set((state) => {
      const { [userId]: removed, ...rest } = state.peerConnections;
      removed?.close();
      return { peerConnections: rest };
    }),
  toggleAudio: () => {
    const state = get();
    if (state.localStream) {
      state.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      set({ isAudioMuted: !state.isAudioMuted });
    }
  },
  toggleVideo: () => {
    const state = get();
    if (state.localStream) {
      state.localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      set({ isVideoMuted: !state.isVideoMuted });
    }
  },
  toggleScreenShare: async () => {
    const state = get();
    set({ isSharingScreen: !state.isSharingScreen });
  },
  endCall: () => {
    const state = get();
    
    // Stop local stream
    if (state.localStream) {
      state.localStream.getTracks().forEach((track) => track.stop());
    }
    
    // Close all peer connections
    Object.values(state.peerConnections).forEach((pc) => pc.close());
    
    set({
      currentCall: null,
      incomingCall: null,
      localStream: null,
      remoteStreams: {},
      peerConnections: {},
      isAudioMuted: false,
      isVideoMuted: false,
      isSharingScreen: false,
    });
  },
}));

