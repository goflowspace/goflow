# API Команд - Документация

## Обзор

API команд предоставляет полный набор функций для управления командами, участниками, приглашениями и проектами команд.

## Базовый URL

```
POST /teams
GET /teams
GET /teams/{teamId}
PUT /teams/{teamId}
DELETE /teams/{teamId}
```

## Аутентификация

Все эндпоинты требуют JWT токена в заголовке Authorization:
```
Authorization: Bearer {jwt_token}
```

## Модели данных

### Team (Команда)
```typescript
interface Team {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  settings: object;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  owner: User;
  members: TeamMember[];
  invitations: TeamInvitation[];
  projects: TeamProject[];
}
```

### TeamMember (Участник команды)
```typescript
interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: Date;
  user: User;
}

enum TeamRole {
  ADMINISTRATOR = "ADMINISTRATOR", // Полный доступ
  MANAGER = "MANAGER",             // Управление участниками и проектами
  MEMBER = "MEMBER",               // Редактирование назначенных проектов
  OBSERVER = "OBSERVER"            // Только чтение
}
```

### TeamInvitation (Приглашение)
```typescript
interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  status: TeamInvitationStatus;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  invitedBy: string;
}

enum TeamInvitationStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED", 
  DECLINED = "DECLINED",
  EXPIRED = "EXPIRED"
}
```

### TeamProject (Проект команды)
```typescript
interface TeamProject {
  id: string;
  teamId: string;
  projectId: string;
  accessLevel: TeamProjectAccess;
  addedAt: Date;
  addedBy: string;
}

enum TeamProjectAccess {
  OPEN = "OPEN",           // Доступ всем участникам команды
  RESTRICTED = "RESTRICTED", // Доступ только определенным участникам
  PRIVATE = "PRIVATE"      // Доступ только администраторам и владельцу
}
```

## Эндпоинты

### Команды

#### POST /teams - Создание команды
Создает новую команду с указанными параметрами.

**Тело запроса:**
```json
{
  "name": "string (required, 1-100 chars)",
  "description": "string (optional, max 500 chars)",
  "avatar": "string (optional, valid URL)",
  "settings": "object (optional)"
}
```

**Ответ 201:**
```json
{
  "success": true,
  "data": {
    "id": "team_id",
    "name": "Команда разработки",
    "description": "Описание команды",
    "avatar": "https://example.com/avatar.jpg",
    "settings": {},
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "ownerId": "user_id",
    "owner": { "id": "user_id", "name": "Имя", "email": "email@example.com" },
    "members": []
  },
  "message": "Команда успешно создана"
}
```

#### GET /teams - Получение списка команд
Возвращает все команды пользователя (где он владелец или участник).

