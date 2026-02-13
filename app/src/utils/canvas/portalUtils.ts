import React from 'react';

/**
 * Утилиты для работы с порталами и диалогами, помогают определить,
 * находится ли элемент внутри портала/диалога или можно ли с ним взаимодействовать.
 */

// Расширяем интерфейс Window для TypeScript
declare global {
  interface Window {
    __FLOW_APP_DIALOG_OPEN: boolean;
  }
}

export const portalUtils = {
  // Проверяет, является ли элемент диалогом или порталом
  isDialogElement(element: HTMLElement | null): boolean {
    if (!element) return false;

    // Проверка на атрибуты Radix UI
    if (element.hasAttribute('data-radix-portal')) return true;
    if (element.hasAttribute('data-radix-dialog-content')) return true;
    if (element.getAttribute('role') === 'dialog') return true;

    // Проверка классов
    const className = element.className || '';
    return className.includes('dialog') || className.includes('overlay') || className.includes('popover');
  },

  // Ищет диалог выше в иерархии DOM
  findDialogElementInPath(element: HTMLElement | null, maxDepth = 10): boolean {
    let current = element;
    let depth = 0;

    while (current && depth < maxDepth) {
      if (this.isDialogElement(current)) return true;
      current = current.parentElement;
      depth++;
    }

    return false;
  },

  // Проверяет, открыт ли сейчас диалог
  hasOpenDialogs(): boolean {
    return !!window.__FLOW_APP_DIALOG_OPEN;
  },

  // Проверяет, исходит ли событие из портала
  isEventFromPortal(event: React.MouseEvent | React.TouchEvent | MouseEvent): boolean {
    if (!event.target) return false;

    return this.findDialogElementInPath(event.target as HTMLElement);
  },

  // Проверяет, можно ли взаимодействовать с элементом
  isInteractionAllowed(event: React.MouseEvent | React.TouchEvent | MouseEvent): boolean {
    if (this.hasOpenDialogs()) return false;
    if (this.isEventFromPortal(event)) return false;
    return true;
  }
};
