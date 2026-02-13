import {useCallback, useState} from 'react';

import {CanvasCommentPosition} from '../types/canvas';
import {ThreadContextData, ThreadContextType} from '../types/comments';

interface CommentCreationState {
  position: CanvasCommentPosition;
  contextType: ThreadContextType;
  contextData: ThreadContextData;
}

export const useCommentCreation = () => {
  const [creatingComment, setCreatingComment] = useState<CommentCreationState | null>(null);

  const startCreatingComment = useCallback((state: CommentCreationState) => {
    setCreatingComment(state);
  }, []);

  const stopCreatingComment = useCallback(() => {
    setCreatingComment(null);
  }, []);

  return {
    creatingComment,
    isCreatingComment: creatingComment !== null,
    startCreatingComment,
    stopCreatingComment
  };
};
