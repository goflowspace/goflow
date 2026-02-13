import {useEffect} from 'react';

import {isMacOS, isModifierKeyPressed, isZoomModifierKey} from '../utils/keyboardModifiers';

/**
 * Проверяет, нажата ли комбинация Shift+0
 * Учитывает разные варианты ввода (включая преобразования символа ")" при зажатом Shift)
 */
function isShiftZero(e: KeyboardEvent): boolean {
  return e.shiftKey && !e.ctrlKey && !e.metaKey && (e.key === '0' || e.key === 'NumPad0' || e.key === ')' || e.code === 'Digit0' || e.code === 'Numpad0');
}

/**
 * Проверяет, нажата ли комбинация Shift+1
 * Учитывает разные варианты ввода (включая преобразования символа "!" при зажатом Shift)
 */
function isShiftOne(e: KeyboardEvent): boolean {
  return e.shiftKey && !e.ctrlKey && !e.metaKey && (e.key === '1' || e.key === 'NumPad1' || e.key === '!' || e.code === 'Digit1' || e.code === 'Numpad1');
}

/**
 * Интерфейс для горячей клавиши, которую нужно блокировать
 */
interface BlockedShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  allowInInput?: boolean; // разрешить в полях ввода
}

/**
 * Хук для блокировки браузерных горячих клавиш,
 * которые конфликтуют с горячими клавишами редактора
 */
