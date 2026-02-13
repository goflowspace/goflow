import React from 'react';

import '@testing-library/jest-dom';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';

import {ConditionType} from '../../../../types/nodes';
import {PlaybackLogPanelV2} from '../PlaybackLogPanelV2';
import {ChoiceLogEntry, Condition, LogEntry, LogEntryType, NarrativeLogEntry, Operation} from '../types';

// Мокаем react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'playback.log_panel.title': 'Playback Log',
        'playback.log_panel.empty_log': 'Log is empty',
        'playback.log_panel.sort_ascending': 'Sort ascending',
        'playback.log_panel.sort_descending': 'Sort descending',
        'playback.log_panel.expand_all': 'Expand all',
        'playback.log_panel.collapse_all': 'Collapse all',
        'playback.log_panel.clear_log': 'Clear log'
      };
      return translations[key] || key;
    }
  })
}));

// Мокаем компонент LogEntry
jest.mock('../components/LogEntry', () => ({
  LogEntry: ({entry, onToggleExpand, direction}: any) => (
    <div data-testid={`log-entry-${entry.id}`} data-expanded={entry.isExpanded ? 'true' : 'false'} data-direction={direction} onClick={() => onToggleExpand?.(entry.id)}>
      {entry.nodeName || entry.choiceName}
    </div>
  )
}));

// Мокаем стили
jest.mock('../styles.module.css', () => ({
  panel: 'panel',
  header: 'header',
  headerTitle: 'headerTitle',
  headerControls: 'headerControls',
  iconButton: 'iconButton',
  neutral: 'neutral',
  error: 'error',
  logContainer: 'logContainer'
}));

