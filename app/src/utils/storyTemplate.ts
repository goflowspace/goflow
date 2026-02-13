import {findStartNode, getNextNodeAfterChoice, getRandomElement, groupOutgoingNodesByType} from './storyPlayer';

export const generateStoryHTML = (title: string, storyData: any, options: {isExport?: boolean} = {}) => `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${options.isExport ? '<style>[STYLES_PLACEHOLDER]</style>' : '<link href="/styles/story.css" rel="stylesheet" />'}
</head>
<body>
    <div class="rt-Container">
        <h1 class="rt-Heading">${title}</h1>
        <div id="story-container"></div>
        
        <div class="rt-Flex rt-Flex--between" style="margin-top: 24px;">
            <button onclick="goBack()" id="back-btn" class="rt-Button rt-Button--soft" disabled>
                ← Назад
            </button>
            <button onclick="restartStory()" id="restart-btn" class="rt-Button rt-Button--soft">
                ↺ Начать заново
            </button>
        </div>
    </div>

    <script>
        const storyData = ${JSON.stringify(storyData)};
        let currentState = {
            currentNodeId: null,
            history: []
        };

        // Находим первый narrative-узел для начала истории
        function findStartNode() {
            const allTargets = storyData.edges.map(e => e.target);
            const narrativeNodes = storyData.nodes.filter(n => n.type === 'narrative');
            
            const startNode = narrativeNodes.find(n => !allTargets.includes(n.id));
            return startNode ? startNode.id : (narrativeNodes.length > 0 ? narrativeNodes[0].id : null);
        }

        // Получить случайный элемент из массива
        function getRandomElement(array) {
            if (!array || array.length === 0) return null;
            
            // Проверяем, есть ли узлы с условиями
            const hasConditions = array.some(item => {
                const edge = storyData.edges.find(e => e.source === item.id);
                return edge && edge.data && edge.data.conditions && edge.data.conditions.length > 0;
            });
            
            if (hasConditions) {
                // Функция проверки условия для шаблона
                function evaluateCondition(condition) {
                    // Простая реализация для шаблона
                    if (!condition) return true;
                    // Для шаблона просто предполагаем, что условия всегда истинны
                    return true;
                }
                
                // Категоризируем узлы по приоритетам
                const narrativeWithConditions = [];
                const innerNarrativeNodes = [];
                const choiceNodes = [];
                const directNodes = [];
                
                // Фильтруем доступные узлы
                array.forEach(node => {
                    const edge = storyData.edges.find(e => e.source === node.id);
                    const hasEdgeConditions = edge && edge.data && edge.data.conditions && edge.data.conditions.length > 0;
                    
                    // Проверяем, выполняется ли условие для узла с условиями
                    if (hasEdgeConditions) {
                        const isConditionMet = evaluateCondition(edge.data.conditions);
                        // Если условие не выполняется, пропускаем узел
                        if (!isConditionMet) return;
                        
                        if (node.type === 'narrative') {
                            narrativeWithConditions.push(node);
                        } else if (node.type === 'choice') {
                            choiceNodes.push(node);
                        }
                    } else {
                        // Для узлов без условий
                        if (node.type === 'narrative') {
                            innerNarrativeNodes.push(node);
                        } else {
                            directNodes.push(node);
                        }
                    }
                });
                
                // Следуем приоритетам
                // 1. Логические пути нарратива с условиями
                if (narrativeWithConditions.length > 0) {
                    const randomIndex = Math.floor(Math.random() * narrativeWithConditions.length);
                    return narrativeWithConditions[randomIndex];
                }
                
                // 2. Условия внутри логических путей
                if (innerNarrativeNodes.length > 0) {
                    const randomIndex = Math.floor(Math.random() * innerNarrativeNodes.length);
                    return innerNarrativeNodes[randomIndex];
                }
                
                // 3. Связи в выборы
                if (choiceNodes.length > 0) {
                    const randomIndex = Math.floor(Math.random() * choiceNodes.length);
                    return choiceNodes[randomIndex];
                }
                
                // 4. Прямые связи
                if (directNodes.length > 0) {
                    return directNodes[0]; // Берем первый, а не случайный
                }
            }
            
            // Для обратной совместимости - просто случайный элемент
            return array[Math.floor(Math.random() * array.length)];
        }

        // Группировка исходящих связей по типу узла
        function groupOutgoingNodesByType(nodeId) {
            const outgoingEdges = storyData.edges.filter(e => e.source === nodeId);
            const groupedNodes = {
                narrative: [],
                choice: []
            };

            outgoingEdges.forEach(edge => {
                const targetNode = storyData.nodes.find(n => n.id === edge.target);
                if (targetNode) {
                    if (targetNode.type === 'narrative') {
                        groupedNodes.narrative.push(targetNode);
                    } else if (targetNode.type === 'choice') {
                        groupedNodes.choice.push(targetNode);
                    }
                }
            });

            return groupedNodes;
        }

        function renderNode(nodeId) {
            const container = document.getElementById('story-container');
            container.innerHTML = '';
            
            const node = storyData.nodes.find(n => n.id === nodeId);
            if (!node) return;

            if (node.type === 'narrative') {
                const card = document.createElement('div');
                card.className = 'fade-in rt-Card';
                card.style.padding = '16px';
                
                let content = '';
                if (node.data.title && node.data.title.trim() !== '') {
                    content += \`<h2 class="rt-Text rt-Text--title">\${node.data.title}</h2>\`;
                }
                content += \`<div class="rt-Text">\${node.data.text || ''}</div>\`;
                
                card.innerHTML = content;
                container.appendChild(card);

                // Добавляем варианты выбора
                const choicesContainer = document.createElement('div');
                choicesContainer.className = 'rt-Flex rt-Flex--column';
                choicesContainer.style.marginTop = '16px';

                // Группируем исходящие узлы по типу
                const groupedNodes = groupOutgoingNodesByType(nodeId);

                // Обрабатываем узлы выбора
                groupedNodes.choice.forEach(targetNode => {
                    const button = document.createElement('button');
                    button.className = 'rt-Button rt-Button--soft';
                    
                    // Проверяем, есть ли у выбора продолжение
                    const hasNextNode = storyData.edges.some(e => e.source === targetNode.id);
                    
                    if (!hasNextNode) {
                        button.innerHTML = targetNode.data.text || 'Выбор';
                        button.onclick = () => {
                            // При клике на выбор без продолжения показываем сообщение "Нет продолжения"
                            const card = document.createElement('div');
                            card.className = 'fade-in rt-Card';
                            card.style.padding = '16px';
                            card.innerHTML = '<div class="rt-Text">Нет продолжения</div>';
                            container.innerHTML = '';
                            container.appendChild(card);

                            // Обновляем историю, чтобы можно было вернуться назад
                            currentState.history.push(currentState.currentNodeId);
                            // Устанавливаем специальное значение для currentNodeId
                            currentState.currentNodeId = 'no-continuation';
                            
                            // Обновляем состояние кнопки назад
                            const backBtn = document.getElementById('back-btn');
                            backBtn.disabled = false;
                        };
                    } else {
                        button.innerHTML = targetNode.data.text || 'Выбор';
                        button.onclick = () => handleChoice(targetNode.id);
                    }
                    
                    choicesContainer.appendChild(button);
                });

                // Если есть нарративные узлы, добавляем одну кнопку "Продолжить"
                if (groupedNodes.narrative.length > 0) {
                    const button = document.createElement('button');
                    button.className = 'rt-Button rt-Button--outline';
                    button.innerHTML = 'Продолжить';
                    button.onclick = () => {
                        // Используем getRandomElement, который учитывает приоритет условий
                        const nextNode = getRandomElement(groupedNodes.narrative);
                        currentState.history.push(currentState.currentNodeId);
                        currentState.currentNodeId = nextNode.id;
                        renderNode(currentState.currentNodeId);
                    };
                    choicesContainer.appendChild(button);
                }

                container.appendChild(choicesContainer);
            } else if (node.type === 'choice') {
                // Этот код больше не должен выполняться, но оставляем на всякий случай
                // для обратной совместимости с существующими историями
                const nextEdge = storyData.edges.find(e => e.source === nodeId);
                if (nextEdge) {
                    currentState.currentNodeId = nextEdge.target;
                    renderNode(currentState.currentNodeId);
                } else {
                    // Если нет следующего узла, показываем текст выбора
                    const card = document.createElement('div');
                    card.className = 'fade-in rt-Card';
                    card.style.padding = '16px';
                    card.innerHTML = '<div class="rt-Text">Нет продолжения</div>';
                    container.appendChild(card);
                    
                    // Устанавливаем специальное значение для currentNodeId, не изменяя историю,
                    // так как это происходит автоматически при переходе к choice узлу
                    currentState.currentNodeId = 'no-continuation';
                }
            }
            
            // Обновляем состояние кнопок
            const backBtn = document.getElementById('back-btn');
            backBtn.disabled = currentState.history.length === 0;
        }

        function handleChoice(choiceId) {
            currentState.history.push(currentState.currentNodeId);
            
            // Создаем базовое состояние игры для оценки условий
            const gameState = {
                variables: {}, // Переменные будут заполнены из storyData.variables, если они есть
                visitedNodes: new Set()
            };
            
            // Заполняем переменные, если они есть
            if (storyData.variables) {
                storyData.variables.forEach(variable => {
                    gameState.variables[variable.id] = variable.value;
                });
            }
            
            // Функция для категоризации связей
            function categorizeConnections(nodeId) {
                // Находим все исходящие связи
                const edges = storyData.edges.filter(e => e.source === nodeId);
                
                // Категории связей
                const narrativeWithConditions = [];
                const innerNarrativeConnections = [];
                const choiceWithConditions = [];
                const directConnections = [];
                
                // Функция проверки условия
                function evaluateCondition(condition) {
                    // Простая реализация для шаблона
                    // В реальном коде используется полная логика из conditionEvaluator.ts
                    if (!condition) return true;
                    
                    // Для шаблона просто предполагаем, что условия всегда истинны
                    return true;
                }
                
                // Распределяем связи по категориям
                edges.forEach(edge => {
                    const targetNode = storyData.nodes.find(n => n.id === edge.target);
                    if (!targetNode) return;
                    
                    const hasConditions = edge.data && edge.data.conditions && edge.data.conditions.length > 0;
                    
                    // Проверяем условия (если они есть) перед категоризацией
                    if (hasConditions) {
                        // Проверка выполнения условия (упрощенная версия)
                        const isConditionMet = evaluateCondition(edge.data.conditions);
                        
                        // Если условие не выполняется, пропускаем эту связь
                        if (!isConditionMet) return;
                        
                        // 1. Логические пути к нарративным узлам с условиями
                        if (targetNode.type === 'narrative') {
                            narrativeWithConditions.push(edge);
                        }
                        // 3. Связи к узлам выбора с условиями
                        else if (targetNode.type === 'choice') {
                            choiceWithConditions.push(edge);
                        }
                    } else {
                        // Для связей без условий
                        // 2. Логические пути внутри нарративных узлов
                        if (targetNode.type === 'narrative') {
                            innerNarrativeConnections.push(edge);
                        }
                        // 4. Прямые связи
                        else {
                            directConnections.push(edge);
                        }
                    }
                });
                
                return {
                    narrativeWithConditions,
                    innerNarrativeConnections,
                    choiceWithConditions,
                    directConnections
                };
            }
            
            // Категоризируем связи
            const connections = categorizeConnections(choiceId);
            
            // Выбираем узел по приоритету
            let nextNodeId = null;
            
            // 1. Сначала проверяем логические пути нарратива с условиями
            if (connections.narrativeWithConditions.length > 0) {
                const randomIndex = Math.floor(Math.random() * connections.narrativeWithConditions.length);
                nextNodeId = connections.narrativeWithConditions[randomIndex].target;
            }
            // 2. Затем проверяем условия внутри логических путей
            else if (connections.innerNarrativeConnections.length > 0) {
                const randomIndex = Math.floor(Math.random() * connections.innerNarrativeConnections.length);
                nextNodeId = connections.innerNarrativeConnections[randomIndex].target;
            }
            // 3. Затем проверяем связи в выборы с условиями
            else if (connections.choiceWithConditions.length > 0) {
                const randomIndex = Math.floor(Math.random() * connections.choiceWithConditions.length);
                nextNodeId = connections.choiceWithConditions[randomIndex].target;
            }
            // 4. Наконец, проверяем прямые связи
            else if (connections.directConnections.length > 0) {
                nextNodeId = connections.directConnections[0].target; // Берем первую
            }
            
            if (nextNodeId) {
                currentState.currentNodeId = nextNodeId;
                renderNode(currentState.currentNodeId);
            } else {
                // Обработка случая, когда нет подходящего перехода
                const card = document.createElement('div');
                card.className = 'fade-in rt-Card';
                card.style.padding = '16px';
                card.innerHTML = '<div class="rt-Text">Нет продолжения</div>';
                container.innerHTML = '';
                container.appendChild(card);
                
                currentState.currentNodeId = 'no-continuation';
            }
        }

        function goBack() {
            if (currentState.history.length > 0) {
                currentState.currentNodeId = currentState.history.pop();
                renderNode(currentState.currentNodeId);
            }
        }

        function restartStory() {
            currentState = {
                currentNodeId: findStartNode(),
                history: []
            };
            renderNode(currentState.currentNodeId);
        }

        // Инициализация
        document.addEventListener('DOMContentLoaded', () => {
            currentState.currentNodeId = findStartNode();
            
            if (currentState.currentNodeId) {
                renderNode(currentState.currentNodeId);
            } else {
                document.getElementById('story-container').innerHTML = 
                    '<div class="rt-Card" style="padding: 16px;">' +
                    '<p class="rt-Text">История пуста или имеет неправильную структуру.</p></div>';
            }
        });
    </script>
</body>
</html>
`;