**Ответ 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "team_id",
      "name": "Команда разработки",
      "description": "Описание команды",
      "avatar": "https://example.com/avatar.jpg",
      "settings": {},
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "ownerId": "user_id",
      "owner": { "id": "user_id", "name": "Имя", "email": "email@example.com" },
      "members": [...],
      "_count": {
        "members": 5,
        "projects": 3
      }
    }
  ]
}
```

#### GET /teams/{teamId} - Получение команды по ID
Возвращает подробную информацию о команде.

**Параметры:**
- `teamId` - ID команды (ObjectId)

**Ответ 200:**
```json
{
  "success": true,
  "data": {
    "id": "team_id",
    "name": "Команда разработки",
    "description": "Описание команды",
    "avatar": "https://example.com/avatar.jpg",
    "settings": {},
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "ownerId": "user_id",
    "owner": { "id": "user_id", "name": "Имя", "email": "email@example.com" },
    "members": [...],
    "invitations": [...],
    "projects": [...]
  }
}
```

#### PUT /teams/{teamId} - Обновление команды
Обновляет информацию о команде. Доступно только администраторам и владельцу.

**Параметры:**
- `teamId` - ID команды (ObjectId)

**Тело запроса:**
```json
{
  "name": "string (optional, 1-100 chars)",
  "description": "string (optional, max 500 chars)",
  "avatar": "string (optional, valid URL)",
  "settings": "object (optional)"
}
```

**Ответ 200:**
```json
{
  "success": true,
  "data": { /* обновленная команда */ },
  "message": "Команда успешно обновлена"
}
```

#### DELETE /teams/{teamId} - Удаление команды
Удаляет команду. Доступно только владельцу.

**Параметры:**
- `teamId` - ID команды (ObjectId)

**Ответ 200:**
```json
{
  "success": true,
  "message": "Команда успешно удалена"
}
```

### Участники команды

#### POST /teams/{teamId}/members/invite - Приглашение участника
Отправляет приглашение пользователю по email. Доступно администраторам и менеджерам.

**Параметры:**
- `teamId` - ID команды (ObjectId)

**Тело запроса:**
```json
{
  "email": "string (required, valid email)",
  "role": "TeamRole (required: ADMINISTRATOR, MANAGER, MEMBER, OBSERVER)"
}
```

**Ответ 201:**
```json
{
  "success": true,
  "data": {
    "id": "invitation_id",
    "teamId": "team_id",
    "email": "user@example.com",
    "role": "MEMBER",
    "status": "PENDING",
    "token": "uuid-token",
    "expiresAt": "2024-01-04T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "invitedBy": "user_id",
    "team": { "id": "team_id", "name": "Команда разработки" },
    "inviter": { "id": "user_id", "name": "Имя", "email": "email@example.com" }
  },
  "message": "Приглашение отправлено"
}
```

#### PUT /teams/{teamId}/members/{memberId}/role - Изменение роли участника
Изменяет роль участника команды. Доступно только администраторам.

**Параметры:**
- `teamId` - ID команды (ObjectId)
- `memberId` - ID участника (ObjectId)

**Тело запроса:**
```json
{
  "role": "TeamRole (required: ADMINISTRATOR, MANAGER, MEMBER, OBSERVER)"
}
```

**Ответ 200:**
```json
{
  "success": true,
  "data": {
    "id": "member_id",
    "teamId": "team_id",
    "userId": "user_id",
    "role": "MANAGER",
    "joinedAt": "2024-01-01T00:00:00.000Z",
    "user": { "id": "user_id", "name": "Имя", "email": "email@example.com" }
  },
  "message": "Роль участника обновлена"
}
```

#### DELETE /teams/{teamId}/members/{memberId} - Удаление участника
Удаляет участника из команды. Права доступа зависят от ролей.

**Параметры:**
- `teamId` - ID команды (ObjectId)
- `memberId` - ID участника (ObjectId)

**Ответ 200:**
```json
{
  "success": true,
  "message": "Участник удален из команды"
}
```

### Приглашения

#### POST /teams/invitations/{token}/accept - Принятие приглашения
Принимает приглашение в команду по токену.

**Параметры:**
- `token` - Токен приглашения (UUID)

**Ответ 200:**
```json
{
  "success": true,
  "data": {
    "id": "team_id",
    "name": "Команда разработки",
    "description": "Описание команды"
  },
  "message": "Приглашение принято"
}
```

#### POST /teams/invitations/{token}/decline - Отклонение приглашения
Отклоняет приглашение в команду по токену.

**Параметры:**
- `token` - Токен приглашения (UUID)

**Ответ 200:**
```json
{
  "success": true,
  "message": "Приглашение отклонено"
}
```

### Проекты команды

#### GET /teams/{teamId}/projects - Получение проектов команды
Возвращает список проектов команды с учетом уровня доступа.

**Параметры:**
- `teamId` - ID команды (ObjectId)

**Ответ 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "team_project_id",
      "teamId": "team_id",
      "projectId": "project_id",
      "accessLevel": "OPEN",
      "addedAt": "2024-01-01T00:00:00.000Z",
      "addedBy": "user_id",
      "project": {
        "id": "project_id",
        "name": "Проект",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "creator": { "id": "user_id", "name": "Имя", "email": "email@example.com" }
      },
      "addedByUser": { "id": "user_id", "name": "Имя", "email": "email@example.com" }
    }
  ]
}
```

#### POST /teams/{teamId}/projects - Добавление проекта в команду
Добавляет проект в команду. Доступно администраторам и менеджерам.

**Параметры:**
- `teamId` - ID команды (ObjectId)

**Тело запроса:**
```json
{
  "projectId": "string (required, ObjectId)",
  "accessLevel": "TeamProjectAccess (required: OPEN, RESTRICTED, PRIVATE)"
}
```