describe('PlaybackLogPanelV2', () => {
  // Подготовка тестовых данных
  const mockNarrativeEntry: NarrativeLogEntry = {
    id: '1',
    timestamp: '2024-01-01T10:00:00',
    type: LogEntryType.NARRATIVE,
    nodeName: 'Narrative Node 1',
    index: 0,
    operations: [
      {
        id: 'op1',
        variableName: 'test',
        operator: 'override',
        value: 'value',
        result: 'value'
      }
    ],
    conditions: []
  };

  const mockNarrativeEntryWithOperations: NarrativeLogEntry = {
    id: '2',
    timestamp: '2024-01-01T10:01:00',
    type: LogEntryType.NARRATIVE,
    nodeName: 'Narrative Node 2',
    index: 1,
    operations: [
      {
        id: 'op2',
        variableName: 'test2',
        operator: 'addition',
        value: 5,
        result: 10
      }
    ],
    conditions: []
  };

  const mockChoiceEntry: ChoiceLogEntry = {
    id: '3',
    timestamp: '2024-01-01T10:02:00',
    type: LogEntryType.CHOICE,
    choiceName: 'Choice Node',
    index: 2
  };

  const mockChoiceEntry2: ChoiceLogEntry = {
    id: '4',
    timestamp: '2024-01-01T10:03:00',
    type: LogEntryType.CHOICE,
    choiceName: 'Choice Node 2',
    index: 3
  };

  const mockEntries: LogEntry[] = [mockNarrativeEntry, mockNarrativeEntryWithOperations, mockChoiceEntry, mockChoiceEntry2];

  const defaultProps = {
    entries: mockEntries,
    onClear: jest.fn(),
    onToggleSort: jest.fn(),
    onToggleExpandAll: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Основная функциональность', () => {
    it('должен корректно отображать все записи лога', () => {
      render(<PlaybackLogPanelV2 {...defaultProps} />);

      expect(screen.getByTestId('log-entry-1')).toBeInTheDocument();
      expect(screen.getByTestId('log-entry-2')).toBeInTheDocument();
      expect(screen.getByTestId('log-entry-3')).toBeInTheDocument();
      expect(screen.getByTestId('log-entry-4')).toBeInTheDocument();
    });

    it('должен отображать сообщение "Лог пуст" когда нет записей', () => {
      render(<PlaybackLogPanelV2 {...defaultProps} entries={[]} />);

      expect(screen.getByText('Log is empty')).toBeInTheDocument();
    });

    it('должен отображать заголовок панели', () => {
      render(<PlaybackLogPanelV2 {...defaultProps} />);

      expect(screen.getByText('Playback Log')).toBeInTheDocument();
    });
  });

  describe('Раскрытие/сворачивание отдельных записей', () => {
    it('должен переключать состояние развернутости при клике на запись', () => {
      render(<PlaybackLogPanelV2 {...defaultProps} />);

      const entry = screen.getByTestId('log-entry-1');
      // Теперь по умолчанию записи развернуты
      expect(entry).toHaveAttribute('data-expanded', 'true');

      fireEvent.click(entry);
      expect(entry).toHaveAttribute('data-expanded', 'false');

      fireEvent.click(entry);
      expect(entry).toHaveAttribute('data-expanded', 'true');
    });

    it('должен сохранять состояние развернутости при перерендере', () => {
      const {rerender} = render(<PlaybackLogPanelV2 {...defaultProps} />);

      const entry = screen.getByTestId('log-entry-1');
      // Сворачиваем запись (изначально развернута)
      fireEvent.click(entry);
      expect(entry).toHaveAttribute('data-expanded', 'false');

      // Перерендер с новыми записями
      const newEntries = [...mockEntries];
      rerender(<PlaybackLogPanelV2 {...defaultProps} entries={newEntries} />);

      expect(screen.getByTestId('log-entry-1')).toHaveAttribute('data-expanded', 'false');
    });
  });

  describe('Сортировка записей', () => {
    it('должен отображать записи в порядке возрастания по умолчанию', () => {
      render(<PlaybackLogPanelV2 {...defaultProps} />);

      const entries = screen.getAllByTestId(/log-entry-/);
      expect(entries[0]).toHaveAttribute('data-testid', 'log-entry-1');
      expect(entries[3]).toHaveAttribute('data-testid', 'log-entry-4');
    });

    it('должен переключать порядок сортировки при клике на кнопку', () => {
      render(<PlaybackLogPanelV2 {...defaultProps} />);

      const sortButton = screen.getByTitle('Sort descending');
      fireEvent.click(sortButton);

      const entries = screen.getAllByTestId(/log-entry-/);
      expect(entries[0]).toHaveAttribute('data-testid', 'log-entry-4');
      expect(entries[3]).toHaveAttribute('data-testid', 'log-entry-1');

      expect(defaultProps.onToggleSort).toHaveBeenCalledTimes(1);
    });

    it('должен изменять направление стрелок для записей при изменении сортировки', () => {
      render(<PlaybackLogPanelV2 {...defaultProps} />);

      expect(screen.getByTestId('log-entry-1')).toHaveAttribute('data-direction', 'down');

      const sortButton = screen.getByTitle('Sort descending');
      fireEvent.click(sortButton);

      expect(screen.getByTestId('log-entry-1')).toHaveAttribute('data-direction', 'up');
    });
  });

  describe('Раскрытие/сворачивание всех записей', () => {
    it('должен раскрывать только NARRATIVE записи с операциями или условиями', () => {
      render(<PlaybackLogPanelV2 {...defaultProps} />);

      // По умолчанию записи уже развернуты
      expect(screen.getByTestId('log-entry-1')).toHaveAttribute('data-expanded', 'true');
      expect(screen.getByTestId('log-entry-2')).toHaveAttribute('data-expanded', 'true');
      expect(screen.getByTestId('log-entry-3')).toHaveAttribute('data-expanded', 'false');
      expect(screen.getByTestId('log-entry-4')).toHaveAttribute('data-expanded', 'false');

      // Кнопка должна показывать "Collapse all"
      const collapseAllButton = screen.getByTitle('Collapse all');
      fireEvent.click(collapseAllButton);

      // Теперь все должно быть свернуто
      expect(screen.getByTestId('log-entry-1')).toHaveAttribute('data-expanded', 'false');
      expect(screen.getByTestId('log-entry-2')).toHaveAttribute('data-expanded', 'false');
      expect(screen.getByTestId('log-entry-3')).toHaveAttribute('data-expanded', 'false');
      expect(screen.getByTestId('log-entry-4')).toHaveAttribute('data-expanded', 'false');

      expect(defaultProps.onToggleExpandAll).toHaveBeenCalledTimes(1);
    });

    it('должен сворачивать все записи при повторном клике', () => {
      render(<PlaybackLogPanelV2 {...defaultProps} />);

      // Сначала сворачиваем (изначально развернуто)
      const collapseAllButton = screen.getByTitle('Collapse all');
      fireEvent.click(collapseAllButton);

      // Затем раскрываем
      fireEvent.click(screen.getByTitle('Expand all'));

      expect(screen.getByTestId('log-entry-1')).toHaveAttribute('data-expanded', 'true');
      expect(defaultProps.onToggleExpandAll).toHaveBeenCalledTimes(2);
    });

    it('должен корректно работать с записями, имеющими только условия', () => {
      const entryWithConditions: NarrativeLogEntry = {
        id: '5',
        timestamp: '2024-01-01T10:04:00',
        type: LogEntryType.NARRATIVE,
        nodeName: 'Narrative with conditions',
        index: 4,
        operations: [],
        conditions: [
          {
            id: 'cond1',
            type: ConditionType.VARIABLE_COMPARISON,
            index: 0,
            valType: 'custom',
            variableName: 'test',
            comparator: '===',
            value: 'true'
          }
        ]
      };

      render(<PlaybackLogPanelV2 {...defaultProps} entries={[...mockEntries, entryWithConditions]} />);

      // По умолчанию запись с условиями уже развернута
      expect(screen.getByTestId('log-entry-5')).toHaveAttribute('data-expanded', 'true');
    });

    it('должен правильно обрабатывать ручное переключение записей при глобальном режиме', () => {
      render(<PlaybackLogPanelV2 {...defaultProps} />);

      const entry1 = screen.getByTestId('log-entry-1');
      const entry2 = screen.getByTestId('log-entry-2');

      // Изначально все развернуто (глобальный режим 'expanded')
      expect(entry1).toHaveAttribute('data-expanded', 'true');
      expect(entry2).toHaveAttribute('data-expanded', 'true');

      // Вручную сворачиваем первую запись
      fireEvent.click(entry1);
      expect(entry1).toHaveAttribute('data-expanded', 'false');
      expect(entry2).toHaveAttribute('data-expanded', 'true');

      // Переключаем глобальный режим на "свернуть все" - это очищает исключения и устанавливает новое состояние
      fireEvent.click(screen.getByTitle('Collapse all'));

      // Теперь обе записи свернуты (следуют глобальному режиму)
      expect(entry1).toHaveAttribute('data-expanded', 'false');
      expect(entry2).toHaveAttribute('data-expanded', 'false');

      // Вручную разворачиваем первую запись (создаем исключение)
      fireEvent.click(entry1);
      expect(entry1).toHaveAttribute('data-expanded', 'true'); // исключение из глобального "свернуто"
      expect(entry2).toHaveAttribute('data-expanded', 'false'); // следует глобальному режиму

      // Переключаем глобальный режим на "развернуть все" - это снова очищает исключения
      fireEvent.click(screen.getByTitle('Expand all'));

      // Теперь обе записи развернуты (следуют новому глобальному режиму)
      expect(entry1).toHaveAttribute('data-expanded', 'true');
      expect(entry2).toHaveAttribute('data-expanded', 'true');
    });

    it('должен решать проблему с "обратным состоянием" при переключении глобального режима', () => {
      render(<PlaybackLogPanelV2 {...defaultProps} />);

      const entry1 = screen.getByTestId('log-entry-1');
      const entry2 = screen.getByTestId('log-entry-2');

      // Сценарий из описания проблемы:
      // 1. Изначально все развернуто, сворачиваем одну запись
      expect(entry1).toHaveAttribute('data-expanded', 'true');
      expect(entry2).toHaveAttribute('data-expanded', 'true');

      fireEvent.click(entry1); // свернули вручную
      expect(entry1).toHaveAttribute('data-expanded', 'false');
      expect(entry2).toHaveAttribute('data-expanded', 'true');

      // 2. Переключаем в режим "свернуть все"
      fireEvent.click(screen.getByTitle('Collapse all'));

      // Обе записи должны быть свернуты (исключения очищены)
      expect(entry1).toHaveAttribute('data-expanded', 'false');
      expect(entry2).toHaveAttribute('data-expanded', 'false');

      // 3. Переключаем в режим "развернуть все"
      fireEvent.click(screen.getByTitle('Expand all'));

      // Обе записи должны быть развернуты (НЕ в обратном состоянии!)
      expect(entry1).toHaveAttribute('data-expanded', 'true');
      expect(entry2).toHaveAttribute('data-expanded', 'true');

      // 4. Снова переключаем в режим "свернуть все"
      fireEvent.click(screen.getByTitle('Collapse all'));

      // Обе записи должны быть свернуты (одинаково!)
      expect(entry1).toHaveAttribute('data-expanded', 'false');
      expect(entry2).toHaveAttribute('data-expanded', 'false');
    });
  });

  describe('Очистка лога', () => {
    it('должен вызывать onClear при клике на кнопку очистки', () => {
      render(<PlaybackLogPanelV2 {...defaultProps} />);

      const clearButton = screen.getByTitle('Clear log');
      fireEvent.click(clearButton);

      expect(defaultProps.onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('Автоматическая прокрутка', () => {
    it('должен прокручивать к низу при добавлении новых записей в режиме возрастания', () => {
      const scrollSpy = jest.fn();
      const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');

      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
        configurable: true,
        get() {
          return 1000;
        }
      });

      Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
        configurable: true,
        get() {
          return 0;
        },
        set: scrollSpy
      });

      const {rerender} = render(<PlaybackLogPanelV2 {...defaultProps} />);

      // Добавляем новую запись
      const newEntry: ChoiceLogEntry = {
        id: '5',
        timestamp: '2024-01-01T10:05:00',
        type: LogEntryType.CHOICE,
        choiceName: 'New Choice',
        index: 4
      };

      rerender(<PlaybackLogPanelV2 {...defaultProps} entries={[...mockEntries, newEntry]} />);

      expect(scrollSpy).toHaveBeenCalledWith(1000);

      // Восстанавливаем оригинальные свойства
      if (originalScrollHeight) {
        Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight);
      }
    });

    it('не должен прокручивать в режиме убывания', () => {
      const scrollSpy = jest.fn();
      Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
        configurable: true,
        get() {
          return 0;
        },
        set: scrollSpy
      });

      const {rerender} = render(<PlaybackLogPanelV2 {...defaultProps} />);

      // Переключаем на убывание
      const sortButton = screen.getByTitle('Sort descending');
      fireEvent.click(sortButton);

      // Добавляем новую запись
      const newEntry: ChoiceLogEntry = {
        id: '5',
        timestamp: '2024-01-01T10:05:00',
        type: LogEntryType.CHOICE,
        choiceName: 'New Choice',
        index: 4
      };

      rerender(<PlaybackLogPanelV2 {...defaultProps} entries={[...mockEntries, newEntry]} />);

      expect(scrollSpy).not.toHaveBeenCalled();
    });
  });

  describe('Регрессионные тесты', () => {
    it('должен корректно обрабатывать пустые операции и условия', () => {
      const entries: LogEntry[] = [
        {
          id: '1',
          timestamp: '2024-01-01T10:00:00',
          type: LogEntryType.NARRATIVE,
          nodeName: 'Empty arrays',
          index: 0,
          operations: [],
          conditions: []
        }
      ];

      render(<PlaybackLogPanelV2 {...defaultProps} entries={entries} />);

      // Не должна быть развернута, так как нет операций и условий (даже при глобальном режиме 'expanded')
      expect(screen.getByTestId('log-entry-1')).toHaveAttribute('data-expanded', 'false');
    });

    it('должен сохранять состояние при изменении пропсов', () => {
      const {rerender} = render(<PlaybackLogPanelV2 {...defaultProps} />);

      // Сворачиваем запись (изначально развернута)
      fireEvent.click(screen.getByTestId('log-entry-1'));

      // Меняем сортировку
      fireEvent.click(screen.getByTitle('Sort descending'));

      // Перерендер с новыми колбэками
      rerender(<PlaybackLogPanelV2 {...defaultProps} onClear={jest.fn()} onToggleSort={jest.fn()} />);

      // Состояние должно сохраниться (запись свернута)
      expect(screen.getByTestId('log-entry-1')).toHaveAttribute('data-expanded', 'false');
      expect(screen.getByTitle('Sort ascending')).toBeInTheDocument();
    });

    it('должен корректно работать при быстром переключении состояний', async () => {
      render(<PlaybackLogPanelV2 {...defaultProps} />);

      const entry = screen.getByTestId('log-entry-1');

      // Быстрые клики (изначально развернута)
      fireEvent.click(entry); // свернули
      fireEvent.click(entry); // развернули
      fireEvent.click(entry); // свернули

      await waitFor(() => {
        expect(entry).toHaveAttribute('data-expanded', 'false');
      });
    });

    it('должен корректно обрабатывать undefined колбэки', () => {
      render(<PlaybackLogPanelV2 entries={mockEntries} onClear={jest.fn()} />);

      // Не должно быть ошибок при клике без колбэков
      fireEvent.click(screen.getByTitle('Sort descending'));
      fireEvent.click(screen.getByTitle('Collapse all')); // Изначально показывает "Collapse all"

      expect(screen.getByTestId('log-entry-1')).toBeInTheDocument();
    });

    it('должен корректно отображать записи с одинаковыми timestamp', () => {
      const sameTimeEntries: LogEntry[] = [
        {
          id: '1',
          timestamp: '2024-01-01T10:00:00',
          type: LogEntryType.CHOICE,
          choiceName: 'Choice 1',
          index: 0
        },
        {
          id: '2',
          timestamp: '2024-01-01T10:00:00',
          type: LogEntryType.CHOICE,
          choiceName: 'Choice 2',
          index: 1
        }
      ];

      render(<PlaybackLogPanelV2 {...defaultProps} entries={sameTimeEntries} />);

      expect(screen.getByTestId('log-entry-1')).toBeInTheDocument();
      expect(screen.getByTestId('log-entry-2')).toBeInTheDocument();
    });
  });

  describe('Интеграционные тесты', () => {
    it('должен корректно работать полный сценарий использования', () => {
      const {rerender} = render(<PlaybackLogPanelV2 {...defaultProps} />);

      // 1. Сворачиваем отдельную запись (изначально развернута)
      fireEvent.click(screen.getByTestId('log-entry-1'));
      expect(screen.getByTestId('log-entry-1')).toHaveAttribute('data-expanded', 'false');

      // 2. Меняем сортировку
      fireEvent.click(screen.getByTitle('Sort descending'));

      // 3. Сворачиваем все - это очищает исключения и устанавливает глобальное состояние
      fireEvent.click(screen.getByTitle('Collapse all'));

      // Теперь обе записи свернуты (следуют глобальному режиму)
      expect(screen.getByTestId('log-entry-1')).toHaveAttribute('data-expanded', 'false');
      expect(screen.getByTestId('log-entry-2')).toHaveAttribute('data-expanded', 'false');

      // 4. Добавляем новую запись
      const newEntry: NarrativeLogEntry = {
        id: '5',
        timestamp: '2024-01-01T10:05:00',
        type: LogEntryType.NARRATIVE,
        nodeName: 'New Narrative',
        index: 4,
        operations: [
          {
            id: 'op2',
            variableName: 'new',
            operator: 'override',
            value: 'test',
            result: 'test'
          }
        ],
        conditions: []
      };

      rerender(<PlaybackLogPanelV2 {...defaultProps} entries={[...mockEntries, newEntry]} />);

      // 5. Проверяем, что новая запись следует глобальному режиму (свернута)
      expect(screen.getByTestId('log-entry-5')).toHaveAttribute('data-expanded', 'false');

      // 6. Разворачиваем все - это снова очищает исключения и устанавливает новое глобальное состояние
      fireEvent.click(screen.getByTitle('Expand all'));

      // 7. Теперь все записи развернуты (следуют новому глобальному режиму)
      expect(screen.getByTestId('log-entry-1')).toHaveAttribute('data-expanded', 'true');
      expect(screen.getByTestId('log-entry-5')).toHaveAttribute('data-expanded', 'true');
    });
  });
});
