// app/state/useGameStore.js
import { create } from 'zustand'

export const useGameStore = create((set, get) => ({
    mode: 'Explore',
    activeStationId: null,
    inputLocked: false,
    cameraApi: null,

    focusPoints: new Set([

        ]
    ),


    beginInteraction: async () => {
        const { cameraApi, zones } = get()
        if (!cameraApi) return
        const entry = activeStationId
        const focusPose = entry?.focusPose
        if (!focusPose) return

        set({inputLocked: true })
        try {
            await cameraApi.focusTo(focusPose)
            // Später ggf.: set({ mode: 'Overlay' })
        } catch {
            await cameraApi.returnToSnapshot().catch(() => {})
            set({ activeStationId: null, inputLocked: false })
        }
    },

    endInteraction: async () => {
        const { cameraApi } = get()
        if (!cameraApi) return
        try {
            await cameraApi.returnToSnapshot()
        } finally {
            set({ activeStationId: null, inputLocked: false, mode: 'Explore' })
        }
    },

    setCameraApi: (api) => set({ cameraApi: api }),


    setActiveStation: (id) => {
        set({ activeStationId: id })
        console.log('Station set to:', id)
    },

    getActiveStation: () => {
        return get().activeStationId
    },
}))
