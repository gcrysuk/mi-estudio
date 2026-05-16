import { useUndoContext } from '../context/UndoContext';

export function useUndo() {
  const { pushUndo, undoLast, removeById, stack } = useUndoContext();
  return { pushUndo, undoLast, removeById, canUndo: stack.length > 0 };
}
