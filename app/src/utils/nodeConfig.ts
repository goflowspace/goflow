import {NodeTypes} from '@xyflow/react';

import {CustomEdge} from '@components/Conditions/CustomEdge';
import ChoiceNode from '@components/nodes/ChoiceNode/ChoiceNode';
import CommentNode from '@components/nodes/CommentNode/CommentNode';
import LayerNode from '@components/nodes/LayerNode/LayerNode';
import NarrativeNode from '@components/nodes/NarrativeNode/NarrativeNode';
import NoteNode from '@components/nodes/NoteNode/NoteNode';
import SkeletonNode from '@components/nodes/SkeletonNode/SkeletonNode';

// Определение типов узлов в React Go Flow
export const nodeTypes: NodeTypes = {
  narrative: NarrativeNode,
  choice: ChoiceNode,
  layer: LayerNode,
  note: NoteNode,
  title: NarrativeNode,
  skeleton: SkeletonNode,
  comment: CommentNode
};

// Определение типов связей в React Go Flow
export const edgeTypes = {
  default: CustomEdge
};
