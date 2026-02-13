# 🚀 План миграции на Redis для реалтайм коллаборации

## 📋 Обзор миграции

Текущая WebSocket система использует in-memory хранение для:
- Сессий коллаборации
- Управления подключениями  
- Обработки событий

**Цель**: Мигрировать на Redis для:
- Горизонтального масштабирования
- Персистентности состояния
- Pub/Sub для реалтайм событий

## 🏗️ Архитектура после миграции

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Node.js #1    │    │   Node.js #2    │    │   Node.js #3    │
│                 │    │                 │    │                 │
│  WebSocket      │    │  WebSocket      │    │  WebSocket      │  
│  Manager        │    │  Manager        │    │  Manager        │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │       Redis             │
                    │                         │
                    │ • Sessions Storage      │
                    │ • Pub/Sub Events        │
                    │ • State Management      │
                    │ • Operation Ordering    │
                    └─────────────────────────┘
```

## 📦 Компоненты для миграции

### 1. **CollaborationService** ❌ In-Memory → ✅ Redis
```typescript
// До: Map<string, CollaborationSession>
private sessions: Map<string, CollaborationSession> = new Map();

// После: Redis Hash + Sets
redis.hset('sessions', sessionId, JSON.stringify(session));
redis.sadd('user_sessions:userId', sessionId);
redis.sadd('project_sessions:projectId', sessionId);
```

### 2. **WebSocketManager** ❌ In-Memory → ✅ Redis Pub/Sub  
```typescript
// До: прямая эмиссия через socket.io
this.io.to(projectId).emit('event', data);

// После: Redis Pub/Sub между инстансами
redis.publish(`project:${projectId}`, JSON.stringify(event));
```

### 3. **EventOrderingService** ❌ In-Memory → ✅ Redis Streams
```typescript
// После: Redis Streams для ordering событий
redis.xadd(`operations:${projectId}`, '*', 'operation', JSON.stringify(operation));
```

## 🔧 Этапы миграции

### Этап 1: Настройка Redis клиента ⚙️
- [ ] Установить redis и ioredis зависимости
- [ ] Создать Redis конфигурацию
- [ ] Настроить подключение и reconnection logic
- [ ] Добавить health checks

### Этап 2: Redis Collaboration Service 🔄
- [ ] Создать `RedisCollaborationService`
- [ ] Мигрировать session management на Redis
- [ ] Реализовать cleanup через TTL
- [ ] Добавить индексацию по user/project

### Этап 3: Redis WebSocket Manager 📡
- [ ] Создать Redis Pub/Sub адаптер
- [ ] Реализовать cross-instance broadcasting
- [ ] Обновить room management
- [ ] Добавить failover logic

### Этап 4: Redis Event Ordering ⚡
- [ ] Создать Redis Streams для операций
- [ ] Реализовать operation ordering
- [ ] Добавить conflict resolution
- [ ] Настроить consumer groups

### Этап 5: Конфигурация и деплой 🚀
- [ ] Обновить environment переменные
- [ ] Добавить мониторинг Redis
- [ ] Создать migration scripts
- [ ] Обновить Docker setup

### Этап 6: Тестирование и валидация ✅
- [ ] Unit тесты для Redis сервисов
- [ ] Integration тесты
- [ ] Load тестирование
- [ ] Rollback процедуры

## 📋 Redis данные и структуры

### Sessions Storage
```redis
# Сессии коллаборации
HSET sessions:session-id "userId" "user-123"
HSET sessions:session-id "projectId" "project-456"
HSET sessions:session-id "socketId" "socket-789"
HSET sessions:session-id "awareness" '{"userName":"John","lastSeen":1234567890}'
HSET sessions:session-id "joinedAt" 1234567890
HSET sessions:session-id "lastActivity" 1234567890

# Индексы
SADD user_sessions:user-123 session-id
SADD project_sessions:project-456 session-id

# TTL для автоочистки
EXPIRE sessions:session-id 3600
```

### Pub/Sub Events  
```redis
# Каналы для проектов
PUBLISH project:project-456 '{"type":"OPERATION_BROADCAST","payload":{...}}'
PUBLISH user:user-123 '{"type":"USER_JOIN","payload":{...}}'

# Глобальные события
PUBLISH global:awareness '{"type":"AWARENESS_UPDATE","payload":{...}}'
```

### Operation Streams
```redis
# Операции по проектам с упорядочиванием
XADD operations:project-456 * operation '{"id":"op-1","type":"CREATE_NODE",...}'

# Consumer groups для обработки
XGROUP CREATE operations:project-456 processors $ MKSTREAM
XREADGROUP GROUP processors consumer-1 STREAMS operations:project-456 >
```

## 🔧 Конфигурация

### Environment Variables
```env
# Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# Redis cluster (если нужно)
REDIS_CLUSTER_NODES=redis1:6379,redis2:6379,redis3:6379

# Session settings
REDIS_SESSION_TTL=3600
REDIS_SESSION_PREFIX=flow:sessions

# Pub/Sub settings  
REDIS_PUBSUB_PREFIX=flow:events
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000
```

## ⚠️ Миграционные риски

### Высокие риски 🔴
- **Потеря активных сессий** при переключении
- **Race conditions** в операциях
- **Network partitions** между Redis и приложением

### Средние риски 🟡  
- **Performance degradation** из-за network latency
- **Redis memory usage** при большой нагрузке
- **Compatibility issues** с существующим кодом

### Митигация ✅
- **Blue-green deployment** для безопасной миграции
- **Circuit breaker pattern** для Redis сбоев
- **Fallback to in-memory** при недоступности Redis
- **Comprehensive monitoring** и alerting

## 🎯 Критерии успеха

✅ **Функциональность**
- Все WebSocket события работают как прежде  
- Сессии сохраняются между перезапусками
- Cross-instance broadcasting работает

✅ **Производительность**  
- Latency < 50ms для local operations
- Support 1000+ concurrent users
- Memory usage < 512MB per instance

✅ **Надежность**
- 99.9% uptime  
- Zero data loss при failover
- Graceful degradation при Redis недоступности

## 📈 Roadmap

| Неделя | Этап | Задачи |
|--------|------|--------|
| 1 | Подготовка | Redis setup + базовые сервисы |
| 2 | Core Migration | CollaborationService + WebSocketManager |
| 3 | Advanced Features | EventOrdering + Pub/Sub |  
| 4 | Testing | Load testing + bug fixes |
| 5 | Deployment | Production migration + monitoring |

## 🔄 Rollback план

1. **Feature flag** для переключения между in-memory и Redis
2. **Dual-write mode** на время миграции
3. **Monitoring dashboard** для отслеживания метрик
4. **Automated rollback** при критических ошибках

---

**Начинаем миграцию! 🚀**
