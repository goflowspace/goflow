import React from 'react';

import {fireEvent, render, screen} from '@testing-library/react';

import {EditableContent, EditableTitle, StaticContent, StaticTitle} from '../NodeContent';
import * as utils from '../utils';

// Мокаем модуль утилит
jest.mock('../utils', () => ({
  getTextLinesCount: jest.fn()
}));

describe('NodeContent компоненты', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // По умолчанию считаем, что текст занимает 5 строк
    (utils.getTextLinesCount as jest.Mock).mockReturnValue(5);
  });

  describe('EditableContent', () => {
    it('отображает текстовую область с переданными значениями', () => {
      const mockProps = {
        value: 'Тестовый текст',
        onChange: jest.fn(),
        onKeyDown: jest.fn(),
        onBlur: jest.fn(),
        placeholder: 'Введите текст',
        selected: false
      };

      render(<EditableContent {...mockProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue(mockProps.value);
      expect(textarea).toHaveAttribute('placeholder', mockProps.placeholder);
    });

    it('вызывает onChange при изменении текста', () => {
      const onChange = jest.fn();
      const mockProps = {
        value: 'Исходный текст',
        onChange,
        onKeyDown: jest.fn(),
        onBlur: jest.fn(),
        placeholder: 'Введите текст',
        selected: false
      };

      render(<EditableContent {...mockProps} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, {target: {value: 'Новый текст'}});

      expect(onChange).toHaveBeenCalledWith('Новый текст');
    });

    it('вызывает onKeyDown при нажатии клавиши', () => {
      const onKeyDown = jest.fn();
      const mockProps = {
        value: 'Тестовый текст',
        onChange: jest.fn(),
        onKeyDown,
        onBlur: jest.fn(),
        placeholder: 'Введите текст',
        selected: false
      };

      render(<EditableContent {...mockProps} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, {key: 'Enter'});

      expect(onKeyDown).toHaveBeenCalled();
    });

    it('вызывает onBlur при потере фокуса', () => {
      const onBlur = jest.fn();
      const mockProps = {
        value: 'Тестовый текст',
        onChange: jest.fn(),
        onKeyDown: jest.fn(),
        onBlur,
        placeholder: 'Введите текст',
        selected: false
      };

      render(<EditableContent {...mockProps} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.blur(textarea);

      expect(onBlur).toHaveBeenCalled();
    });

    it('корректно принимает prop selected', () => {
      const mockProps = {
        value: 'Тестовый текст',
        onChange: jest.fn(),
        onKeyDown: jest.fn(),
        onBlur: jest.fn(),
        placeholder: 'Введите текст',
        selected: true
      };

      render(<EditableContent {...mockProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      // Проверяем, что текстовая область существует и имеет правильное значение
      expect(textarea).toHaveValue(mockProps.value);
    });
  });

  describe('StaticContent', () => {
    it('отображает текст или плейсхолдер', () => {
      const mockProps = {
        value: 'Текст контента',
        placeholder: 'Введите текст',
        onDoubleClick: jest.fn()
      };

      render(<StaticContent {...mockProps} />);

      const content = screen.getByText('Текст контента');
      expect(content).toBeInTheDocument();
    });

    it('отображает placeholder, если значение пустое', () => {
      const mockProps = {
        value: '',
        placeholder: 'Введите текст',
        onDoubleClick: jest.fn()
      };

      render(<StaticContent {...mockProps} />);

      const placeholder = screen.getByText('Введите текст');
      expect(placeholder).toBeInTheDocument();
    });

    it('вызывает onDoubleClick при двойном клике', () => {
      const onDoubleClick = jest.fn();
      const mockProps = {
        value: 'Текст контента',
        placeholder: 'Введите текст',
        onDoubleClick
      };

      render(<StaticContent {...mockProps} />);

      const content = screen.getByText('Текст контента');
      fireEvent.doubleClick(content);

      expect(onDoubleClick).toHaveBeenCalled();
    });

    it('устанавливает overflowY в auto для текста с большим количеством строк', () => {
      // Мокаем больше 10 строк
      (utils.getTextLinesCount as jest.Mock).mockReturnValue(12);

      const mockProps = {
        value: 'Длинный текст с многими строками',
        placeholder: 'Введите текст',
        onDoubleClick: jest.fn()
      };

      const {container} = render(<StaticContent {...mockProps} />);

      const staticContent = screen.getByText('Длинный текст с многими строками');
      // В jsdom стили применяются как inline-атрибуты
      expect(staticContent).toHaveStyle({overflowY: 'auto'});
    });

    it('устанавливает overflowY в hidden для текста с небольшим количеством строк', () => {
      // Мокаем меньше 10 строк
      (utils.getTextLinesCount as jest.Mock).mockReturnValue(5);

      const mockProps = {
        value: 'Короткий текст',
        placeholder: 'Введите текст',
        onDoubleClick: jest.fn()
      };

      const {container} = render(<StaticContent {...mockProps} />);

      const staticContent = screen.getByText('Короткий текст');
      expect(staticContent).toHaveStyle({overflowY: 'hidden'});
    });
  });

  describe('EditableTitle', () => {
    it('отображает поле ввода с переданными значениями', () => {
      const mockProps = {
        value: 'Тестовый заголовок',
        onChange: jest.fn(),
        onKeyDown: jest.fn(),
        onBlur: jest.fn(),
        placeholder: 'Введите заголовок',
        selected: false
      };

      render(<EditableTitle {...mockProps} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue(mockProps.value);
      expect(input).toHaveAttribute('placeholder', mockProps.placeholder);
    });

    it('вызывает onChange при изменении значения', () => {
      const onChange = jest.fn();
      const mockProps = {
        value: 'Исходный заголовок',
        onChange,
        onKeyDown: jest.fn(),
        onBlur: jest.fn(),
        placeholder: 'Введите заголовок',
        selected: false
      };

      render(<EditableTitle {...mockProps} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, {target: {value: 'Новый заголовок'}});

      expect(onChange).toHaveBeenCalled();
    });

    it('вызывает onKeyDown при нажатии клавиши', () => {
      const onKeyDown = jest.fn();
      const mockProps = {
        value: 'Тестовый заголовок',
        onChange: jest.fn(),
        onKeyDown,
        onBlur: jest.fn(),
        placeholder: 'Введите заголовок',
        selected: false
      };

      render(<EditableTitle {...mockProps} />);

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, {key: 'Enter'});

      expect(onKeyDown).toHaveBeenCalled();
    });

    it('вызывает onBlur при потере фокуса', () => {
      const onBlur = jest.fn();
      const mockProps = {
        value: 'Тестовый заголовок',
        onChange: jest.fn(),
        onKeyDown: jest.fn(),
        onBlur,
        placeholder: 'Введите заголовок',
        selected: false
      };

      render(<EditableTitle {...mockProps} />);

      const input = screen.getByRole('textbox');
      fireEvent.blur(input);

      expect(onBlur).toHaveBeenCalled();
    });

    it('принимает prop selected для управления интерактивностью', () => {
      const mockProps = {
        value: 'Тестовый заголовок',
        onChange: jest.fn(),
        onKeyDown: jest.fn(),
        onBlur: jest.fn(),
        placeholder: 'Введите заголовок',
        selected: true
      };

      render(<EditableTitle {...mockProps} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      // Проверяем, что поле ввода существует и имеет правильное значение
      expect(input).toHaveValue(mockProps.value);
    });
  });

  describe('StaticTitle', () => {
    it('отображает текст заголовка или плейсхолдер', () => {
      const mockProps = {
        value: 'Текст заголовка',
        placeholder: 'Введите заголовок',
        onDoubleClick: jest.fn()
      };

      render(<StaticTitle {...mockProps} />);

      const content = screen.getByText('Текст заголовка');
      expect(content).toBeInTheDocument();
    });

    it('отображает placeholder, если значение пустое', () => {
      const mockProps = {
        value: '',
        placeholder: 'Введите заголовок',
        onDoubleClick: jest.fn()
      };

      render(<StaticTitle {...mockProps} />);

      const placeholder = screen.getByText('Введите заголовок');
      expect(placeholder).toBeInTheDocument();
    });

    it('вызывает onDoubleClick при двойном клике', () => {
      const onDoubleClick = jest.fn();
      const mockProps = {
        value: 'Текст заголовка',
        placeholder: 'Введите заголовок',
        onDoubleClick
      };

      render(<StaticTitle {...mockProps} />);

      const content = screen.getByText('Текст заголовка');
      fireEvent.doubleClick(content);

      expect(onDoubleClick).toHaveBeenCalled();
    });

    it('имеет стили для заголовка', () => {
      const mockProps = {
        value: 'Текст заголовка',
        placeholder: 'Введите заголовок',
        onDoubleClick: jest.fn()
      };

      const {container} = render(<StaticTitle {...mockProps} />);

      const staticTitle = screen.getByText('Текст заголовка');
      expect(staticTitle).toHaveStyle({
        fontFamily: 'Inter, sans-serif',
        lineHeight: '1.5',
        fontWeight: '800'
      });
    });
  });
});
