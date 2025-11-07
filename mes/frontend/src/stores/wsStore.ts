import { create } from 'zustand';

interface WSState {
  ws: WebSocket | null;
  isConnected: boolean;
  setWs: (ws: WebSocket | null) => void;
  setIsConnected: (isConnected: boolean) => void;
  sendMessage: (message: any) => void;
}

export const useWSStore = create<WSState>((set, get) => ({
  ws: null,
  isConnected: false,
  setWs: (ws) => set({ ws }),
  setIsConnected: (isConnected) => set({ isConnected }),
  sendMessage: (message) => {
    const { ws, isConnected } = get();
    if (ws && isConnected) {
      ws.send(JSON.stringify(message));
    }
  },
}));

