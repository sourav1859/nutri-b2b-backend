import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface WebSocketState {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  error: string | null;
}

export function useWebSocket(url?: string) {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    lastMessage: null,
    error: null
  });

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const messageListeners = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  const connect = useCallback(() => {
    if (!url) return;

    try {
      // In production, this would connect to a real WebSocket endpoint
      // For now, we'll simulate the connection state
      setState(prev => ({
        ...prev,
        isConnected: true,
        error: null
      }));

      // Simulate periodic updates
      const interval = setInterval(() => {
        const mockMessage: WebSocketMessage = {
          type: 'metrics_update',
          data: {
            searchP95: Math.floor(Math.random() * 100) + 200,
            matchesP95: Math.floor(Math.random() * 200) + 300,
            activeJobs: Math.floor(Math.random() * 5),
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        };

        setState(prev => ({
          ...prev,
          lastMessage: mockMessage
        }));

        // Notify listeners
        const listeners = messageListeners.current.get(mockMessage.type);
        if (listeners) {
          listeners.forEach(callback => callback(mockMessage.data));
        }
      }, 30000); // Update every 30 seconds

      return () => {
        clearInterval(interval);
      };
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        error: (error as Error).message
      }));
    }
  }, [url]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    setState(prev => ({
      ...prev,
      isConnected: false
    }));
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback((messageType: string, callback: (data: any) => void) => {
    if (!messageListeners.current.has(messageType)) {
      messageListeners.current.set(messageType, new Set());
    }
    messageListeners.current.get(messageType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = messageListeners.current.get(messageType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          messageListeners.current.delete(messageType);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (url) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url, connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    subscribe
  };
}
