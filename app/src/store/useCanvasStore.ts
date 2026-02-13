import {Connection, Edge, Node, OnEdgesChange, OnNodesChange, addEdge, applyEdgeChanges, applyNodeChanges} from '@xyflow/react';
import {create} from 'zustand';
import {devtools} from 'zustand/middleware';

import {useGraphStore} from './useGraphStore';

interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  draggingNodeId: string | null;
  viewportCenter?: {x: number; y: number};
  isPanning: boolean;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  setDraggingNodeId: (id: string | null) => void;
  selectNode: (nodeId: string) => void;
  deselectAllNodes: () => void;
  selectMultipleNodes: (nodeIds: string[]) => void;
  setViewportCenter: (center: {x: number; y: number}) => void;
  setIsPanning: (isPanning: boolean) => void;
}

const initialNodes: Node[] = [];

const initialEdges: Edge[] = [];

export const useCanvasStore = create<CanvasState>()(
  devtools(
    (set, get) => ({
      nodes: initialNodes,
      edges: initialEdges,
      draggingNodeId: null,
      viewportCenter: {x: 0, y: 0},
      isPanning: false,

      setNodes: (nodes) => set({nodes}),
      setEdges: (edges) => set({edges}),

      onNodesChange: (changes) => {
        const updatedNodes = applyNodeChanges(changes, get().nodes);

        const updateGraphPositions = useGraphStore.getState().onNodesChange;
        updateGraphPositions(changes);

        set({nodes: updatedNodes});
      },

      onEdgesChange: (changes) => {
        const updatedEdges = applyEdgeChanges(changes, get().edges);

        const updateGraphEdges = useGraphStore.getState().onEdgesChange;
        updateGraphEdges(changes);

        set({edges: updatedEdges});
      },

      onConnect: (connection) => {
        const {nodes} = get();

        const addEdgeToGraph = useGraphStore.getState().onConnect;
        addEdgeToGraph(connection);

        const updatedNodes = nodes.map((node) => {
          if (node.id === connection.source) {
            return {
              ...node,
              selected: true
            };
          }
          return node;
        });

        set({
          nodes: updatedNodes
        });
      },

      setDraggingNodeId: (id) => set({draggingNodeId: id}),

      selectNode: (nodeId) => {
        requestAnimationFrame(() => {
          set({
            nodes: get().nodes.map((node) => ({
              ...node,
              selected: node.id === nodeId
            }))
          });
        });
      },

      selectMultipleNodes: (nodeIds) => {
        requestAnimationFrame(() => {
          set({
            nodes: get().nodes.map((node) => ({
              ...node,
              selected: nodeIds.includes(node.id)
            }))
          });
        });
      },

      deselectAllNodes: () => {
        // Apply deselection immediately first to avoid race conditions
        set({
          nodes: get().nodes.map((node) => ({
            ...node,
            selected: false
          }))
        });

        // Also schedule via requestAnimationFrame to ensure visual updates
        requestAnimationFrame(() => {
          set({
            nodes: get().nodes.map((node) => ({
              ...node,
              selected: false
            }))
          });
        });
      },

      setViewportCenter: (center) => set({viewportCenter: center}),

      setIsPanning: (isPanning) => set({isPanning})
    }),
    {name: 'canvas-store'}
  )
);
