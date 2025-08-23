import { create } from 'zustand'

export default create((set, get) => ({
  phase: 'ready',

  start: () => {
    if (get().phase === 'ready') set({ phase: 'running' })
  },
  reload: () => {
    const p = get().phase
    if (p === 'running' || p === 'ended') set({ phase: 'ready' })
  },
  final: () => {
    if (get().phase === 'running') set({ phase: 'ended' })
  },
}))
