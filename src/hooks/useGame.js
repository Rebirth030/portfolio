// app/state/useGameStore.js
import { create } from 'zustand'
import { getFocusPose } from '../app/constants/stations.js'

export const useGameStore = create((set, get) => ({
    // Player-/Overlay-State
    activeStationId: null,    // von Zonen gesetzt/gelöscht
    overlayStationId: null,   // steuert das Overlay direkt
    inputLocked: false,
    cameraApi: null,

    // Kamera-API aus CameraController registrieren
    setCameraApi: (api) => set({ cameraApi: api }),

    // von Zonen aufgerufen
    setActiveStation: (id) => set({ activeStationId: id }),
    getActiveStation: () => get().activeStationId,

    // Interaktion: Fokusfahrt → Overlay öffnen
    beginInteraction: async (id) => {
        if (!id) return
        const { cameraApi } = get()
        const pose = getFocusPose(id)
        if (!cameraApi || !pose) return

        try {
            await cameraApi.focusTo(pose, 1.0)
            set({ inputLocked: true, overlayStationId: id })
        } catch {
            set({ inputLocked: false, overlayStationId: null })
        }
    },

    // Interaktion beenden
    endInteraction: () => {
        set({ inputLocked: false, overlayStationId: null })
    },
}))
