/**
 * Диагностический скрипт для проверки типов данных
 * Поможет понять, как хранятся projectId в коллекциях
 */

print("=== ДИАГНОСТИКА ТИПОВ ДАННЫХ ===");
print("Дата запуска:", new Date().toISOString());
print("");

// Проверяем несколько проектов с base-timeline
print("📊 Анализ проектов с base-timeline:");
const sampleProjects = db.projects.find({
  "data.timelines.base-timeline": { $exists: true }
}).limit(3).toArray();

sampleProjects.forEach((project, index) => {
  print(`\n${index + 1}. Проект: ${project.name}`);
  print(`   ID: ${project._id} (тип: ${typeof project._id})`);
  print(`   ID как строка: "${project._id.toString()}"`);
  
  // Проверяем есть ли снимки с разными вариантами projectId
  const snapshotsAsString = db.graph_snapshots.find({
    projectId: project._id.toString()
  }).toArray();
  
  const snapshotsAsObjectId = db.graph_snapshots.find({
    projectId: project._id
  }).toArray();
  
  print(`   Снимки (projectId как строка): ${snapshotsAsString.length}`);
  print(`   Снимки (projectId как ObjectId): ${snapshotsAsObjectId.length}`);
  
  if (snapshotsAsString.length > 0) {
    const snapshot = snapshotsAsString[0];
    print(`   Пример снимка ID: ${snapshot._id}`);
    print(`   projectId в снимке: "${snapshot.projectId}" (тип: ${typeof snapshot.projectId})`);
  }
  
  if (snapshotsAsObjectId.length > 0) {
    const snapshot = snapshotsAsObjectId[0];
    print(`   Пример снимка ID: ${snapshot._id}`);
    print(`   projectId в снимке: "${snapshot.projectId}" (тип: ${typeof snapshot.projectId})`);
  }
});

print("\n📊 Общая статистика снимков:");
const totalSnapshots = db.graph_snapshots.countDocuments();
print(`Всего снимков: ${totalSnapshots}`);

// Проверяем типы projectId в снимках
const snapshotSample = db.graph_snapshots.findOne();
if (snapshotSample) {
  print(`Пример снимка: ${snapshotSample._id}`);
  print(`projectId: "${snapshotSample.projectId}" (тип: ${typeof snapshotSample.projectId})`);
  print(`Длина projectId: ${snapshotSample.projectId ? snapshotSample.projectId.length : 'null'}`);
}

print("\n🔍 Проверка конкретного проекта из примера:");
const specificProject = db.projects.findOne({_id: ObjectId("689cab8e0d682d5e518a9bf6")});
if (specificProject) {
  print(`Проект найден: ${specificProject.name}`);
  print(`ID: ${specificProject._id}`);
  
  // Ищем снимки всеми способами
  const method1 = db.graph_snapshots.find({projectId: "689cab8e0d682d5e518a9bf6"}).toArray();
  const method2 = db.graph_snapshots.find({projectId: ObjectId("689cab8e0d682d5e518a9bf6")}).toArray();
  const method3 = db.graph_snapshots.find({projectId: specificProject._id.toString()}).toArray();
  const method4 = db.graph_snapshots.find({projectId: specificProject._id}).toArray();
  
  print(`Поиск по строке "689cab8e0d682d5e518a9bf6": ${method1.length} снимков`);
  print(`Поиск по ObjectId: ${method2.length} снимков`);
  print(`Поиск по project._id.toString(): ${method3.length} снимков`);
  print(`Поиск по project._id: ${method4.length} снимков`);
  
  // Если найдены снимки, показываем их
  if (method1.length > 0) {
    print(`Найденный снимок: ${method1[0]._id}, projectId: "${method1[0].projectId}"`);
  }
}

print("\n🔍 Поиск снимка из примера:");
const specificSnapshot = db.graph_snapshots.findOne({_id: ObjectId("689cab9c0d682d5e518a9bfd")});
if (specificSnapshot) {
  print(`Снимок найден: ${specificSnapshot._id}`);
  print(`projectId: "${specificSnapshot.projectId}" (тип: ${typeof specificSnapshot.projectId})`);
  print(`name: "${specificSnapshot.name}"`);
  print(`isActive: ${specificSnapshot.isActive}`);
} else {
  print("Снимок не найден");
}

print("\n=== ЗАВЕРШЕНИЕ ДИАГНОСТИКИ ===");
