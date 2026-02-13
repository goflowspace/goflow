export interface Timeline {
  id: string;
  name: string;
  createdAt: number;
  isActive: boolean;
}

export interface TimelineContextMenuAction {
  type: 'rename' | 'duplicate' | 'delete';
  timelineId: string;
}
