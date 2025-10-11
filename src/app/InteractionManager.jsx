// app/InteractionManager.jsx
import { useEffect } from 'react'
import { useKeyboardControls } from '@react-three/drei'
import {useGameStore} from "../hooks/useGame.js";


/**
 * Interaktions-Manager (stabil, ohne Render-Loops):
 * - Subscribt auf "interact" (E) via KeyboardControls-Subscription (edge-triggered)
 * - ESC über native keydown
 * - Greift auf Store-Aktionen via getState() zu, damit keine instabilen Funktions-Refs
 *   in Dependency-Arrays Endlosschleifen verursachen.
 */
export default function InteractionManager() {
    // Subscription-API von drei:
    //  - subscribeKeys(selector, handler)
    //  - getKeys() für momentane Werte
    const [subscribeKeys, getKeys] = useKeyboardControls()

    useEffect(() => {
        // Handler für "E" gedrückt (nur auf rising edge)
        const unsubInteract = subscribeKeys(
            // selector: beobachte nur "interact"
            (state) => state.interact,

            // handler: wird bei jeder Änderung von "interact" aufgerufen
            (pressed) => {
                console.log(pressed)
                if (!pressed) return // nur KeyDown
                const {activeStationId, beginInteraction } = useGameStore.getState()
                if (!activeStationId) {
                    beginInteraction()
                }
            }
        )

        // ESC global – beendet Interaktion (falls aktiv)
        const onKeyDown = (e) => {
            if (e.key !== 'Escape') return
            const { activeStationId, endInteraction } = useGameStore.getState()
            if (activeStationId) endInteraction()
        }
        window.addEventListener('keydown', onKeyDown)

        return () => {
            unsubInteract()
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [subscribeKeys, getKeys])

    return null
}
