import React from 'react';

import {render} from '@testing-library/react';

import {useProjectStore} from '@store/useProjectStore';

import {importStoryFromJsonData} from '../../utils/importStoryFromJsonData';
import WelcomeStoryInitializer from '../WelcomeStoryInitializer';

// Мокаем модули
jest.mock('@store/useProjectStore', () => ({
  useProjectStore: jest.fn()
}));

jest.mock('../../utils/importStoryFromJsonData', () => ({
  importStoryFromJsonData: jest.fn()
}));

describe('WelcomeStoryInitializer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not call addWelcomeStory when welcome modal is shown', () => {
    // Мокаем состояние: модальное окно отображается
    (useProjectStore as unknown as jest.Mock).mockReturnValue({
      showWelcomeModal: true,
      includeWelcomeStory: true
    });

    // Рендерим компонент
    render(<WelcomeStoryInitializer />);

    // Проверяем, что addWelcomeStory не вызывалась
    expect(importStoryFromJsonData).not.toHaveBeenCalled();
  });

  it('should not call addWelcomeStory when includeWelcomeStory is false', () => {
    // Мокаем состояние: модальное окно закрыто, но флаг включения истории выключен
    (useProjectStore as unknown as jest.Mock).mockReturnValue({
      showWelcomeModal: false,
      includeWelcomeStory: false
    });

    // Рендерим компонент
    render(<WelcomeStoryInitializer />);

    // Проверяем, что addWelcomeStory не вызывалась
    expect(importStoryFromJsonData).not.toHaveBeenCalled();
  });

  it('should call addWelcomeStory when welcome modal is closed and includeWelcomeStory is true', () => {
    // Мокаем состояние: модальное окно закрыто и флаг включения истории включен
    (useProjectStore as unknown as jest.Mock).mockReturnValue({
      showWelcomeModal: false,
      includeWelcomeStory: true
    });

    // Рендерим компонент
    render(<WelcomeStoryInitializer />);

    // Проверяем, что addWelcomeStory была вызвана
    expect(importStoryFromJsonData).toHaveBeenCalled();
  });

  it('should call addWelcomeStory when modal status changes from shown to hidden', () => {
    // Мокаем изначальное состояние: модальное окно отображается
    (useProjectStore as unknown as jest.Mock).mockReturnValue({
      showWelcomeModal: true,
      includeWelcomeStory: true
    });

    // Рендерим компонент
    const {rerender} = render(<WelcomeStoryInitializer />);

    // Проверяем, что функция не вызывалась
    expect(importStoryFromJsonData).not.toHaveBeenCalled();

    // Меняем состояние: модальное окно закрывается
    (useProjectStore as unknown as jest.Mock).mockReturnValue({
      showWelcomeModal: false,
      includeWelcomeStory: true
    });

    // Перерендериваем компонент с новым состоянием
    rerender(<WelcomeStoryInitializer />);

    // Проверяем, что addWelcomeStory была вызвана
    expect(importStoryFromJsonData).toHaveBeenCalled();
  });

  it('should not render any UI elements', () => {
    // Мокаем состояние
    (useProjectStore as unknown as jest.Mock).mockReturnValue({
      showWelcomeModal: false,
      includeWelcomeStory: false
    });

    // Рендерим компонент
    const {container} = render(<WelcomeStoryInitializer />);

    // Проверяем, что компонент не рендерит никаких UI элементов
    expect(container.firstChild).toBeNull();
  });
});