**Ответ 201:**
```json
{
  "success": true,
  "data": { /* добавленный проект */ },
  "message": "Проект добавлен в команду"
}
```

#### PUT /teams/{teamId}/projects/{projectId}/access - Изменение доступа к проекту
Изменяет уровень доступа к проекту. Доступно администраторам и менеджерам.

**Параметры:**
- `teamId` - ID команды (ObjectId)
- `projectId` - ID проекта (ObjectId)

**Тело запроса:**
```json
{
  "accessLevel": "TeamProjectAccess (required: OPEN, RESTRICTED, PRIVATE)"
}
```

**Ответ 200:**
```json
{
  "success": true,
  "data": { /* обновленный проект */ },
  "message": "Уровень доступа к проекту обновлен"
}
```

#### DELETE /teams/{teamId}/projects/{projectId} - Удаление проекта из команды
Удаляет проект из команды. Доступно администраторам и менеджерам.

**Параметры:**
- `teamId` - ID команды (ObjectId)
- `projectId` - ID проекта (ObjectId)

**Ответ 200:**
```json
{
  "success": true,
  "message": "Проект удален из команды"
}
```

### Вспомогательные методы

#### GET /teams/{teamId}/access - Проверка доступа к команде
Проверяет, имеет ли пользователь доступ к команде.

**Параметры:**
- `teamId` - ID команды (ObjectId)

**Ответ 200:**
```json
{
  "success": true,
  "data": {
    "hasAccess": true
  }
}
```

#### GET /teams/{teamId}/role - Получение роли пользователя в команде
Возвращает роль пользователя в команде.

**Параметры:**
- `teamId` - ID команды (ObjectId)

**Ответ 200:**
```json
{
  "success": true,
  "data": {
    "id": "member_id",
    "teamId": "team_id",
    "userId": "user_id",
    "role": "MEMBER",
    "joinedAt": "2024-01-01T00:00:00.000Z",
    "team": {
      "id": "team_id",
      "ownerId": "owner_id"
    }
  }
}
```

## Коды ошибок

### 400 Bad Request
- Неверные данные в запросе
- Нарушение валидации (например, неверный email, слишком длинное название)
- Попытка пригласить уже существующего участника

### 401 Unauthorized
- Отсутствует или неверный JWT токен

### 403 Forbidden
- Недостаточно прав для выполнения операции
- Попытка изменить роль владельца команды

### 404 Not Found
- Команда не найдена
- Участник не найден
- Проект не найден
- Приглашение не найдено

### 409 Conflict
- Проект уже добавлен в команду
- Активное приглашение уже существует для этого email

## Права доступа

### Роли команды:

1. **ADMINISTRATOR** - Полный доступ:
   - Управление командой (редактирование, удаление)
   - Приглашение/удаление участников
   - Изменение ролей участников
   - Управление проектами
   - Доступ ко всем проектам

2. **MANAGER** - Управление участниками и проектами:
   - Приглашение участников
   - Удаление участников (кроме администраторов)
   - Управление проектами
   - Доступ к открытым проектам

3. **MEMBER** - Участие в проектах:
   - Редактирование назначенных проектов
   - Доступ к открытым проектам
   - Выход из команды

4. **OBSERVER** - Только чтение:
   - Просмотр информации о команде
   - Доступ к открытым проектам
   - Выход из команды

### Владелец команды:
- Имеет все права администратора
- Единственный, кто может удалить команду
- Не может быть удален из команды
- Не может изменить свою роль

## Примеры использования

### Создание команды и приглашение участников
```bash
# 1. Создать команду
curl -X POST http://localhost:3001/teams \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Команда разработки",
    "description": "Основная команда для разработки продукта"
  }'

# 2. Пригласить участника
curl -X POST http://localhost:3001/teams/{teamId}/members/invite \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "role": "MEMBER"
  }'

# 3. Добавить проект
curl -X POST http://localhost:3001/teams/{teamId}/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "{projectId}",
    "accessLevel": "OPEN"
  }'
```

### Принятие приглашения
```bash
# Принять приглашение (по токену из email)
curl -X POST http://localhost:3001/teams/invitations/{token}/accept \
  -H "Authorization: Bearer $TOKEN"
``` 