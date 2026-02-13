# Server Timing API - Руководство

## Обзор

Server Timing API позволяет передавать информацию о производительности сервера в браузер через заголовки HTTP. Это полезно для отладки и оптимизации производительности.

## Как это работает

Middleware `serverTimingMiddleware` автоматически:
- Измеряет общее время выполнения запроса
- Добавляет заголовок `Server-Timing` в ответы
- Логирует метрики в development режиме
- Предоставляет API для custom измерений

## Установка

Server Timing API уже интегрирован в проект. Middleware подключен в `src/app.ts`:

```typescript
import { serverTimingMiddleware } from "@middlewares/serverTiming.middleware";

// В цепочке middleware
app.use(serverTimingMiddleware);
```

## Просмотр метрик в браузере

1. Откройте Developer Tools (F12)
2. Перейдите на вкладку Network
3. Выполните любой запрос к API
4. В деталях запроса найдите заголовок `Server-Timing`
5. Или откройте вкладку Timing для визуального представления

## Использование в контроллерах

### Базовое использование

```typescript
export const someController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Начинаем измерение
        if (req.timing) {
            req.timing.addMetric('database', 'Время запроса к БД');
        }
        
        const data = await someService.getData();
        
        // Завершаем измерение
        if (req.timing) {
            req.timing.endMetric('database');
        }
        
        res.json({ data });
    } catch (error) {
        next(error);
    }
};
```

### Измерение нескольких операций

```typescript
export const complexController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Валидация
        if (req.timing) {
            req.timing.addMetric('validation', 'Валидация данных');
        }
        await validateData(req.body);
        if (req.timing) {
            req.timing.endMetric('validation');
        }
        
        // База данных
        if (req.timing) {
            req.timing.addMetric('db_query', 'Запрос к базе данных');
        }
        const user = await prisma.user.findMany();
        if (req.timing) {
            req.timing.endMetric('db_query');
        }
        
        // Внешний API
        if (req.timing) {
            req.timing.addMetric('external_api', 'Запрос к внешнему API');
        }
        const externalData = await fetchExternalData();
        if (req.timing) {
            req.timing.endMetric('external_api');
        }
        
        res.json({ user, externalData });
    } catch (error) {
        next(error);
    }
};
```

### Использование с декоратором (для классов)

```typescript
import { measureTime } from "@middlewares/serverTiming.middleware";

class SomeService {
    @measureTime('user_creation', 'Создание пользователя')
    async createUser(req: Request, userData: any) {
        return await prisma.user.create({ data: userData });
    }
}
```

## Интеграция с операциями базы данных

### Простое измерение

```typescript
// В сервисе или контроллере
export const getUserById = async (req: Request, id: string) => {
    if (req.timing) {
        req.timing.addMetric('user_fetch', 'Получение пользователя по ID');
    }
    
    const user = await prisma.user.findUnique({
        where: { id },
        include: { teams: true }
    });
    
    if (req.timing) {
        req.timing.endMetric('user_fetch');
    }
    
    return user;
};
```

### Измерение сложных операций

```typescript
export const createProject = async (req: Request, projectData: any) => {
    if (req.timing) {
        req.timing.addMetric('project_validation', 'Валидация проекта');
    }
    
    // Валидация
    await validateProject(projectData);
    
    if (req.timing) {
        req.timing.endMetric('project_validation');
        req.timing.addMetric('project_creation', 'Создание проекта');
    }
    
    // Создание в транзакции
    const result = await prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
            data: projectData
        });
        
        await tx.projectMember.create({
            data: {
                projectId: project.id,
                userId: req.user!.id,
                role: 'OWNER'
            }
        });
        
        return project;
    });
    
    if (req.timing) {
        req.timing.endMetric('project_creation');
    }
    
    return result;
};
```

## Автоматические метрики

Middleware автоматически измеряет:

- `total` - Общее время выполнения запроса
- `server` - Время обработки на сервере

## Дополнительные утилиты

### Создание custom метрики

```typescript
import { createTimingMetric } from "@middlewares/serverTiming.middleware";

export const someFunction = async (req: Request) => {
    const timer = createTimingMetric(req, 'custom_operation', 'Пользовательская операция');
    
    // Выполняем операцию
    await doSomething();
    
    // Завершаем измерение
    timer.end();
};
```

### Добавление готовой метрики

```typescript
if (req.timing) {
    // Если у вас уже есть время выполнения
    req.timing.addSimpleMetric('cache_hit', 15, 'Время доступа к кешу');
}
```

## Пример вывода

### В консоли (development)

#### Логин (`/auth/login`)
```
⏱️  SERVER TIMING METRICS:
   total: 245ms (Total request processing time)
   auth_validate: 89ms (User credentials validation)
   auth_cookie: 2ms (Setting auth cookies)
   server: 245ms (Server processing time)
```

#### Текущий пользователь (`/auth/me`)
```
⏱️  SERVER TIMING METRICS:
   total: 15ms (Total request processing time)
   auth_check: 3ms (Authorization check)
   user_serialization: 1ms (User data serialization)
   server: 15ms (Server processing time)
```

#### Проекты команды (`/teams/:teamId/projects`)
```
⏱️  SERVER TIMING METRICS:
   total: 156ms (Total request processing time)
   team_access_check: 8ms (Team access validation)
   team_projects_db: 134ms (Database query for team projects)
   projects_serialization: 12ms (Projects data serialization)
   server: 156ms (Server processing time)
```

