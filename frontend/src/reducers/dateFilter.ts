type Range = 'week' | 'month' | 'year' | 'custom';
type State = { range: Range; start: Date; end: Date; isLoading: boolean };
type Action =
  | { type: 'SET_RANGE'; range: Range }
  | { type: 'SET_START'; start: Date }
  | { type: 'SET_END'; end: Date }
  | { type: 'LOADING'; value: boolean };

export function makeInitial(range: Range): State {
  const now = new Date();
  const start =
    range === 'week' ? new Date(now.getTime() - 7*864e5) :
    range === 'month' ? new Date(now.getTime() - 30*864e5) :
    range === 'year' ? new Date(now.getTime() - 365*864e5) : new Date(now.getTime() - 7*864e5);
  return { range, start, end: now, isLoading: false };
}

export function dateFilterReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_RANGE': {
      if (action.range === 'custom') return { ...state, range: 'custom' };
      return makeInitial(action.range);
    }
    case 'SET_START': return { ...state, start: action.start };
    case 'SET_END': return { ...state, end: action.end };
    case 'LOADING': return { ...state, isLoading: action.value };
    default: return state;
  }
}
