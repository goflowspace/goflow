#!/bin/bash

# Скрипт для запуска тестов AI Pipeline
# Использование: ./scripts/test-pipeline.sh [опции]

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода заголовков
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Функция для вывода успеха
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Функция для вывода ошибки
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Функция для вывода предупреждения
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Переходим в директорию backend
cd "$(dirname "$0")/.."

# Проверяем наличие Node.js и npm
if ! command -v node &> /dev/null; then
    print_error "Node.js не установлен"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm не установлен"
    exit 1
fi

# Проверяем наличие node_modules
if [ ! -d "node_modules" ]; then
    print_warning "node_modules не найден, выполняем npm install..."
    npm install
fi

# Парсим аргументы командной строки
COVERAGE=false
WATCH=false
VERBOSE=false
TEST_TYPE="all"

while [[ $# -gt 0 ]]; do
    case $1 in
        --coverage|-c)
            COVERAGE=true
            shift
            ;;
        --watch|-w)
            WATCH=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --unit|-u)
            TEST_TYPE="unit"
            shift
            ;;
        --integration|-i)
            TEST_TYPE="integration"
            shift
            ;;
        --help|-h)
            echo "Использование: $0 [опции]"
            echo ""
            echo "Опции:"
            echo "  --coverage, -c     Собрать покрытие кода"
            echo "  --watch, -w        Запустить в режиме watch"
            echo "  --verbose, -v      Подробный вывод"
            echo "  --unit, -u         Только unit тесты"
            echo "  --integration, -i  Только integration тесты"
            echo "  --help, -h         Показать эту справку"
            exit 0
            ;;
        *)
            print_error "Неизвестная опция: $1"
            exit 1
            ;;
    esac
done

# Формируем команду тестирования
TEST_CMD="npm test"
TEST_PATH="tests/modules/ai"

case $TEST_TYPE in
    "unit")
        TEST_PATH="tests/modules/ai/unit"
        print_header "Запуск Unit тестов AI Pipeline"
        ;;
    "integration")
        TEST_PATH="tests/modules/ai/integration"
        print_header "Запуск Integration тестов AI Pipeline"
        ;;
    *)
        print_header "Запуск всех тестов AI Pipeline"
        ;;
esac

# Добавляем опции
TEST_CMD="$TEST_CMD -- $TEST_PATH"

if [ "$COVERAGE" = true ]; then
    TEST_CMD="$TEST_CMD --coverage"
    print_warning "Включено покрытие кода"
fi

if [ "$WATCH" = true ]; then
    TEST_CMD="$TEST_CMD --watch"
    print_warning "Запуск в режиме watch"
fi

if [ "$VERBOSE" = true ]; then
    TEST_CMD="$TEST_CMD --verbose"
fi

# Выводим информацию о запуске
echo -e "${BLUE}Команда:${NC} $TEST_CMD"
echo ""

# Запускаем тесты
if eval $TEST_CMD; then
    print_success "Все тесты прошли успешно!"
    
    if [ "$COVERAGE" = true ]; then
        echo ""
        print_header "Отчет о покрытии"
        echo "HTML отчет: file://$(pwd)/tests/modules/ai/coverage/lcov-report/index.html"
        
        # Пытаемся открыть отчет в браузере (macOS/Linux)
        if command -v open &> /dev/null; then
            open "tests/modules/ai/coverage/lcov-report/index.html"
        elif command -v xdg-open &> /dev/null; then
            xdg-open "tests/modules/ai/coverage/lcov-report/index.html"
        fi
    fi
else
    print_error "Некоторые тесты не прошли!"
    exit 1
fi

# Дополнительные проверки если не в watch режиме
if [ "$WATCH" = false ]; then
    echo ""
    print_header "Дополнительная информация"
    
    # Проверяем размер покрытия
    if [ "$COVERAGE" = true ] && [ -f "tests/modules/ai/coverage/lcov.info" ]; then
        COVERAGE_PERCENT=$(grep -o 'lines......[0-9.]*%' tests/modules/ai/coverage/lcov.info | tail -1 | grep -o '[0-9.]*')
        if [ ! -z "$COVERAGE_PERCENT" ]; then
            if (( $(echo "$COVERAGE_PERCENT >= 80" | bc -l) )); then
                print_success "Покрытие кода: $COVERAGE_PERCENT% (цель: 80%)"
            else
                print_warning "Покрытие кода: $COVERAGE_PERCENT% (цель: 80%)"
            fi
        fi
    fi
    
    # Подсчитываем количество тестов
    TEST_FILES=$(find tests/modules/ai -name "*.test.ts" | wc -l)
    print_success "Найдено тестовых файлов: $TEST_FILES"
    
    echo ""
    echo -e "${BLUE}Для запуска отдельных групп тестов используйте:${NC}"
    echo -e "  Unit тесты:        ${YELLOW}./scripts/test-pipeline.sh --unit${NC}"
    echo -e "  Integration тесты: ${YELLOW}./scripts/test-pipeline.sh --integration${NC}"
    echo -e "  С покрытием:       ${YELLOW}./scripts/test-pipeline.sh --coverage${NC}"
    echo -e "  Watch режим:       ${YELLOW}./scripts/test-pipeline.sh --watch${NC}"
fi 