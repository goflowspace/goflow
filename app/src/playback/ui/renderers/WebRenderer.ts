/**
 * Веб-реализация рендерера истории
 * Отображает историю в браузере
 */
import {Choice, Node} from '@types-folder/nodes';

import {StoryEngine} from '../../engine/interfaces/StoryEngine';
import {StoryRenderer} from '../../engine/interfaces/StoryRenderer';

export class WebRenderer implements StoryRenderer {
  private container: HTMLElement;
  private navigationContainer: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupNavigationContainer();
  }

  /**
   * Создает контейнер для навигационных кнопок
   */
  private setupNavigationContainer(): void {
    // Создаем контейнер для кнопок навигации, если его еще нет
    if (!this.navigationContainer) {
      this.navigationContainer = document.createElement('div');
      this.navigationContainer.className = 'navigation-container';

      // Создаем кнопки
      const backButton = document.createElement('button');
      backButton.id = 'back-btn';
      backButton.textContent = '← Назад';
      backButton.className = 'rt-Button rt-Button--soft';
      backButton.disabled = true;

      const restartButton = document.createElement('button');
      restartButton.id = 'restart-btn';
      restartButton.textContent = '↺ Начать заново';
      restartButton.className = 'rt-Button rt-Button--soft';

      // Добавляем кнопки в навигационный контейнер
      this.navigationContainer.appendChild(backButton);
      this.navigationContainer.appendChild(restartButton);

      // Добавляем навигационный контейнер после основного контейнера истории
      this.container.parentNode?.insertBefore(this.navigationContainer, this.container.nextSibling);
    }
  }

  /**
   * Отображает узел
   */
  renderNode(node: Node, engine: StoryEngine): void {
    // Очищаем контейнер
    this.container.innerHTML = '';

    // Создаем карточку для узла
    const card = document.createElement('div');
    card.className = 'fade-in rt-Card';
    card.style.padding = '16px';

    // Заполняем содержимое карточки в зависимости от типа узла
    if (node.type === 'narrative') {
      let content = '';

      // Добавляем заголовок, если он есть
      if (node.data.title && node.data.title.trim() !== '') {
        content += `<h2 class="rt-Text rt-Text--title">${node.data.title}</h2>`;
      }

      // Добавляем текст
      content += `<div class="rt-Text">${node.data.text || ''}</div>`;

      card.innerHTML = content;

      // Добавляем карточку в контейнер
      this.container.appendChild(card);

      // Получаем доступные выборы для текущего узла
      const choices = engine.getAvailableChoices(node.id);

      // Если есть выборы, отображаем их
      if (choices.length > 0) {
        this.renderChoices(choices, engine);
      } else {
        // Если нет выборов, но есть следующий узел, добавляем кнопку "Продолжить"
        const nextNode = engine.getNextNode(node.id);
        if (nextNode) {
          const continueButton = document.createElement('button');
          continueButton.className = 'rt-Button rt-Button--outline';
          continueButton.textContent = 'Продолжить';
          continueButton.onclick = () => {
            const newNode = engine.getNextNode(node.id);
            if (newNode) {
              this.renderNode(newNode, engine);
            }
          };

          // Создаем контейнер для кнопки
          const buttonsContainer = document.createElement('div');
          buttonsContainer.className = 'rt-Flex rt-Flex--column';
          buttonsContainer.style.marginTop = '16px';
          buttonsContainer.appendChild(continueButton);

          this.container.appendChild(buttonsContainer);
        }
      }

      // Обновляем состояние кнопок навигации
      this.updateNavigation(engine.getState().history.length > 0);
    } else if (node.type === 'choice') {
      // Для узлов выбора просто показываем текст
      card.innerHTML = `<div class="rt-Text">${node.data.text || 'Выбор'}</div>`;
      this.container.appendChild(card);

      // Переходим к следующему узлу, если он есть
      const nextNode = engine.getNextNode(node.id);
      if (nextNode) {
        this.renderNode(nextNode, engine);
      } else {
        this.renderMessage('Нет продолжения');
      }
    }
  }

  /**
   * Отображает варианты выбора
   */
  renderChoices(choices: Choice[], engine: StoryEngine): void {
    // Создаем контейнер для вариантов выбора
    const choicesContainer = document.createElement('div');
    choicesContainer.className = 'rt-Flex rt-Flex--column';
    choicesContainer.style.marginTop = '16px';

    // Добавляем кнопки для каждого варианта выбора
    choices.forEach((choice) => {
      const button = document.createElement('button');
      button.className = 'rt-Button rt-Button--soft';
      button.textContent = choice.text;
      button.style.marginBottom = '8px';
      button.style.wordWrap = 'break-word';
      button.style.whiteSpace = 'normal';
      button.style.textAlign = 'left';
      button.style.height = 'auto';
      button.style.padding = '12px 16px';
      button.style.width = '100%';
      button.style.lineHeight = '1.4';

      // Обработчик клика на кнопку выбора
      button.onclick = () => {
        if (choice.hasNextNode) {
          // Переходим к следующему узлу через выбор
          const nextNode = engine.executeChoice(choice.id);
          if (nextNode) {
            this.renderNode(nextNode, engine);
          }
        } else {
          // Если у выбора нет продолжения, показываем сообщение
          this.renderMessage('Нет продолжения');
        }
      };

      choicesContainer.appendChild(button);
    });

    // Добавляем контейнер с вариантами выбора
    this.container.appendChild(choicesContainer);
  }

  /**
   * Отображает сообщение
   */
  renderMessage(message: string): void {
    // Очищаем контейнер
    this.container.innerHTML = '';

    // Создаем карточку с сообщением
    const card = document.createElement('div');
    card.className = 'fade-in rt-Card';
    card.style.padding = '16px';
    card.innerHTML = `<div class="rt-Text">${message}</div>`;

    // Добавляем карточку в контейнер
    this.container.appendChild(card);
  }

  /**
   * Обновляет состояние кнопок навигации
   */
  updateNavigation(canGoBack: boolean): void {
    if (this.navigationContainer) {
      // Находим кнопки в навигационном контейнере
      const backBtn = this.navigationContainer.querySelector('#back-btn') as HTMLButtonElement;
      const restartBtn = this.navigationContainer.querySelector('#restart-btn') as HTMLButtonElement;

      if (backBtn) {
        // Обновляем состояние кнопки "Назад"
        backBtn.disabled = !canGoBack;
      }
    }
  }
}
