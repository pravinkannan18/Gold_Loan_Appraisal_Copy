/**
 * AWS Purity Testing Hook - OPTIMIZED FOR LOW LATENCY
 * Camera runs on browser, YOLO runs on AWS GPU
 * Uses binary WebSocket + reduced resolution for speed
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = BASE_URL.replace('http', 'ws');

// ============ LOW LATENCY SETTINGS ============
const FRAME_WIDTH = 320;      // Reduced from 640 for faster transfer
const FRAME_HEIGHT = 240;     // Reduced from 480
const JPEG_QUALITY = 0.5;     // Lower quality = smaller size = faster
const FRAME_INTERVAL_MS = 100; // 10 FPS (balance between speed and server load)
// ==============================================

export interface PurityStatus {
  task: 'rubbing' | 'acid' | 'done';
  rubbing_detected: boolean;
  acid_detected: boolean;
  message: string;
}

export interface AWSPurityState {
  connected: boolean;
  streaming: boolean;
  sessionId: string | null;
  annotatedFrame: string | null;
  status: PurityStatus | null;
  fps: number;
  processMs: number;
  error: string | null;
  latency: number;
}

export function useAWSPurity() {
  const wsRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const pendingRef = useRef<boolean>(false);  // Track if waiting for response
  const frameTimestampRef = useRef<number>(0);
  
  const [state, setState] = useState<AWSPurityState>({
    connected: false,
    streaming: false,
    sessionId: null,
    annotatedFrame: null,
    status: null,
    fps: 0,
    processMs: 0,
    error: null,
    latency: 0,
  });

  const generateSessionId = () => Math.random().toString(36).substring(2, 10);

  // Connect with binary WebSocket for speed
  const connect = useCallback((sessionId?: string) => {
    const sid = sessionId || generateSessionId();
    setState(prev => ({ ...prev, sessionId: sid }));
    
    // Use the new binary endpoint for LOW LATENCY
    console.log(`🚀 Connecting to LOW LATENCY Binary WebSocket (session: ${sid})...`);
    const ws = new WebSocket(`${WS_URL}/api/purity/aws/stream-binary/${sid}`);
    ws.binaryType = 'arraybuffer';  // Enable binary mode
    
    ws.onopen = () => {
      console.log('✅ Binary WebSocket connected (LOW LATENCY MODE)');
      setState(prev => ({ ...prev, connected: true, error: null }));
    };

    ws.onmessage = (event) => {
      pendingRef.current = false;  // Response received, can send next frame
      const latency = Date.now() - frameTimestampRef.current;
      
      try {
        // Handle binary response (JPEG + JSON metadata)
        if (event.data instanceof ArrayBuffer) {
          const bytes = new Uint8Array(event.data);
          
          // Protocol: First 4 bytes = JSON length (big-endian), then JSON, then JPEG
          const jsonLen = new DataView(event.data).getUint32(0, false);  // big-endian
          const jsonBytes = bytes.slice(4, 4 + jsonLen);
          const jpegBytes = bytes.slice(4 + jsonLen);
          
          const meta = JSON.parse(new TextDecoder().decode(jsonBytes));
          
          // Create blob URL (faster than base64)
          const blob = new Blob([jpegBytes], { type: 'image/jpeg' });
          const imageUrl = URL.createObjectURL(blob);
          
          setState(prev => {
            // Clean up old blob URL
            if (prev.annotatedFrame?.startsWith('blob:')) {
              URL.revokeObjectURL(prev.annotatedFrame);
            }
            return {
              ...prev,
              annotatedFrame: imageUrl,
              status: meta.status,
              fps: meta.fps || 0,
              processMs: meta.process_ms || 0,
              latency,
            };
          });
        } else {
          // JSON fallback for compatibility
          const data = JSON.parse(event.data);
          if (data.type === 'frame') {
            setState(prev => ({
              ...prev,
              annotatedFrame: `data:image/jpeg;base64,${data.frame}`,
              status: data.status,
              fps: data.fps || 0,
              processMs: data.process_ms || 0,
              latency,
            }));
          } else if (data.type === 'error') {
            setState(prev => ({ ...prev, error: data.message }));
          }
        }
      } catch (e) {
        console.error('Parse error:', e);
      }
    };

    ws.onerror = () => {
      setState(prev => ({ ...prev, error: 'WebSocket connection error' }));
    };

    ws.onclose = () => {
      console.log('🔌 AWS WebSocket disconnected');
      setState(prev => ({ ...prev, connected: false, streaming: false }));
    };

    wsRef.current = ws;
    return sid;
  }, []);

  const disconnect = useCallback(() => {
    stopStreaming();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState(prev => ({ 
      ...prev, 
      connected: false, 
      streaming: false,
      annotatedFrame: null 
    }));
  }, []);

  // Optimized streaming with backpressure control
  const startStreaming = useCallback(async (deviceId?: string) => {
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId }, width: FRAME_WIDTH, height: FRAME_HEIGHT }
          : { width: FRAME_WIDTH, height: FRAME_HEIGHT }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      await video.play();
      videoRef.current = video;
      
      const canvas = document.createElement('canvas');
      canvas.width = FRAME_WIDTH;
      canvas.height = FRAME_HEIGHT;
      canvasRef.current = canvas;
      
      setState(prev => ({ ...prev, streaming: true }));
      
      // Send frames with backpressure (skip if previous not processed)
      const sendFrame = () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (!videoRef.current || !canvasRef.current) return;
        
        // BACKPRESSURE: Skip frame if still waiting for previous response
        if (pendingRef.current) {
          console.log('⏭️ Skipping frame (backpressure)');
          return;
        }
        
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        
        ctx.drawImage(videoRef.current, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
        
        // Use toBlob for efficiency (async, non-blocking)
        canvasRef.current.toBlob((blob) => {
          if (blob && wsRef.current?.readyState === WebSocket.OPEN && !pendingRef.current) {
            pendingRef.current = true;
            frameTimestampRef.current = Date.now();
            wsRef.current.send(blob);  // Send binary directly (no base64 overhead)
          }
        }, 'image/jpeg', JPEG_QUALITY);
      };
      
      frameIntervalRef.current = window.setInterval(sendFrame, FRAME_INTERVAL_MS);
      console.log(`📸 Optimized streaming started (${FRAME_WIDTH}x${FRAME_HEIGHT} @ ${1000/FRAME_INTERVAL_MS} FPS)`);
      
    } catch (error) {
      console.error('Failed to start camera:', error);
      setState(prev => ({ ...prev, error: 'Failed to access camera' }));
    }
  }, []);

  const stopStreaming = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clean up blob URL
    setState(prev => {
      if (prev.annotatedFrame?.startsWith('blob:')) {
        URL.revokeObjectURL(prev.annotatedFrame);
      }
      return { ...prev, streaming: false, annotatedFrame: null };
    });
    
    videoRef.current = null;
    canvasRef.current = null;
    pendingRef.current = false;
  }, []);

  const reset = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Send control message with 0x00 prefix for binary endpoint
      const controlMsg = JSON.stringify({ action: 'reset' });
      const controlBytes = new TextEncoder().encode(controlMsg);
      const packet = new Uint8Array(1 + controlBytes.length);
      packet[0] = 0x00;  // Control prefix
      packet.set(controlBytes, 1);
      wsRef.current.send(packet.buffer);
    }
  }, []);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    startStreaming,
    stopStreaming,
    reset,
  };
}

// HTTP API functions
export async function getAWSServiceStatus() {
  const response = await fetch(`${BASE_URL}/api/purity/aws/status`);
  return response.json();
}

export async function createSession() {
  const response = await fetch(`${BASE_URL}/api/purity/aws/session/create`, {
    method: 'POST',
  });
  return response.json();
}

export async function getAvailableCameras(): Promise<MediaDeviceInfo[]> {
  try {
    // Need to request permission first to get labels
    await navigator.mediaDevices.getUserMedia({ video: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'videoinput');
  } catch {
    return [];
  }
}