#### Снимок проекта (`/projects/:projectId/snapshot`)
```
⏱️  SERVER TIMING METRICS:
   total: 287ms (Total request processing time)
   snapshot_auth: 4ms (Snapshot authorization check)
   snapshot_access_check: 25ms (Project access validation)
   snapshot_db_query: 235ms (Graph snapshot database query)
   snapshot_serialization: 18ms (Snapshot data serialization)
   server: 287ms (Server processing time)
```

#### Операции синхронизации (`/projects/:projectId/ops`)
```
⏱️  SERVER TIMING METRICS:
   total: 423ms (Total request processing time)
   ops_auth: 3ms (Operations authorization check)
   ops_validation: 5ms (Operations input validation)
   ops_processing: 387ms (Operations batch processing)
   ops_response: 8ms (Operations response serialization)
   ops_count: 15ms (Number of operations in batch)
   server: 423ms (Server processing time)
```

### В заголовке HTTP
```
Server-Timing: total;dur=287;desc="Total request processing time", snapshot_auth;dur=4;desc="Snapshot authorization check", snapshot_access_check;dur=25;desc="Project access validation", snapshot_db_query;dur=235;desc="Graph snapshot database query", snapshot_serialization;dur=18;desc="Snapshot data serialization", server;dur=287;desc="Server processing time"
```

### В браузере (Developer Tools)
```
Timing:
├─ total: 287ms
├─ snapshot_auth: 4ms
├─ snapshot_access_check: 25ms
├─ snapshot_db_query: 235ms (узкое место!)
├─ snapshot_serialization: 18ms
└─ server: 287ms
```

## Лучшие практики

1. **Измеряйте критические операции**: База данных, внешние API, сложная бизнес-логика
2. **Используйте описательные имена**: `user_validation` вместо `val`
3. **Добавляйте описания**: Помогает понять что измеряется
4. **Используйте только ASCII символы в описаниях**: HTTP заголовки не поддерживают Unicode
5. **Не измеряйте всё**: Слишком много метрик = шум
6. **Группируйте связанные операции**: `db_user_create`, `db_user_update`

## Ограничения

### Кодировка символов
HTTP заголовки поддерживают только ASCII символы. Middleware автоматически удаляет non-ASCII символы из описаний для заголовков, но сохраняет их в логах консоли.

```typescript
// ✅ Правильно - ASCII символы
req.timing.addMetric('auth', 'User authentication');

// ❌ Избегайте - будет очищено в заголовках
req.timing.addMetric('auth', 'Аутентификация пользователя');
```

## Отладка производительности

### Поиск узких мест
1. Добавьте метрики в подозрительные функции
2. Сравните времена выполнения
3. Оптимизируйте самые медленные операции

### Мониторинг в production
Server Timing API работает только в development режиме по умолчанию. Для production можно:
- Использовать сторонние APM решения
- Логировать метрики в файлы
- Отправлять в системы мониторинга

## Интеграция с существующим логированием

Server Timing API интегрируется с существующей системой логирования:
- Метрики выводятся в консоль вместе с другими логами
- Используется тот же цветовой формат
- Не конфликтует с morgan и winston

## Производительность

Middleware имеет минимальный overhead:
- ~1-2ms добавочного времени
- Не влияет на основную логику
- Отключается в production для заголовков (остается только логирование)

## Интегрированные Endpoints

Следующие endpoints уже имеют детальные метрики производительности:

### `/auth/me` - Получение текущего пользователя
- `auth_check` - Проверка авторизации  
- `user_serialization` - Сериализация данных пользователя

### `/auth/login` - Авторизация пользователя  
- `auth_validate` - Валидация учетных данных
- `auth_cookie` - Установка cookies

### `/teams/:teamId/projects` - Проекты команды
- `team_access_check` - Проверка доступа к команде
- `team_projects_db` - Запрос проектов из БД
- `projects_serialization` - Сериализация данных проектов

### `/projects/:projectId/snapshot` - Снимок проекта
- `snapshot_auth` - Проверка авторизации
- `snapshot_access_check` - Проверка доступа к проекту  
- `snapshot_db_query` - Получение снимка из БД
- `snapshot_serialization` - Сериализация снимка

### `/projects/:projectId/ops` - Операции синхронизации
- `ops_auth` - Проверка авторизации
- `ops_validation` - Валидация входных данных
- `ops_processing` - Обработка операций в БД
- `ops_response` - Сериализация ответа
- `ops_count` - Количество операций в пакете

## Анализ производительности

### Типичные узкие места по endpoint:

1. **`/snapshot`** - `snapshot_db_query` (обычно 200-500ms)
   - Причина: сложные запросы к БД для получения полного снимка
   - Оптимизация: индексы, кеширование снимков

2. **`/ops`** - `ops_processing` (зависит от количества операций)
   - Причина: обработка множественных операций в транзакции
   - Оптимизация: батчинг, асинхронная обработка

3. **`/teams/:teamId/projects`** - `team_projects_db` (50-150ms)
   - Причина: JOIN запросы для получения проектов с метаданными
   - Оптимизация: денормализация, пагинация

## Интеграция с мониторингом

Для production мониторинга можно:

```typescript
// Отправка метрик в внешнюю систему
if (process.env.NODE_ENV === 'production') {
    req.timing?.metrics.forEach((metric) => {
        // Отправляем в DataDog, New Relic, etc.
        monitoringService.sendMetric(metric.name, duration);
    });
}
```

## Тестирование

Для тестирования всех интегрированных endpoints используйте файл:
```
http/server-timing-test.http
```

Он содержит готовые HTTP запросы для всех endpoints с ожидаемыми метриками и примерными временами выполнения. 