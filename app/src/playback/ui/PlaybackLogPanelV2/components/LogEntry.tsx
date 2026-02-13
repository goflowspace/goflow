import React from 'react';

import {LogEntryType as EntryType, LogEntry as LogEntryType} from '../types';
import {ChoiceEntry} from './ChoiceEntry';
import {NarrativeEntry} from './NarrativeEntry';

interface LogEntryProps {
  entry: LogEntryType;
  onToggleExpand?: (id: string) => void;
  direction: 'up' | 'down';
}

export const LogEntry: React.FC<LogEntryProps> = ({entry, onToggleExpand, direction}) => {
  switch (entry.type) {
    case EntryType.NARRATIVE:
      return <NarrativeEntry entry={entry} onToggleExpand={onToggleExpand} direction={direction} />;

    case EntryType.CHOICE:
      return <ChoiceEntry entry={entry} direction={direction} />;

    default:
      return null;
  }
};