export function useBrowserHotkeysBlocker() {
  useEffect(() => {
    // Специфичные для блокировки горячие клавиши
    const keysToBlock: Record<string, boolean> = {
      // Цифровые клавиши с Ctrl/Cmd
      '1': true,
      '2': true,
      '3': true,
      '4': true,
      '5': true,
      '6': true,
      '7': true,
      '8': true,
      '9': true,
      '0': true,

      // Клавиши навигации и действий
      f: true,
      u: true,
      s: true,

      // Клавиши масштабирования
      '+': true,
      '=': true,
      '-': true,

      // Клавиши для работы с закладками (в некоторых браузерах)
      t: true,
      w: true,
      r: true
    };

    /**
     * Проверяет, открыт ли диалог создания узлов
     * @returns {boolean} true, если диалог открыт
     */
    const isNewObjDialogOpen = (): boolean => {
      // Проверяем наличие элемента диалога создания узлов в DOM по data-testid
      const dialogElementById = document.querySelector('[data-testid="new-obj-dialog"]');
      if (dialogElementById) {
        return true;
      }

      // Проверяем наличие элемента диалога создания узлов в DOM по его классу
      const dialogElement = document.querySelector('div[class*="NewObjDialog_menu"]');
      if (dialogElement) {
        return true;
      }

      return false;
    };

    /**
     * Обработчик клавиатурных событий, который блокирует браузерные хоткеи
     */
    const blockBrowserShortcuts = (e: KeyboardEvent) => {
      // Не блокируем Shift+0 и Shift+1 для управления масштабом
      if (isShiftZero(e) || isShiftOne(e)) {
        return;
      }

      // Не блокируем Cmd/Ctrl+ и Cmd/Ctrl- для увеличения/уменьшения масштаба
      if (isZoomModifierKey(e)) {
        return;
      }

      // Проверяем, находимся ли в поле ввода
      const isInInputField = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target instanceof HTMLElement && e.target.isContentEditable);

      // Получаем нажатую клавишу в нижнем регистре
      const key = e.key.toLowerCase();

      // Определяем специальные случаи для форматирования текста
      const isFormattingKey = ['b', 'i', 'u'].includes(key) && (e.ctrlKey || e.metaKey);

      // Определяем специальные случаи для копирования/вставки/дублирования
      const isCopyPasteKey = ['c', 'v', 'x', 'a', 'd'].includes(key) && (e.ctrlKey || e.metaKey);

      // Проверяем, открыт ли диалог создания узлов и является ли это хоткеем для него
      const isDialogOpen = isNewObjDialogOpen();
      const isNewObjDialogHotkey = ['1', '2', '3', '4'].includes(key) && isModifierKeyPressed(e) && isDialogOpen;

      // Если это хоткей для диалога создания узлов, не блокируем его
      if (isNewObjDialogHotkey) {
        return;
      }

      // Если нажата модификаторная клавиша и клавиша есть в списке блокируемых
      if (isModifierKeyPressed(e) && keysToBlock[key]) {
        // Разрешаем форматирование текста в полях ввода
        if (isInInputField && isFormattingKey) {
          return;
        }

        // Разрешаем копирование/вставку/дублирование в любом случае
        if (isCopyPasteKey) {
          return;
        }

        // Специальное исключение для Cmd+F/Ctrl+F (вызов поиска)
        if (key === 'f' && !isInInputField) {
          // Не блокируем эту комбинацию, она будет обработана в useSearchHotkeys
          return;
        }

        // Специальное исключение для Cmd+R/Ctrl+R (AI Fill)
        if (key === 'r') {
          // Не блокируем эту комбинацию, она будет обработана в useGlobalHotkeys
          return;
        }

        // Во всех остальных случаях - блокируем
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Блокируем Ctrl+Tab и Ctrl+Shift+Tab (переключение вкладок)
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Блокируем Alt+Left/Right (навигация браузера назад/вперед)
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Для macOS: блокируем Cmd+[ и Cmd+] (навигация браузера назад/вперед)
      if (isMacOS() && e.metaKey && (e.key === '[' || e.key === ']')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Блокируем F6 (фокус на адресную строку в некоторых браузерах)
      if (e.key === 'F6') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Создаем еще один специфичный обработчик для Ctrl+D, который часто не блокируется
    const blockCtrlD = (e: KeyboardEvent) => {
      // Проверяем все возможные варианты Ctrl+D/Cmd+D
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'd' ||
          e.key === 'D' ||
          e.key === 'д' ||
          e.key === 'Д' || // Русская раскладка
          e.code === 'KeyD')
      ) {
        // Проверяем, находимся ли мы в поле ввода
        const isInInputField = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target instanceof HTMLElement && e.target.isContentEditable);

        // В полях ввода сохраняем стандартное поведение
        if (isInInputField) {
          return;
        }

        e.preventDefault();
      }
    };

    // Добавим специальную функцию для предотвращения действия браузера по умолчанию
    const beforeInput = (e: Event) => {
      // Отменяем действие браузера по умолчанию при нажатии Ctrl+D/Cmd+D
      if (e instanceof KeyboardEvent && isModifierKeyPressed(e) && (e.key === 'd' || e.key === 'D' || e.code === 'KeyD')) {
        const isInInputField = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target instanceof HTMLElement && e.target.isContentEditable);

        // В полях ввода сохраняем стандартное поведение
        if (isInInputField) {
          return;
        }

        // Вне полей ввода только предотвращаем действие браузера
        e.preventDefault();
      }
    };

    // Добавим прямую модификацию прототипа для перехвата нажатия клавиш на самом низком уровне
    // Сохраним оригинальные функции
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalKeyDown = document.onkeydown;

    // Переопределяем стандартные методы для перехвата нажатия Ctrl+D
    document.onkeydown = function (e) {
      if (isModifierKeyPressed(e) && (e.key === 'd' || e.key === 'D' || e.code === 'KeyD')) {
        const isInInputField = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target instanceof HTMLElement && e.target.isContentEditable);

        // В полях ввода сохраняем стандартное поведение
        if (isInInputField) {
          // Вызываем оригинальный обработчик, если он существует
          return originalKeyDown?.apply(this, [e]);
        }

        // Вне полей ввода только предотвращаем действие браузера
        e.preventDefault();
      }

      // Вызываем оригинальный обработчик, если он существует
      return originalKeyDown?.apply(this, [e]);
    };

    // Создаем обработчики для цифровых клавиш с Ctrl/Cmd (переключение вкладок)
    const blockTabShortcuts = (e: KeyboardEvent) => {
      const modifier = isMacOS() ? e.metaKey : e.ctrlKey;
      const key = e.key;

      // Не блокируем Shift+0 и Shift+1 для управления масштабом
      if (isShiftZero(e) || isShiftOne(e)) {
        return;
      }

      // Не блокируем Cmd/Ctrl+ и Cmd/Ctrl- для увеличения/уменьшения масштаба
      if (isZoomModifierKey(e)) {
        return;
      }

      // Проверяем, не является ли это хоткеем для диалога создания узлов
      const isDialogOpen = isNewObjDialogOpen();
      const isNewObjDialogHotkey = ['1', '2', '3', '4'].includes(key) && modifier && isDialogOpen;

      // Если это хоткей для диалога создания узлов, не блокируем его
      if (isNewObjDialogHotkey) {
        return;
      }

      if (modifier && key >= '1' && key <= '9') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Добавляем обработчики событий с высоким приоритетом
    // capture: true гарантирует, что наш обработчик получит событие до других
    // passive: false позволяет вызывать preventDefault()
    const options = {capture: true, passive: false};

    // Добавляем обработчики для всех фаз события в порядке приоритета
    // Проверки для хоткеев масштабирования должны иметь самый высокий приоритет
    document.addEventListener('keydown', blockTabShortcuts, options);
    document.addEventListener('keydown', blockBrowserShortcuts, options);
    document.addEventListener('keydown', blockCtrlD, options);

    // Добавляем обработчики для фазы захвата
    document.addEventListener('keydown', blockCtrlD, true);

    // Добавляем обработчики перед вводом
    document.addEventListener('beforeinput', beforeInput, true);

    // Также перехватываем события на уровне окна для надежности
    window.addEventListener('keydown', blockTabShortcuts, options);
    window.addEventListener('keydown', blockBrowserShortcuts, options);
    window.addEventListener('keydown', blockCtrlD, options);
    window.addEventListener('beforeinput', beforeInput, true);

    // Добавляем еще один уровень защиты, перехватывая события на document.body
    if (document.body) {
      document.body.addEventListener('keydown', blockTabShortcuts, options);
      document.body.addEventListener('keydown', blockBrowserShortcuts, options);
      document.body.addEventListener('keydown', blockCtrlD, options);
      document.body.addEventListener('beforeinput', beforeInput, true);
    }

    return () => {
      // Восстанавливаем оригинальные методы
      document.onkeydown = originalKeyDown;

      // Удаляем все обработчики при размонтировании
      document.removeEventListener('keydown', blockTabShortcuts, options);
      document.removeEventListener('keydown', blockBrowserShortcuts, options);
      document.removeEventListener('keydown', blockCtrlD, options);
      document.removeEventListener('keydown', blockCtrlD, true);
      document.removeEventListener('beforeinput', beforeInput, true);

      window.removeEventListener('keydown', blockTabShortcuts, options);
      window.removeEventListener('keydown', blockBrowserShortcuts, options);
      window.removeEventListener('keydown', blockCtrlD, options);
      window.removeEventListener('beforeinput', beforeInput, true);

      if (document.body) {
        document.body.removeEventListener('keydown', blockTabShortcuts, options);
        document.body.removeEventListener('keydown', blockBrowserShortcuts, options);
        document.body.removeEventListener('keydown', blockCtrlD, options);
        document.body.removeEventListener('beforeinput', beforeInput, true);
      }
    };
  }, []);
}
