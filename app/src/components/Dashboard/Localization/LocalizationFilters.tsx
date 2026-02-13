'use client';

import React from 'react';

import {Cross2Icon} from '@radix-ui/react-icons';
import {Badge, Box, Button, Card, Checkbox, Flex, IconButton, Popover, Select, Text} from '@radix-ui/themes';
import {Filter, Hash, Type} from 'lucide-react';
import {useTranslation} from 'react-i18next';

export interface LocalizationFilters {
  // Фильтры по статусу
  statuses: string[];

  // Фильтры по типу объекта
  objectTypes: string[];

  // Фильтры по структуре
  layers: string[];

  // Дополнительные фильтры
  dateRange?: {
    from?: string;
    to?: string;
  };
  textLength?: {
    min?: number;
    max?: number;
  };
  hasComments?: boolean;
  hasGlossaryTerms?: boolean;
  lengthCategory?: 'short' | 'medium' | 'long' | 'all';
}

interface LocalizationFiltersProps {
  filters: LocalizationFilters;
  onFiltersChange: (filters: LocalizationFilters) => void;
  availableLayers: Array<{id: string; name: string}>;
  isFiltered: boolean;
  onClearFilters: () => void;
}

export const LocalizationFiltersPanel: React.FC<LocalizationFiltersProps> = ({filters, onFiltersChange, availableLayers, isFiltered, onClearFilters}) => {
  const {t} = useTranslation();

  const statusOptions = [
    {value: 'PENDING', label: t('localization.status.PENDING', 'Не переведено'), color: 'gray'},
    {value: 'TRANSLATED', label: t('localization.status.TRANSLATED', 'Черновики'), color: 'blue'},
    {value: 'REVIEWED', label: t('localization.status.REVIEWED', 'На проверке'), color: 'cyan'},
    {value: 'APPROVED', label: t('localization.status.APPROVED', 'Проверено'), color: 'green'},
    {value: 'OUTDATED', label: t('localization.status.OUTDATED', 'Требует обновления'), color: 'orange'},
    {value: 'PROTECTED', label: t('localization.status.PROTECTED', 'Защищено'), color: 'purple'}
  ] as const;

  const objectTypeOptions = [
    {value: 'narrative', label: t('localization.filters.object_types.narrative_nodes', 'Нарративные узлы'), icon: Type},
    {value: 'choice', label: t('localization.filters.object_types.choice_nodes', 'Узлы выборов'), icon: Type}
  ];

  const lengthCategoryOptions = [
    {value: 'all', label: t('localization.filters.length.all', 'Все длины')},
    {value: 'short', label: t('localization.filters.length.short', 'Короткие (до 50 символов)')},
    {value: 'medium', label: t('localization.filters.length.medium', 'Средние (50-200 символов)')},
    {value: 'long', label: t('localization.filters.length.long', 'Длинные (более 200 символов)')}
  ];

  const updateFilter = <K extends keyof LocalizationFilters>(key: K, value: LocalizationFilters[K]) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const toggleArrayFilter = (filterKey: keyof Pick<LocalizationFilters, 'statuses' | 'objectTypes' | 'layers'>, value: string) => {
    const currentValues = filters[filterKey] as string[];
    const newValues = currentValues.includes(value) ? currentValues.filter((v) => v !== value) : [...currentValues, value];

    updateFilter(filterKey, newValues);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.statuses.length > 0) count++;
    if (filters.objectTypes.length > 0) count++;
    if (filters.layers.length > 0) count++;
    if (filters.dateRange?.from || filters.dateRange?.to) count++;
    if (filters.lengthCategory && filters.lengthCategory !== 'all') count++;
    if (filters.hasComments === true) count++;
    if (filters.hasGlossaryTerms === true) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card style={{padding: '16px', marginBottom: '16px'}}>
      <Flex justify='between' align='center' gap='4' wrap='wrap'>
        {/* Заголовок и счетчик активных фильтров */}
        <Flex align='center' gap='2'>
          <Filter size={16} />
          <Text size='2' weight='medium'>
            {t('localization.filters.title', 'Фильтры')}
          </Text>
          {activeFiltersCount > 0 && (
            <Badge variant='soft' color='blue' size='1'>
              {activeFiltersCount}
            </Badge>
          )}
        </Flex>

        {/* Кнопка очистки фильтров */}
        {isFiltered && (
          <Button variant='ghost' size='1' onClick={onClearFilters}>
            <Cross2Icon />
            {t('localization.filters.clear_all', 'Очистить все')}
          </Button>
        )}
      </Flex>

      <Flex gap='3' mt='3' wrap='wrap' align='center'>
        {/* Фильтр по статусу */}
        <Popover.Root>
          <Popover.Trigger>
            <Button variant='outline' size='2'>
              <Badge variant='soft' color={filters.statuses.length > 0 ? 'blue' : 'gray'} size='1'>
                {filters.statuses.length}
              </Badge>
              {t('localization.filters.status', 'Статус')}
            </Button>
          </Popover.Trigger>
          <Popover.Content style={{width: '280px'}}>
            <Flex direction='column' gap='2'>
              <Text size='2' weight='medium'>
                {t('localization.filters.status_description', 'Фильтры по статусу')}
              </Text>
              {statusOptions.map((option) => (
                <label key={option.value} style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                  <Checkbox checked={filters.statuses.includes(option.value)} onCheckedChange={(checked) => toggleArrayFilter('statuses', option.value)} />
                  <Badge variant='soft' color={option.color} size='1'>
                    {option.label}
                  </Badge>
                </label>
              ))}
            </Flex>
          </Popover.Content>
        </Popover.Root>

        {/* Фильтр по типу объекта */}
        <Popover.Root>
          <Popover.Trigger>
            <Button variant='outline' size='2'>
              <Badge variant='soft' color={filters.objectTypes.length > 0 ? 'blue' : 'gray'} size='1'>
                {filters.objectTypes.length}
              </Badge>
              {t('localization.filters.object_type', 'Тип объекта')}
            </Button>
          </Popover.Trigger>
          <Popover.Content style={{width: '300px'}}>
            <Flex direction='column' gap='2'>
              <Text size='2' weight='medium'>
                {t('localization.filters.object_type_description', 'Фильтры по типу объекта')}
              </Text>
              {objectTypeOptions.map((option) => (
                <label key={option.value} style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                  <Checkbox checked={filters.objectTypes.includes(option.value)} onCheckedChange={(checked) => toggleArrayFilter('objectTypes', option.value)} />
                  <option.icon size={14} />
                  <Text size='2'>{option.label}</Text>
                </label>
              ))}
            </Flex>
          </Popover.Content>
        </Popover.Root>

        {/* Фильтр по слоям */}
        {availableLayers.length > 0 && (
          <Popover.Root>
            <Popover.Trigger>
              <Button variant='outline' size='2'>
                <Badge variant='soft' color={filters.layers.length > 0 ? 'blue' : 'gray'} size='1'>
                  {filters.layers.length}
                </Badge>
                {t('localization.filters.layers', 'Слои')}
              </Button>
            </Popover.Trigger>
            <Popover.Content style={{width: '280px'}}>
              <Flex direction='column' gap='2'>
                <Text size='2' weight='medium'>
                  {t('localization.filters.layers_description', 'Фильтры по слоям')}
                </Text>
                {availableLayers.map((layer) => (
                  <label key={layer.id} style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                    <Checkbox checked={filters.layers.includes(layer.id)} onCheckedChange={(checked) => toggleArrayFilter('layers', layer.id)} />
                    <Flex direction='column' align='start' style={{flex: 1}}>
                      <Text size='2' weight='medium'>
                        {layer.name}
                      </Text>
                      {layer.name !== layer.id && (
                        <Text size='1' color='gray' style={{opacity: 0.7}}>
                          ID: {layer.id}
                        </Text>
                      )}
                    </Flex>
                  </label>
                ))}
              </Flex>
            </Popover.Content>
          </Popover.Root>
        )}

        {/* Фильтр по длине текста */}
        <Select.Root value={filters.lengthCategory || 'all'} onValueChange={(value) => updateFilter('lengthCategory', value as any)}>
          <Select.Trigger>
            <Flex align='center' gap='2'>
              <Hash size={14} />
              {t('localization.filters.text_length', 'Длина текста')}
            </Flex>
          </Select.Trigger>
          <Select.Content>
            {lengthCategoryOptions.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>

        {/* Чекбоксы для дополнительных фильтров */}
        {/* <Flex gap="3" align="center">
          <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'}}>
            <Checkbox
              checked={filters.hasComments === true}
              onCheckedChange={(checked) => updateFilter('hasComments', checked === true ? true : undefined)}
            />
            <MessageCircle size={14} />
            <Text size="2">{t('localization.filters.has_comments', 'С комментариями')}</Text>
          </label>

          <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'}}>
            <Checkbox
              checked={filters.hasGlossaryTerms === true}
              onCheckedChange={(checked) => updateFilter('hasGlossaryTerms', checked === true ? true : undefined)}
            />
            <MagnifyingGlassIcon />
            <Text size="2">{t('localization.filters.has_glossary_terms', 'Термины глоссария')}</Text>
          </label>
        </Flex> */}
      </Flex>

      {/* Активные фильтры */}
      {isFiltered && (
        <Box mt='3' pt='3' style={{borderTop: '1px solid var(--gray-6)'}}>
          <Text size='1' color='gray' mb='2' style={{display: 'block'}}>
            {t('localization.filters.active_filters', 'Активные фильтры')}:
          </Text>
          <Flex gap='2' wrap='wrap'>
            {filters.statuses.map((status) => (
              <Badge key={status} variant='soft' size='1' color='blue'>
                {statusOptions.find((s) => s.value === status)?.label || status}
                <IconButton size='1' variant='ghost' style={{marginLeft: '4px', width: '12px', height: '12px'}} onClick={() => toggleArrayFilter('statuses', status)}>
                  <Cross2Icon width='8' height='8' />
                </IconButton>
              </Badge>
            ))}

            {filters.objectTypes.map((type) => (
              <Badge key={type} variant='soft' size='1' color='purple'>
                {objectTypeOptions.find((t) => t.value === type)?.label || type}
                <IconButton size='1' variant='ghost' style={{marginLeft: '4px', width: '12px', height: '12px'}} onClick={() => toggleArrayFilter('objectTypes', type)}>
                  <Cross2Icon width='8' height='8' />
                </IconButton>
              </Badge>
            ))}

            {filters.layers.map((layerId) => {
              const layer = availableLayers.find((l) => l.id === layerId);
              return (
                <Badge key={layerId} variant='soft' size='1' color='green'>
                  {layer?.name || layerId}
                  <IconButton size='1' variant='ghost' style={{marginLeft: '4px', width: '12px', height: '12px'}} onClick={() => toggleArrayFilter('layers', layerId)}>
                    <Cross2Icon width='8' height='8' />
                  </IconButton>
                </Badge>
              );
            })}

            {filters.lengthCategory && filters.lengthCategory !== 'all' && (
              <Badge variant='soft' size='1' color='orange'>
                {lengthCategoryOptions.find((l) => l.value === filters.lengthCategory)?.label}
                <IconButton size='1' variant='ghost' style={{marginLeft: '4px', width: '12px', height: '12px'}} onClick={() => updateFilter('lengthCategory', 'all')}>
                  <Cross2Icon width='8' height='8' />
                </IconButton>
              </Badge>
            )}

            {/* {filters.hasComments && (
              <Badge variant="soft" size="1" color="indigo">
                {t('localization.filters.has_comments', 'С комментариями')}
                <IconButton
                  size="1"
                  variant="ghost"
                  style={{marginLeft: '4px', width: '12px', height: '12px'}}
                  onClick={() => updateFilter('hasComments', undefined)}
                >
                  <Cross2Icon width="8" height="8" />
                </IconButton>
              </Badge>
            )} */}

            {/* {filters.hasGlossaryTerms && (
              <Badge variant="soft" size="1" color="teal">
                {t('localization.filters.has_glossary_terms', 'Термины глоссария')}
                <IconButton
                  size="1"
                  variant="ghost"
                  style={{marginLeft: '4px', width: '12px', height: '12px'}}
                  onClick={() => updateFilter('hasGlossaryTerms', undefined)}
                >
                  <Cross2Icon width="8" height="8" />
                </IconButton>
              </Badge>
            )} */}
          </Flex>
        </Box>
      )}
    </Card>
  );
};
