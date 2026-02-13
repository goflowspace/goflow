# Frontend интеграция с GCS изображениями

## Обзор

Новая система работы с изображениями на frontend поддерживает гибридный подход:
- **Thumbnail изображения**: через proxy с агрессивным кэшированием
- **Большие изображения**: через signed URLs с batch loading
- **Обратная совместимость**: поддержка старых base64 MediaValue

## Компоненты

### 1. `GCSImage` - универсальный компонент отображения

```tsx
import { GCSImage, GCSThumbnail } from '@components/common/GCSImage/GCSImage';

// Базовое использование
<GCSImage
  mediaValue={entity.imageUrl}
  entityId={entity.id}
  parameterId="entity-avatar"
  version="thumbnail"
  alt={entity.name}
  fallback={<div>👤</div>}
/>

// Упрощенная версия для thumbnail
<GCSThumbnail
  mediaValue={entity.imageUrl}
  entityId={entity.id}
  parameterId="entity-avatar"
  alt={entity.name}
/>
```

**Пропсы:**
- `mediaValue`: GCS MediaValue объект
- `entityId`: ID сущности  
- `parameterId`: ID параметра
- `version`: `'thumbnail' | 'optimized' | 'original'`
- `lazy`: автоматический lazy loading (по умолчанию `true`)
- `fallback`: компонент для отображения при ошибке

### 2. `ImageUploaderGCS` - загрузка в GCS

```tsx
import { ImageUploaderGCS, useEntityImage } from '@components/common/ImageUploaderGCS/ImageUploaderGCS';

const MyComponent = ({ entityId }) => {
  const { mediaValue, handleUpload, handleError } = useEntityImage(
    entityId,
    'entity-avatar'
  );

  return (
    <ImageUploaderGCS
      entityId={entityId}
      parameterId="entity-avatar"
      onImageUploaded={handleUpload}
      onError={handleError}
      currentMediaValue={mediaValue}
      allowClear={true}
    />
  );
};
```

### 3. `EntityListGCS` - оптимизированный список

```tsx
import { EntityListGCS } from '@components/Dashboard/Entities/EntityListGCS/EntityListGCS';

<EntityListGCS
  entities={entities}
  parameters={parameters}
  onEditEntity={handleEdit}
  onDeleteEntity={handleDelete}
  viewMode="grid"
/>
```

**Особенности:**
- Автоматический batch loading thumbnail изображений
- Fallback для изображений с ошибками
- Поддержка всех режимов просмотра

### 4. `StorageUsage` - статистика хранилища

```tsx
import { StorageUsage } from '@components/Dashboard/StorageUsage/StorageUsage';

<StorageUsage 
  showDetails={true}
  className="my-storage-widget"
/>
```

## Хуки

### 1. `useEntityImagesBatch` - batch loading

```tsx
import { useEntityImagesBatch } from '@hooks/useEntityImagesBatch';

const MyListComponent = ({ entities }) => {
  const { 
    getThumbnailUrl, 
    loading, 
    error,
    preloadImages 
  } = useEntityImagesBatch(entities, ['thumbnail']);

  // Получение URL для конкретной сущности
  const thumbnailUrl = getThumbnailUrl(entity.id);
  
  // Предзагрузка изображений при hover
  const handleMouseEnter = () => {
    preloadImages([entity.id], 'optimized');
  };
  
  return (
    <div onMouseEnter={handleMouseEnter}>
      {thumbnailUrl && <img src={thumbnailUrl} alt="" />}
    </div>
  );
};
```

### 2. `useEntityImage` - управление изображением

```tsx
import { useEntityImage } from '@components/common/ImageUploaderGCS/ImageUploaderGCS';

const { 
  mediaValue, 
  isUploading, 
  setMediaValue,
  handleUpload, 
  handleError 
} = useEntityImage(entityId, parameterId, initialMediaValue);
```

## Сервисы

### 1. `imageGCSService` - основной сервис

```tsx
import { imageGCSService } from '@services/imageGCS.service';

// Загрузка изображения
const mediaValue = await imageGCSService.uploadImage({
  teamId: 'team_xxx',
  projectId: 'project_xxx',
  entityId: 'entity_xxx', 
  parameterId: 'param_xxx',
  imageData: base64String,
  filename: 'image.jpg'
});

// Получение signed URL
const url = await imageGCSService.getSignedUrl(
  teamId, projectId, entityId, parameterId, 'optimized'
);

// Batch доступ
const urlsMap = await imageGCSService.getBatchAccess(
  teamId, projectId, ['entity1', 'entity2'], ['thumbnail']
);

// Статистика
const stats = await imageGCSService.getStorageUsage(teamId);
```

### 2. Утилиты совместимости

