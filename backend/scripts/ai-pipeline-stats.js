// MongoDB Compass агрегационный скрипт для анализа статистики токенов в ai_pipeline_step_executions
// Этот скрипт вычисляет min, avg, max по inputTokens и outputTokens, группируя по stepId

db.ai_pipeline_step_executions.aggregate([
  {
    $match: {
      // Фильтруем только записи с валидными значениями токенов
      inputTokens: { $exists: true, $type: "number", $gte: 0 },
      outputTokens: { $exists: true, $type: "number", $gte: 0 }
    }
  },
  {
    $group: {
      _id: "$stepId",
      // Статистика по inputTokens
      minInputTokens: { $min: "$inputTokens" },
      avgInputTokens: { $avg: "$inputTokens" },
      maxInputTokens: { $max: "$inputTokens" },
      
      // Статистика по outputTokens
      minOutputTokens: { $min: "$outputTokens" },
      avgOutputTokens: { $avg: "$outputTokens" },
      maxOutputTokens: { $max: "$outputTokens" },
      
      // Дополнительная информация
      totalExecutions: { $sum: 1 },
      totalInputTokens: { $sum: "$inputTokens" },
      totalOutputTokens: { $sum: "$outputTokens" }
    }
  },
  {
    $project: {
      stepId: "$_id",
      _id: 0,
      
      // Статистика по inputTokens
      minInputTokens: "$minInputTokens",
      avgInputTokens: { $round: ["$avgInputTokens", 2] },
      maxInputTokens: "$maxInputTokens",
      
      // Статистика по outputTokens
      minOutputTokens: "$minOutputTokens",
      avgOutputTokens: { $round: ["$avgOutputTokens", 2] },
      maxOutputTokens: "$maxOutputTokens",
      
      // Общая статистика
      executionCount: "$totalExecutions",
      totalInputTokens: "$totalInputTokens",
      totalOutputTokens: "$totalOutputTokens",
      totalTokens: { $add: ["$totalInputTokens", "$totalOutputTokens"] }
    }
  },
  {
    $sort: {
      stepId: 1  // Сортируем по stepId в алфавитном порядке
    }
  }
]);
