import React, {useState} from 'react';

import {useWebSocket} from '../../contexts/WebSocketContext';
import {useCurrentProject} from '../../hooks/useCurrentProject';
import {useTeamStore} from '../../store/useTeamStore';

interface WebSocketTestButtonProps {
  className?: string;
}

export const WebSocketTestButton: React.FC<WebSocketTestButtonProps> = ({className}) => {
  const {projectId} = useCurrentProject();
  const {currentTeam} = useTeamStore();
  const {joinProject, isConnected, subscribeToAIEvents, socket} = useWebSocket();
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [receivedEvent, setReceivedEvent] = useState<boolean>(false);

  const testSimpleWebSocket = async () => {
    if (!projectId) {
      setLastResult('❌ No project ID available');
      return;
    }

    if (!isConnected) {
      setLastResult('❌ WebSocket not connected');
      return;
    }

    setIsLoading(true);
    setLastResult(null);
    setReceivedEvent(false);

    try {
      console.log('🧪 Testing SIMPLE WebSocket with project:', projectId);

      if (!socket) {
        setLastResult('❌ No socket available');
        setIsLoading(false);
        return;
      }

      // УЛУЧШЕНИЕ 1: Подписываемся на события ДО присоединения к комнате
      let testEventReceived = false;

      const handleTestMessage = (data: any) => {
        console.log('🎯 SIMPLE TEST: Received test_message!', data);
        testEventReceived = true;
        setReceivedEvent(true);
        setLastResult('✅ Simple WebSocket event received!');
      };

      // Подписываемся на событие теста
      socket.on('test_message', handleTestMessage);

      // УЛУЧШЕНИЕ 2: Используем новый Promise-based API для надежного присоединения к комнате
      console.log('🔗 Joining project room for testing...');
      setLastResult('🔗 Joining project room...');

      const joinResult = await joinProject(projectId, currentTeam?.id || 'fallback-team', 3000); // 3 секунды таймаут

      if (!joinResult.success) {
        setLastResult(`❌ Failed to join project room: ${joinResult.error}`);
        socket.off('test_message', handleTestMessage);
        return;
      }

      console.log('✅ Successfully joined room! Sending HTTP request...');
      setLastResult('✅ Joined room, sending test event...');

      // Небольшая дополнительная пауза для гарантии
      await new Promise((resolve) => setTimeout(resolve, 100));

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${apiUrl}/ws/test-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({projectId})
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Simple test event sent successfully:', result);

        if (!testEventReceived) {
          setLastResult('⏳ Simple event sent, waiting for WebSocket response...');

          // УЛУЧШЕНИЕ 3: Ждем событие с более коротким таймаутом
          const eventWaitTime = 2000; // 2 секунды вместо 3
          const eventStartTime = Date.now();

          while (!testEventReceived && Date.now() - eventStartTime < eventWaitTime) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }

          if (!testEventReceived) {
            setLastResult('⚠️ Simple event sent but not received via WebSocket!');
          }
        }
      } else {
        console.error('❌ Simple test failed:', result);
        setLastResult(`❌ Simple test failed: ${result.error || 'Unknown error'}`);
      }

      // Очистка обработчиков событий
      setTimeout(() => {
        socket.off('test_message', handleTestMessage);
      }, 1000); // уменьшено с 5 секунд до 1 секунды
    } catch (error) {
      console.error('❌ Error testing simple WebSocket:', error);
      setLastResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testWebSocket = async () => {
    if (!projectId) {
      setLastResult('❌ No project ID available');
      return;
    }

    if (!isConnected) {
      setLastResult('❌ WebSocket not connected');
      return;
    }

    setIsLoading(true);
    setLastResult(null);
    setReceivedEvent(false);

    try {
      console.log('🧪 Testing WebSocket with project:', projectId);

      // Подписываемся на AI события для тестирования
      const unsubscribe = subscribeToAIEvents({
        onAIProgress: (status) => {
          console.log('🎯 TEST: Received AI Progress event!', status);
          setReceivedEvent(true);
          setLastResult('✅ WebSocket event received successfully!');
        }
      });

      // УЛУЧШЕНИЕ: Используем новый Promise-based API
      console.log('🔗 Joining project room for testing...');
      setLastResult('🔗 Joining project room...');

      const joinResult = await joinProject(projectId, currentTeam?.id || 'fallback-team', 3000);

      if (!joinResult.success) {
        setLastResult(`❌ Failed to join project room: ${joinResult.error}`);
        unsubscribe();
        return;
      }

      console.log('✅ Successfully joined room! Sending HTTP request...');
      setLastResult('✅ Joined room, sending AI test event...');

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${apiUrl}/ws/test-ai-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({projectId})
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Test event sent successfully:', result);
        if (!receivedEvent) {
          setLastResult('⏳ Event sent, waiting for WebSocket response...');

          // Ждем 2 секунды получения события
          setTimeout(() => {
            if (!receivedEvent) {
              setLastResult('⚠️ Event sent but not received via WebSocket!');
            }
          }, 2000); // уменьшено с 3 секунд до 2
        }
      } else {
        console.error('❌ Test failed:', result);
        setLastResult(`❌ Test failed: ${result.error || 'Unknown error'}`);
      }

      // Отписываемся через 2 секунды
      setTimeout(() => {
        unsubscribe();
      }, 2000); // уменьшено с 5 секунд до 2
    } catch (error) {
      console.error('❌ Error testing WebSocket:', error);
      setLastResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!projectId) {
    return null; // Не показываем кнопку если нет проекта
  }

  return (
    <div className={`websocket-test ${className || ''}`} style={{padding: '10px', margin: '10px'}}>
      <div style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
        <button
          onClick={testSimpleWebSocket}
          disabled={isLoading}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            background: isLoading ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? '🔄 Testing...' : '🔧 Simple Test'}
        </button>

        <button
          onClick={testWebSocket}
          disabled={isLoading}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            background: isLoading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? '🔄 Testing...' : '🧪 AI Test'}
        </button>
      </div>

      {lastResult && (
        <div
          style={{
            marginTop: '8px',
            fontSize: '12px',
            color: lastResult.startsWith('✅') ? '#00aa44' : '#ff4444'
          }}
        >
          {lastResult}
        </div>
      )}

      <div style={{fontSize: '11px', color: '#666', marginTop: '4px'}}>Project: {projectId}</div>
    </div>
  );
};
