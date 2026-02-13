# 🚀 Redis Setup Guide для Real-time Коллаборации

## 📋 Обзор

Этот гайд поможет настроить Redis для горизонтального масштабирования реалтайм коллаборации в Flow Backend.

## 🐳 Быстрый старт с Docker

### 1. Запуск Redis локально

```bash
# Запуск Redis в Docker
docker run -d \
  --name redis-flow \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine \
  redis-server --appendonly yes

# Проверка статуса
docker ps | grep redis-flow
```

### 2. Настройка переменных окружения

Скопируйте `.env.development` и добавьте Redis конфигурацию:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_SESSION_TTL=3600
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000

# Feature Flags (включите нужные функции)
USE_REDIS_COLLABORATION=true
USE_REDIS_WEBSOCKETS=true
USE_REDIS_EVENT_ORDERING=true
```

### 3. Запуск Backend

```bash
cd /path/to/flow/backend
npm run dev
```

Вы должны увидеть в логах:
```
✅ Redis connected successfully
✅ [RedisDI] Using Redis WebSocket Manager
✅ [RedisDI] Using Redis Collaboration Service
✅ [RedisDI] Using Redis Event Ordering Service
```

## 🔧 Продвинутая настройка

### Redis с аутентификацией

```bash
docker run -d \
  --name redis-flow \
  -p 6379:6379 \
  -e REDIS_PASSWORD=your_secure_password \
  redis:7-alpine \
  sh -c 'redis-server --appendonly yes --requirepass "$REDIS_PASSWORD"'
```

Обновите `.env`:
```env
REDIS_PASSWORD=your_secure_password
```

### Redis Cluster (Production)

Для продакшена рекомендуется Redis Cluster:

```bash
# Создание docker-compose.yml для кластера
version: '3.8'
services:
  redis-1:
    image: redis:7-alpine
    ports:
      - "7001:6379"
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    
  redis-2:
    image: redis:7-alpine
    ports:
      - "7002:6379"
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    
  redis-3:
    image: redis:7-alpine
    ports:
      - "7003:6379"
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
```

## 🧪 Тестирование

### Запуск тестов

```bash
# Убедитесь что Redis запущен
docker ps | grep redis

# Запуск Redis integration тестов
npm test -- redis-integration.test.ts
```

### Проверка подключения

```bash
# Подключение к Redis CLI
docker exec -it redis-flow redis-cli

# Проверка health check
127.0.0.1:6379> PING
PONG

# Просмотр активных ключей
127.0.0.1:6379> KEYS flow:*

# Просмотр сессий
127.0.0.1:6379> HGETALL flow:sessions:session-id-here
```

## 📊 Мониторинг

### Redis Metrics

```bash
# Информация о памяти
docker exec redis-flow redis-cli INFO memory

# Статистика команд
docker exec redis-flow redis-cli INFO commandstats

# Подключенные клиенты
docker exec redis-flow redis-cli INFO clients
```

### Application Metrics

Backend предоставляет эндпоинт для статистики:

```bash
curl http://localhost:3001/ws/stats
```

## 🚀 Production Deployment

### 1. Managed Redis (рекомендуется)

**Google Cloud Memorystore:**
```env
REDIS_HOST=10.x.x.x
REDIS_PORT=6379
REDIS_PASSWORD=generated_password
```

**AWS ElastiCache:**
```env
REDIS_HOST=your-cluster.cache.amazonaws.com
REDIS_PORT=6379
```

**Azure Cache for Redis:**
```env
REDIS_HOST=your-cache.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=your_access_key
```

### 2. Self-hosted Redis

```bash
# Продакшен конфигурация Redis
docker run -d \
  --name redis-flow-prod \
  --restart unless-stopped \
  -p 6379:6379 \
  -v /opt/redis/data:/data \
  -v /opt/redis/config:/usr/local/etc/redis \
  redis:7-alpine \
  redis-server /usr/local/etc/redis/redis.conf
```

### 3. Backup и Recovery

```bash
# Создание backup
docker exec redis-flow redis-cli BGSAVE

# Копирование backup файла
docker cp redis-flow:/data/dump.rdb ./backup-$(date +%Y%m%d).rdb

# Восстановление
docker cp ./backup-20241201.rdb redis-flow:/data/dump.rdb
docker restart redis-flow
```

## 🔄 Миграция с In-Memory

### Поэтапный план

1. **Подготовка (неделя 1)**
   ```env
   USE_REDIS_COLLABORATION=false
   USE_REDIS_WEBSOCKETS=false
   USE_REDIS_EVENT_ORDERING=false
   ```

2. **Тестирование (неделя 2)**
   ```env
   USE_REDIS_COLLABORATION=true
   USE_REDIS_WEBSOCKETS=false
   USE_REDIS_EVENT_ORDERING=false
   ```

3. **Частичная миграция (неделя 3)**
   ```env
   USE_REDIS_COLLABORATION=true
   USE_REDIS_WEBSOCKETS=true
   USE_REDIS_EVENT_ORDERING=false
   ```

4. **Полная миграция (неделя 4)**
   ```env
   USE_REDIS_COLLABORATION=true
   USE_REDIS_WEBSOCKETS=true
   USE_REDIS_EVENT_ORDERING=true
   ```

### Rollback план

В случае проблем быстро вернитесь к in-memory:
```env
USE_REDIS_COLLABORATION=false
USE_REDIS_WEBSOCKETS=false
USE_REDIS_EVENT_ORDERING=false
```

Перезапустите сервер:
```bash
pm2 restart backend
```

## ⚠️ Troubleshooting

### Частые проблемы

**1. Соединение отклонено**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
Решение: проверьте что Redis запущен
```bash
docker ps | grep redis
```

**2. Аутентификация не прошла**
```
Error: ERR AUTH <password> called without any password configured
```
Решение: уберите REDIS_PASSWORD из .env или настройте пароль в Redis

**3. Память заполнена**
```
Error: OOM command not allowed when used memory > 'maxmemory'
```
Решение: увеличьте память Redis или настройте eviction policy

**4. Медленные операции**
```
Warning: Redis operation took longer than expected
```
Решение: проверьте network latency или оптимизируйте Redis config

### Debug режим

Включите подробное логирование:
```env
NODE_ENV=development
DEBUG=redis:*
```

### Health Checks

```bash
# Проверка всех сервисов
curl http://localhost:3001/health

# Проверка Redis статуса
curl http://localhost:3001/ws/stats
```

## 📚 Дополнительные ресурсы

- [Redis Documentation](https://redis.io/documentation)
- [Redis Best Practices](https://redis.io/docs/management/optimization/)
- [Monitoring Redis](https://redis.io/docs/management/monitoring/)
- [Redis Security](https://redis.io/docs/management/security/)

---

**Готово! 🎉** Теперь ваш Flow Backend использует Redis для горизонтального масштабирования реалтайм коллаборации.
