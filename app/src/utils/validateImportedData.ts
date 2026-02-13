/**
 * Валидация структуры импортированного JSON
 * Проверяет, содержит ли импортированный JSON данные в правильном формате
 * Поддерживает как новый формат с таймлайнами, так и старый формат
 */
export const validateImportedData = (data: any): boolean => {
  // Проверяем наличие заголовка
  const hasTitle = !!data.title;

  // Проверяем, есть ли новый формат с таймлайнами
  const hasTimelines = !!data.data?.timelines;
  if (!hasTimelines) {
    console.error('Invalid data format. Make sure this is a Go Flow JSON export file');
    return false;
  }

  // Проверяем есть ли хотя бы один таймлайн
  const timelineKeys = Object.keys(data.data.timelines || {});
  if (timelineKeys.length === 0) return false;

  // Берем первый таймлайн (пока поддерживается только один)
  const firstTimelineKey = timelineKeys[0];
  const timelineData = data.data.timelines[firstTimelineKey];

  // Проверяем наличие слоев в таймлайне
  const hasLayers = !!timelineData?.layers;
  // Проверяем наличие корневого слоя
  const hasRootLayer = !!(timelineData?.layers && timelineData.layers.root);

  // Базовая валидация для нового формата
  return hasTitle && hasLayers && hasRootLayer;
};
