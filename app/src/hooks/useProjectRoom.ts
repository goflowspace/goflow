import {useCallback, useEffect, useState} from 'react';

import {useWebSocket} from '../contexts/WebSocketContext';

export enum RoomConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  JOINING_ROOM = 'joining_room',
  IN_ROOM = 'in_room',
  ERROR = 'error'
}

interface JoinRoomResult {
  success: boolean;
  error?: string;
  timestamp?: number;
}

interface ProjectRoomState {
  state: RoomConnectionState;
  joinedRooms: Set<string>;
  error?: string;
}

/**
 * Хук для управления состоянием комнат WebSocket проектов
 * Предоставляет Promise-based API для надежного присоединения к комнатам
 */
export const useProjectRoom = () => {
  const {socket, isConnected} = useWebSocket();
  const [roomState, setRoomState] = useState<ProjectRoomState>({
    state: RoomConnectionState.DISCONNECTED,
    joinedRooms: new Set<string>()
  });

  // Обновляем состояние на основе подключения
  useEffect(() => {
    if (!isConnected) {
      setRoomState((prev) => ({
        ...prev,
        state: RoomConnectionState.DISCONNECTED,
        joinedRooms: new Set(), // Очищаем комнаты при отключении
        error: undefined
      }));
    } else if (isConnected && roomState.state === RoomConnectionState.DISCONNECTED) {
      setRoomState((prev) => ({
        ...prev,
        state: RoomConnectionState.CONNECTED,
        error: undefined
      }));
    }
  }, [isConnected, roomState.state]);

  /**
   * Присоединение к комнате проекта с Promise-based API
   */
  const joinProjectRoom = useCallback(
    async (projectId: string, teamId: string, timeout = 5000): Promise<JoinRoomResult> => {
      if (!socket || !isConnected) {
        const error = 'Socket not connected';
        setRoomState((prev) => ({
          ...prev,
          state: RoomConnectionState.ERROR,
          error
        }));
        return {success: false, error};
      }

      // Если уже в комнате, возвращаем успех
      if (roomState.joinedRooms.has(projectId)) {
        console.log(`✅ Already in room for project ${projectId}`);
        return {success: true, timestamp: Date.now()};
      }

      setRoomState((prev) => ({
        ...prev,
        state: RoomConnectionState.JOINING_ROOM,
        error: undefined
      }));

      return new Promise<JoinRoomResult>((resolve) => {
        const timeoutId = setTimeout(() => {
          socket.off('join_project_success', handleSuccess);
          socket.off('join_project_error', handleError);

          const error = 'Join project timeout';
          setRoomState((prev) => ({
            ...prev,
            state: RoomConnectionState.ERROR,
            error
          }));

          console.warn(`⏰ Join project timeout for ${projectId}`);
          resolve({success: false, error});
        }, timeout);

        const handleSuccess = (data: any) => {
          if (data.projectId === projectId && data.success) {
            clearTimeout(timeoutId);
            socket.off('join_project_success', handleSuccess);
            socket.off('join_project_error', handleError);

            setRoomState((prev) => ({
              ...prev,
              state: RoomConnectionState.IN_ROOM,
              joinedRooms: new Set(prev.joinedRooms).add(projectId),
              error: undefined
            }));

            console.log(`✅ Successfully joined room for project ${projectId}`);
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
            setRoomState((prev) => ({
              ...prev,
              state: RoomConnectionState.ERROR,
              error
            }));

            console.error(`❌ Failed to join room for project ${projectId}:`, error);
            resolve({success: false, error});
          }
        };

        // Подписываемся на события подтверждения
        socket.on('join_project_success', handleSuccess);
        socket.on('join_project_error', handleError);

        // Отправляем запрос на присоединение с teamId
        console.log(`🚪 Requesting to join project room: ${projectId} (team: ${teamId})`);
        socket.emit('join_project', {projectId, teamId});
      });
    },
    [socket, isConnected, roomState.joinedRooms]
  );

  /**
   * Покидание комнаты проекта
   */
  const leaveProjectRoom = useCallback(
    async (projectId: string): Promise<void> => {
      if (!socket || !isConnected) {
        return;
      }

      if (!roomState.joinedRooms.has(projectId)) {
        console.log(`ℹ️ Not in room for project ${projectId}, nothing to leave`);
        return;
      }

      console.log(`🚪 Leaving project room: ${projectId}`);
      socket.emit('leave_project', {projectId});

      setRoomState((prev) => {
        const newJoinedRooms = new Set(prev.joinedRooms);
        newJoinedRooms.delete(projectId);

        return {
          ...prev,
          joinedRooms: newJoinedRooms,
          state: newJoinedRooms.size > 0 ? RoomConnectionState.IN_ROOM : RoomConnectionState.CONNECTED
        };
      });
    },
    [socket, isConnected, roomState.joinedRooms]
  );

  /**
   * Проверка, находится ли пользователь в комнате проекта
   */
  const isInRoom = useCallback(
    (projectId: string): boolean => {
      return roomState.joinedRooms.has(projectId);
    },
    [roomState.joinedRooms]
  );

  /**
   * Получение списка комнат, в которых находится пользователь
   */
  const getJoinedRooms = useCallback((): string[] => {
    return Array.from(roomState.joinedRooms);
  }, [roomState.joinedRooms]);

  /**
   * Очистка всех комнат (например, при логауте)
   */
  const clearAllRooms = useCallback((): void => {
    setRoomState((prev) => ({
      ...prev,
      joinedRooms: new Set(),
      state: isConnected ? RoomConnectionState.CONNECTED : RoomConnectionState.DISCONNECTED,
      error: undefined
    }));
  }, [isConnected]);

  return {
    // Состояние
    connectionState: roomState.state,
    joinedRooms: roomState.joinedRooms,
    error: roomState.error,

    // Методы
    joinProjectRoom,
    leaveProjectRoom,
    isInRoom,
    getJoinedRooms,
    clearAllRooms,

    // Вспомогательные свойства
    isConnected,
    canJoinRooms: isConnected && roomState.state !== RoomConnectionState.ERROR
  };
};
