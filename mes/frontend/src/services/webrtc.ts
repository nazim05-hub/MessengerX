import { useCallStore } from '../stores/callStore';
import { wsService } from './websocket';

// STUN/TURN configuration
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Add your TURN server here
  // {
  //   urls: 'turn:YOUR_TURN_SERVER:3478',
  //   username: 'messenger',
  //   credential: 'messenger_turn_password',
  // },
];

export class WebRTCService {
  private static instance: WebRTCService;
  private peerConnections: Map<number, RTCPeerConnection> = new Map();

  private constructor() {}

  static getInstance(): WebRTCService {
    if (!WebRTCService.instance) {
      WebRTCService.instance = new WebRTCService();
    }
    return WebRTCService.instance;
  }

  async startCall(userId: number, isVideo: boolean): Promise<MediaStream> {
    try {
      // Get local stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      });

      useCallStore.getState().setLocalStream(stream);

      // Create peer connection
      const pc = this.createPeerConnection(userId);

      // Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      wsService.sendWebRTCSignal(userId, {
        type: 'offer',
        offer: offer,
      });

      return stream;
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }

  async answerCall(userId: number, offer: RTCSessionDescriptionInit, isVideo: boolean): Promise<MediaStream> {
    try {
      // Get local stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      });

      useCallStore.getState().setLocalStream(stream);

      // Create peer connection
      const pc = this.createPeerConnection(userId);

      // Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      wsService.sendWebRTCSignal(userId, {
        type: 'answer',
        answer: answer,
      });

      return stream;
    } catch (error) {
      console.error('Error answering call:', error);
      throw error;
    }
  }

  async handleAnswer(userId: number, answer: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async handleIceCandidate(userId: number, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  private createPeerConnection(userId: number): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        wsService.sendWebRTCSignal(userId, {
          type: 'ice-candidate',
          candidate: event.candidate,
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      useCallStore.getState().addRemoteStream(userId, remoteStream);
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.closePeerConnection(userId);
      }
    };

    this.peerConnections.set(userId, pc);
    useCallStore.getState().addPeerConnection(userId, pc);

    return pc;
  }

  closePeerConnection(userId: number) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
      useCallStore.getState().removePeerConnection(userId);
      useCallStore.getState().removeRemoteStream(userId);
    }
  }

  async toggleScreenShare() {
    const callStore = useCallStore.getState();
    
    if (callStore.isSharingScreen) {
      // Stop screen sharing
      const localStream = callStore.localStream;
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
        }
        
        // Get camera stream again
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newVideoTrack = newStream.getVideoTracks()[0];
        
        // Replace track in all peer connections
        this.peerConnections.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(newVideoTrack);
          }
        });
        
        localStream.removeTrack(videoTrack);
        localStream.addTrack(newVideoTrack);
      }
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        
        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Replace track in all peer connections
        this.peerConnections.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });
        
        const localStream = callStore.localStream;
        if (localStream) {
          const oldVideoTrack = localStream.getVideoTracks()[0];
          if (oldVideoTrack) {
            localStream.removeTrack(oldVideoTrack);
            oldVideoTrack.stop();
          }
          localStream.addTrack(screenTrack);
        }
        
        // Handle screen share stop
        screenTrack.onended = () => {
          callStore.toggleScreenShare();
        };
      } catch (error) {
        console.error('Error sharing screen:', error);
      }
    }
  }

  endAllCalls() {
    this.peerConnections.forEach((pc, userId) => {
      this.closePeerConnection(userId);
    });
    
    const localStream = useCallStore.getState().localStream;
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    
    useCallStore.getState().endCall();
  }
}

export const webrtcService = WebRTCService.getInstance();

