import {create} from 'zustand';

type Tool = 'cursor' | 'node-tool' | 'layer' | 'choice' | 'unlink' | 'note' | 'comment';

interface ToolStore {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  setTool: (tool: Tool) => void; // Alias for compatibility
  resetToCursor: () => void;
}

export const useToolStore = create<ToolStore>((set) => ({
  activeTool: 'cursor',
  setActiveTool: (tool) => {
    set({activeTool: tool});
  },
  setTool: (tool) => {
    set({activeTool: tool});
  },
  resetToCursor: () => {
    set({activeTool: 'cursor'});
  }
}));