```tsx
import { 
  isGCSMediaValue, 
  isBase64MediaValue, 
  getThumbnailUrl,
  hasEntityImage 
} from '@utils/imageAdapterUtils';

// Проверка типа MediaValue
if (isGCSMediaValue(mediaValue)) {
  // Обработка GCS изображения
} else if (isBase64MediaValue(mediaValue)) {
  // Обработка старого base64 формата
}

// Универсальное получение thumbnail URL
const thumbnailUrl = getThumbnailUrl(
  mediaValue, teamId, projectId, entityId, parameterId
);
```

## API интеграция

### Обновленные методы в `api.ts`:

```tsx
// Загрузка в GCS
api.uploadImageGCS({
  teamId, projectId, entityId, parameterId,
  imageData: 'data:image/jpeg;base64,...',
  filename: 'image.jpg'
})

// Получение signed URLs
api.getImageSignedUrls({
  teamId, projectId,
  imageIds: [{ entityId, parameterId, version: 'optimized' }]
})

// Batch доступ
api.getBatchImageAccess({
  teamId, projectId,
  entityIds: ['entity1', 'entity2'],
  types: ['thumbnail', 'optimized']
})

// Удаление
api.deleteImageGCS(teamId, projectId, entityId, parameterId)

// Статистика
api.getStorageUsage(teamId)

// Thumbnail proxy URL
api.getThumbnailProxyUrl(teamId, projectId, entityId, parameterId)
```

## Стратегии производительности

### 1. Кэширование
- **Browser Cache**: HTTP кэш для proxy thumbnail URLs (1 час)
- **Memory Cache**: signed URLs кэшируются в памяти (20 часов)
- **Auto cleanup**: устаревшие URLs очищаются автоматически

### 2. Lazy Loading
- Thumbnail изображения загружаются по мере появления в viewport
- Intersection Observer API для эффективного отслеживания
- Предзагрузка при hover для лучшего UX

### 3. Batch Loading
- Один API запрос для всех thumbnail списка сущностей
- Параллельная загрузка множественных signed URLs
- Умное кэширование для минимизации повторных запросов

## Миграция с старой системы

### 1. Обновление типов MediaValue
```tsx
// Старый формат (base64)
interface OldMediaValue {
  original: { dataUrl: string; };
  thumbnail: { dataUrl: string; };
}

// Новый формат (GCS)  
interface NewMediaValue {
  storage: 'gcs';
  original: { gcsPath: string; };
  optimized: { gcsPath: string; }; // НОВОЕ!
  thumbnail: { gcsPath: string; };
}
```

### 2. Обновление компонентов

**Было:**
```tsx
<img src={mediaValue.thumbnail?.dataUrl} alt="thumbnail" />
```

**Стало:**
```tsx
<GCSImage 
  mediaValue={mediaValue}
  entityId={entityId}
  parameterId={parameterId}
  version="thumbnail"
  alt="thumbnail"
/>
```

### 3. Batch loading списков

**Было:**
```tsx
// Каждое изображение загружалось отдельно как base64
entities.map(entity => 
  <img src={entity.imageUrl?.thumbnail?.dataUrl} />
)
```

**Стало:**
```tsx
// Один batch запрос для всех изображений
const { getThumbnailUrl } = useEntityImagesBatch(entities);

entities.map(entity => {
  const url = getThumbnailUrl(entity.id);
  return <img src={url} />;
})
```

## Тестирование

### 1. Unit тесты
- Тесты для imageGCSService
- Тесты для утилит совместимости
- Тесты компонентов с мок API

### 2. Integration тесты
- E2E тест загрузки изображения
- Тест batch loading списка сущностей
- Тест fallback при ошибках

### 3. Performance тесты
- Замеры времени загрузки списков
- Тест кэширования URLs
- Memory leak тесты для долгих сессий

## Безопасность

- Все запросы изображений проходят через аутентифицированный API
- Signed URLs имеют ограниченное время жизни
- Проверка доступа к проекту для каждого изображения
- Автоматическая очистка кэша при смене проекта/команды

## Мониторинг

- Console логи для debug режима
- Отслеживание ошибок загрузки изображений  
- Аналитика использования storage (по командам)
- Performance метрики через User Timing API

---

## Быстрый старт

1. **Замените старые компоненты на новые:**
   ```tsx
   EntityList → EntityListGCS
   ImageUploader → ImageUploaderGCS  
   ```

2. **Добавьте статистику хранилища:**
   ```tsx
   <StorageUsage showDetails={true} />
   ```

3. **Используйте batch loading в списках:**
   ```tsx
   const { getThumbnailUrl } = useEntityImagesBatch(entities);
   ```

4. **Обновите обработчики изображений:**
   ```tsx
   const { handleUpload } = useEntityImage(entityId, parameterId);
   ```
