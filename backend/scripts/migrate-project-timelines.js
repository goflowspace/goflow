/**
 * Скрипт для MongoDB Compass - миграция ключей timeline в поле data проектов
 * 
 * Этот скрипт заменяет ключ "base-timeline" в поле data.timelines проектов
 * на реальные ID снимков из коллекции graph_snapshots
 * 
 * Для запуска в MongoDB Compass:
 * 1. Откройте коллекцию projects
 * 2. Перейдите на вкладку "Aggregations"
 * 3. Вставьте и выполните этот код
 */

print("=== МИГРАЦИЯ TIMELINE КЛЮЧЕЙ В ПРОЕКТАХ ===");
print("Дата запуска:", new Date().toISOString());
print("");

// Шаг 1: Находим все проекты с base-timeline в поле data
print("📊 Анализ проектов с base-timeline...");

const projectsWithBaseTimeline = db.projects.find({
  "data.timelines.base-timeline": { $exists: true }
});

const projectsArray = projectsWithBaseTimeline.toArray();
print(`Найдено проектов с base-timeline: ${projectsArray.length}`);

if (projectsArray.length === 0) {
  print("✅ Нет проектов для миграции. Завершение.");
} else {
  
  // Шаг 2: Для каждого проекта находим соответствующий снимок
  print("\n🔍 Поиск соответствующих снимков...");
  
  let projectsToMigrate = [];
  let projectsWithoutSnapshots = [];
  
  projectsArray.forEach((project, index) => {
    print(`${index + 1}. Проект: ${project._id} ("${project.name}")`);
    
    // Ищем снимки для этого проекта
    // На основе диагностики: projectId хранится как ObjectId
    const snapshots = db.graph_snapshots.find({
      projectId: project._id
    }).sort({
      createdAt: 1   // По дате создания (старые сначала)
    }).toArray();
    
    if (snapshots.length > 0) {
      const selectedSnapshot = snapshots[0]; // Берем первый (самый старый)
      projectsToMigrate.push({
        projectId: project._id,
        projectName: project.name,
        snapshotId: selectedSnapshot._id,
        snapshotName: selectedSnapshot.name || "Без названия",
        isActive: selectedSnapshot.isActive || false
      });
      print(`   ✅ Найден снимок: ${selectedSnapshot._id} ("${selectedSnapshot.name || 'Без названия'}", активный: ${selectedSnapshot.isActive || false})`);
    } else {
      projectsWithoutSnapshots.push({
        projectId: project._id,
        projectName: project.name
      });
      print(`   ❌ Снимки не найдены`);
      
      // Дополнительная диагностика
      const totalSnapshotsForProject = db.graph_snapshots.countDocuments({
        projectId: project._id
      });
      print(`      Диагностика: снимков для этого проекта: ${totalSnapshotsForProject}`);
    }
  });
  
  print(`\nПроектов готовых к миграции: ${projectsToMigrate.length}`);
  print(`Проектов без снимков: ${projectsWithoutSnapshots.length}`);
  
  if (projectsWithoutSnapshots.length > 0) {
    print("\n⚠️ ПРОЕКТЫ БЕЗ СНИМКОВ:");
    projectsWithoutSnapshots.forEach(p => {
      print(`- ${p.projectId} ("${p.projectName}")`);
    });
  }
  
  // Шаг 3: Выполняем миграцию
  print("\n🚀 НАЧИНАЕМ МИГРАЦИЮ...");
  
  let successCount = 0;
  let errorCount = 0;
  let errors = [];
  
  projectsToMigrate.forEach((migration, index) => {
    try {
      print(`${index + 1}/${projectsToMigrate.length} Мигрируем проект ${migration.projectId}...`);
      
      // Получаем текущие данные проекта
      const project = db.projects.findOne({ _id: migration.projectId });
      
      if (!project || !project.data || !project.data.timelines || !project.data.timelines['base-timeline']) {
        throw new Error("Структура данных проекта изменилась");
      }
      
      // Создаем новый объект timelines с замененным ключом
      const newTimelines = { ...project.data.timelines };
      const baseTimelineData = newTimelines['base-timeline'];
      delete newTimelines['base-timeline'];
      newTimelines[migration.snapshotId.toString()] = baseTimelineData;
      
      // Обновляем проект
      const result = db.projects.updateOne(
        { _id: migration.projectId },
        {
          $set: {
            "data.timelines": newTimelines,
            updatedAt: new Date()
          }
        }
      );
      
      if (result.modifiedCount === 1) {
        successCount++;
        print(`   ✅ Успешно: base-timeline → ${migration.snapshotId}`);
      } else {
        throw new Error("Проект не был обновлен");
      }
      
    } catch (error) {
      errorCount++;
      const errorMsg = `Проект ${migration.projectId}: ${error.message}`;
      errors.push(errorMsg);
      print(`   ❌ Ошибка: ${errorMsg}`);
    }
  });
  
  // Шаг 4: Результаты миграции
  print("\n=== РЕЗУЛЬТАТ МИГРАЦИИ ===");
  print(`Успешно мигрировано: ${successCount}/${projectsToMigrate.length}`);
  print(`Ошибок: ${errorCount}`);
  
  if (errors.length > 0) {
    print("\nОШИБКИ:");
    errors.forEach(error => print(`- ${error}`));
  }
  
  // Шаг 5: Финальная проверка
  print("\n🔍 Финальная проверка...");
  
  const remainingProjects = db.projects.countDocuments({
    "data.timelines.base-timeline": { $exists: true }
  });
  
  print(`Проектов с base-timeline осталось: ${remainingProjects}`);
  
  if (remainingProjects === 0) {
    print("🎉 Миграция завершена успешно!");
  } else {
    print("⚠️ Остались немигрированные проекты");
  }
  
  // Показываем примеры мигрированных данных
  if (successCount > 0) {
    print("\n📋 Примеры мигрированных проектов:");
    
    const migratedExamples = db.projects.find({
      _id: { $in: projectsToMigrate.slice(0, 3).map(p => p.projectId) }
    }).toArray();
    
    migratedExamples.forEach(project => {
      print(`\nПроект: ${project.name} (${project._id})`);
      if (project.data && project.data.timelines) {
        const timelineKeys = Object.keys(project.data.timelines);
        print(`Timeline ключи: ${timelineKeys.join(', ')}`);
      }
    });
  }
}

print("\n=== МИГРАЦИЯ ЗАВЕРШЕНА ===");
print("Время завершения:", new Date().toISOString());
