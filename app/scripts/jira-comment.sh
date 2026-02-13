#!/bin/bash

# ==== Конфигурация ====
JIRA_EMAIL="artem@goflow.space"
JIRA_API_KEY="${JIRA_API_KEY}"  # Передаётся через ENV переменную
JIRA_BASE_URL="https://goflowspace.atlassian.net"  # Замени на свой
BRANCH_NAME="${1:-feature/MVP-222-fix}"  # Можно передать имя ветки аргументом

# ==== Логика ====
echo "🔍 Используем имя ветки: $BRANCH_NAME"

ISSUE_KEY=$(echo "$BRANCH_NAME" | grep -oE '[A-Z]+-[0-9]+')

if [[ -z "$ISSUE_KEY" ]]; then
  echo "❌ Не удалось извлечь ключ задачи из имени ветки."
  exit 1
fi

COMMENT="CI-bot: ✅ Сборка для задачи $ISSUE_KEY прошла успешно"
echo "📨 Отправляем комментарий в Jira задачу: $ISSUE_KEY"
echo "💬 Текст комментария: $COMMENT"

# Формируем ADF JSON
COMMENT_JSON=$(cat <<EOF
{
  "body": {
    "type": "doc",
    "version": 1,
    "content": [
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "$COMMENT"
          }
        ]
      }
    ]
  }
}
EOF
)

# Отправляем запрос
RESPONSE=$(curl -s -w "\n📡 HTTP статус: %{http_code}\n" \
  -u "$JIRA_EMAIL:$JIRA_API_KEY" \
  -X POST \
  --data "$COMMENT_JSON" \
  -H "Content-Type: application/json" \
  "$JIRA_BASE_URL/rest/api/3/issue/$ISSUE_KEY/comment")

echo -e "\n🔽 Ответ от Jira:"
echo "$RESPONSE"
