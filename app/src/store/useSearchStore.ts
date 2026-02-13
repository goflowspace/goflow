import {create} from 'zustand';
import {devtools, subscribeWithSelector} from 'zustand/middleware';

export type NodeType = 'narrative' | 'choice' | 'layer' | 'note' | 'all';

export interface SearchResult {
  id: string;
  type: NodeType;
  text: string;
  title?: string;
  matchField: 'id' | 'text' | 'title';
  layerId: string; // ID слоя, в котором найден узел
  layerName: string; // Название слоя, в котором найден узел
}

interface SearchState {
  isSearchOpen: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
  activeFilter: NodeType;
  activeResultIndex: number | null;
  isNavigatingFromSearch: boolean; // Флаг, что навигация происходит из результатов поиска
  openedByHotkey: boolean; // Флаг для отслеживания, был ли поиск открыт через хоткей

  // Действия
  toggleSearchPanel: () => void;
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: NodeType) => void;
  addSearchResults: (results: SearchResult[]) => void;
  clearSearchResults: () => void;
  navigateToResult: (index: number) => void;
  nextResult: () => void;
  previousResult: () => void;
  setIsNavigatingFromSearch: (value: boolean) => void; // Метод для установки флага
  setSearchOpenedByHotkey: (value: boolean) => void; // Метод для установки флага открытия через хоткей
}

export const useSearchStore = create<SearchState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      isSearchOpen: false,
      searchQuery: '',
      searchResults: [],
      activeFilter: 'all',
      activeResultIndex: null,
      isNavigatingFromSearch: false, // Инициализируем флаг
      openedByHotkey: false, // Инициализируем флаг открытия через хоткей

      toggleSearchPanel: () => {
        const current = get().isSearchOpen;
        set({isSearchOpen: !current});

        // Если закрываем панель, сбрасываем только результаты и активный индекс, но сохраняем searchQuery
        if (current) {
          set({
            searchResults: [],
            activeResultIndex: null,
            isNavigatingFromSearch: false, // Сбрасываем флаг при закрытии панели
            openedByHotkey: false // Сбрасываем флаг открытия через хоткей
            // Не сбрасываем searchQuery
          });
        }
      },

      setSearchQuery: (query) => {
        set({searchQuery: query});
      },

      setActiveFilter: (filter) => {
        set({
          activeFilter: filter
          // Не сбрасываем активный результат и результаты поиска при смене фильтра
        });
      },

      addSearchResults: (results) => {
        // Определяем новый индекс активного результата
        // Если есть результаты, устанавливаем индекс первого результата
        // Если нет результатов или текущий индекс валиден - сохраняем его
        const prevState = get();
        const newActiveIndex = results.length > 0 ? (prevState.activeResultIndex !== null && prevState.activeResultIndex < results.length ? prevState.activeResultIndex : 0) : null;

        set({
          searchResults: results,
          activeResultIndex: newActiveIndex
        });
      },

      clearSearchResults: () => {
        set({
          searchResults: [],
          activeResultIndex: null
        });
      },

      navigateToResult: (index) => {
        const {searchResults} = get();
        if (index >= 0 && index < searchResults.length) {
          set({activeResultIndex: index});
        }
      },

      nextResult: () => {
        const {searchResults, activeResultIndex} = get();
        if (!searchResults.length) return;

        if (activeResultIndex === null) {
          set({activeResultIndex: 0});
        } else {
          const nextIndex = (activeResultIndex + 1) % searchResults.length;
          set({activeResultIndex: nextIndex});
        }
      },

      previousResult: () => {
        const {searchResults, activeResultIndex} = get();
        if (!searchResults.length) return;

        if (activeResultIndex === null) {
          set({activeResultIndex: 0});
        } else {
          const prevIndex = (activeResultIndex - 1 + searchResults.length) % searchResults.length;
          set({activeResultIndex: prevIndex});
        }
      },

      // Метод для установки флага навигации из поиска
      setIsNavigatingFromSearch: (value) => {
        set({isNavigatingFromSearch: value});
      },

      setSearchOpenedByHotkey: (value) => {
        set({openedByHotkey: value});
      }
    })),
    {name: 'search-store'}
  )
);
