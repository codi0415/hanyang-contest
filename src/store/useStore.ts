import { create } from 'zustand';
import { HistoryItem, Risk } from '../types';

export type Screen = 'onboarding' | 'main' | 'history' | 'settings';

export interface Settings {
  voice: boolean;
  haptic: boolean;
  rate: number;   // 0.6 ~ 1.8
  volume: number; // 0 ~ 1
  conf: number;   // 0.3 ~ 0.9 (감지 신뢰도 임계값)
  live: boolean;  // true=WS, false=Mock
  wsUrl: string;
}

interface State {
  screen: Screen;
  settings: Settings;
  history: HistoryItem[];
  setScreen: (s: Screen) => void;
  patchSettings: (p: Partial<Settings>) => void;
  pushHistory: (item: Omit<HistoryItem, 'id' | 'time'> & { risk: Risk }) => void;
}

let histSeq = 0;
let lastKey = '';
let lastAt = 0;

export const useStore = create<State>((set, get) => ({
  screen: 'onboarding',
  settings: {
    voice: true,
    haptic: true,
    rate: 1.0,
    volume: 1.0,
    conf: 0.6,
    live: false,
    wsUrl: 'ws://127.0.0.1:8000/ws/stream',
  },
  history: [],
  setScreen: (screen) => set({ screen }),
  patchSettings: (p) => set((st) => ({ settings: { ...st.settings, ...p } })),
  pushHistory: (item) => {
    const now = Date.now();
    const key = item.label;
    if (key === lastKey && now - lastAt < 5000) return; // 같은 유형 5초 내 중복 억제
    lastKey = key;
    lastAt = now;
    const d = new Date(now);
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const entry: HistoryItem = { ...item, id: `h${++histSeq}`, time };
    set((st) => ({ history: [entry, ...st.history].slice(0, 40) }));
  },
}));
