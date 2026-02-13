'use client';

import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';

import io from 'socket.io-client';

import useUserStore from '../store/useUserStore';
import {AIEventType, AIProgressEvent, AIProgressStatus, BatchTranslationProgress, WebSocketCallbacks} from '../types/websocket.types';

type Socket = ReturnType<typeof io>;

interface JoinProjectResult {
  success: boolean;
  error?: string;
  timestamp?: number;
}

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinProject: (projectId: string, teamId: string, timeout?: number) => Promise<JoinProjectResult>;
  leaveProject: (projectId: string) => void;
  subscribeToAIEvents: (callbacks: WebSocketCallbacks) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({children}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const {user} = useUserStore(); // Отслеживаем изменения аутентификации

  // Стабилизируем user ID для dependency array
  const userId = user?.id;

  useEffect(() => {
    // Подключаемся к WebSocket только если пользователь авторизован
    if (!user || !userId) {
      console.log('🔐 No user available, skipping WebSocket connection');
      return;
    }

    // Получаем API URL из переменных окружения или используем дефолтный
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    // Получаем токен аутентификации
    const token = localStorage.getItem('auth_token');

    if (!token) {
      console.warn('🔐 No auth token available for WebSocket connection');
      return;
    }

    console.log('🔌 Connecting to WebSocket server at:', apiUrl);

    const newSocket = io(apiUrl, {
      auth: {
        token: token // Передаем токен для аутентификации
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      autoConnect: true
    });

    // Обработчики подключения
    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected:', newSocket.id);
      console.log('🔍 Socket.IO info:', {
        id: newSocket.id,
        connected: newSocket.connected
      });
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason: string) => {
      console.log('❌ WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error: Error) => {
      console.error('🚫 WebSocket connection error:', error);

      // Если ошибка связана с аутентификацией
      if (error.message.includes('Authentication') || error.message.includes('token')) {
        console.warn('🔐 WebSocket authentication failed. Token may be invalid or expired.');

        // Попробуем переподключиться через несколько секунд
        setTimeout(() => {
          const newToken = localStorage.getItem('auth_token');
          if (newToken && newToken !== token) {
            console.log('🔄 Token updated, attempting to reconnect...');
            (newSocket as any).auth = {token: newToken};
            newSocket.connect();
          }
        }, 3000);
      }
    });

    newSocket.on('reconnect', (attemptNumber: number) => {
      console.log('🔄 WebSocket reconnected after', attemptNumber, 'attempts');
    });

    // Логирование всех входящих событий для отладки (закомментировано из-за типизации)
    // newSocket.onAny((eventName: string, ...args: any[]) => {
    //   if (eventName.includes('translation') || eventName.includes('batch') || eventName.includes('progress')) {
    //     console.log('📡 WebSocket event received:', { eventName, args });
    //   }
    // });

    setSocket(newSocket);

    return () => {
      console.log('🔌 Closing WebSocket connection');
      newSocket.close();
    };
  }, [userId]); // Переподключаемся при изменении пользователя

  const joinProject = useCallback(
    async (projectId: string, teamId: string, timeout = 5000): Promise<JoinProjectResult> => {
      if (!socket || !isConnected) {
        const error = 'Socket not connected';
        console.error(`❌ Cannot join project ${projectId}: ${error}`);
        return {success: false, error};
      }

      console.log(`📡 Joining project: ${projectId} (team: ${teamId}) with timeout ${timeout}ms`);

      return new Promise<JoinProjectResult>((resolve) => {
        const timeoutId = setTimeout(() => {
          socket.off('join_project_success', handleSuccess);
          socket.off('join_project_error', handleError);

          const error = 'Join project timeout';
          console.warn(`⏰ Join project timeout for ${projectId} after ${timeout}ms`);
          resolve({success: false, error});
        }, timeout);

        const handleSuccess = (data: any) => {
          if (data.projectId === projectId && data.success) {
            clearTimeout(timeoutId);
            socket.off('join_project_success', handleSuccess);
            socket.off('join_project_error', handleError);

            console.log(`✅ Successfully joined project ${projectId} at ${new Date(data.timestamp).toISOString()}`);
            resolve({
              success: true,
              timestamp: data.timestamp || Date.now()
            });
          }
        };

        const handleError = (data: any) => {
          if (data.projectId === projectId) {
            clearTimeout(timeoutId);
            socket.off('join_project_success', handleSuccess);
            socket.off('join_project_error', handleError);

            const error = data.error || 'Failed to join project';
            console.error(`❌ Failed to join project ${projectId}:`, error);
            resolve({success: false, error});
          }
        };

        // Подписываемся на события подтверждения ПЕРЕД отправкой запроса
        socket.on('join_project_success', handleSuccess);
        socket.on('join_project_error', handleError);

        // Отправляем запрос на присоединение с teamId
        socket.emit('join_project', {projectId, teamId});
      });
    },
    [socket, isConnected]
  );

  const leaveProject = useCallback(
    (projectId: string) => {
      if (socket && isConnected) {
        console.log('📡 Leaving project:', projectId);
        socket.emit('leave_project', {projectId});
      }
    },
    [socket, isConnected]
  );

  const subscribeToAIEvents = useCallback(
    (callbacks: WebSocketCallbacks) => {
      if (!socket) {
        console.warn('🚫 Cannot subscribe to AI events - no socket available');
        return () => {};
      }

      console.log('🔗 Subscribing to AI events:', {
        events: [AIEventType.AI_PIPELINE_PROGRESS, AIEventType.AI_PIPELINE_COMPLETED, AIEventType.AI_PIPELINE_ERROR, AIEventType.BATCH_TRANSLATION_PROGRESS],
        socketConnected: socket.connected
      });

      // Обработчик AI прогресса
      const handleAIProgress = (event: AIProgressEvent) => {
        console.log('📊 AI Progress received:', {
          event,
          eventType: AIEventType.AI_PIPELINE_PROGRESS,
          payload: event.payload
        });
        callbacks.onAIProgress?.(event.payload);
      };

      // Обработчик завершения AI
      const handleAICompleted = (event: AIProgressEvent) => {
        console.log('✅ AI Completed received:', {
          event,
          eventType: AIEventType.AI_PIPELINE_COMPLETED,
          payload: event.payload
        });
        callbacks.onAICompleted?.(event.payload);
      };

      // Обработчик ошибки AI
      const handleAIError = (event: AIProgressEvent) => {
        console.error('❌ AI Error received:', {
          event,
          eventType: AIEventType.AI_PIPELINE_ERROR,
          payload: event.payload
        });
        callbacks.onAIError?.(event.payload);
      };

      // Обработчик batch translation прогресса
      const handleBatchTranslationProgress = (event: any) => {
        console.log('🔄 Batch Translation Progress received:', {
          event,
          eventType: AIEventType.BATCH_TRANSLATION_PROGRESS,
          payload: event.payload,
          data: event.data,
          rawEvent: event
        });
        callbacks.onBatchTranslationProgress?.(event.payload || event.data || event);
      };

      // Подписываемся на события
      socket.on(AIEventType.AI_PIPELINE_PROGRESS, handleAIProgress);
      socket.on(AIEventType.AI_PIPELINE_COMPLETED, handleAICompleted);
      socket.on(AIEventType.AI_PIPELINE_ERROR, handleAIError);
      socket.on(AIEventType.BATCH_TRANSLATION_PROGRESS, handleBatchTranslationProgress);

      // Также слушаем любые события, которые могут содержать batch progress
      socket.on('message', (data: any) => {
        if (data && (data.type === 'batch_translation_progress' || data.type === AIEventType.BATCH_TRANSLATION_PROGRESS)) {
          console.log('📦 Batch translation progress via message event:', data);
          callbacks.onBatchTranslationProgress?.(data.payload || data.data || data);
        }
      });

      // Попробуем также прослушать прямые события проекта
      socket.on('project_event', (data: any) => {
        console.log('🎯 Project event received:', data);
        if (data && data.type === 'batch_translation_progress') {
          callbacks.onBatchTranslationProgress?.(data.payload || data.data || data);
        }
      });

      // Возвращаем функцию отписки
      return () => {
        socket.off(AIEventType.AI_PIPELINE_PROGRESS, handleAIProgress);
        socket.off(AIEventType.AI_PIPELINE_COMPLETED, handleAICompleted);
        socket.off(AIEventType.AI_PIPELINE_ERROR, handleAIError);
        socket.off(AIEventType.BATCH_TRANSLATION_PROGRESS, handleBatchTranslationProgress);
        socket.off('message');
        socket.off('project_event');
      };
    },
    [socket]
  );

  const value: WebSocketContextType = {
    socket,
    isConnected,
    joinProject,
    leaveProject,
    subscribeToAIEvents
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

// Заглушка для OSS режима (когда WebSocketProvider не используется)
const defaultWebSocketContext: WebSocketContextType = {
  socket: null,
  isConnected: false,
  joinProject: async () => ({success: false, error: 'WebSocket not available in OSS mode'}),
  leaveProject: () => {},
  subscribeToAIEvents: () => () => {}
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    // В OSS режиме возвращаем безопасную заглушку вместо ошибки
    return defaultWebSocketContext;
  }
  return context;
};
