// app/InteractionManager.jsx
import { useEffect } from 'react'
import { useKeyboardControls } from '@react-three/drei'
import { useGameStore } from '../hooks/useGame.js'

export default function InteractionManager() {
    const [subscribeKeys] = useKeyboardControls()

    useEffect(() => {
        const unsubInteract = subscribeKeys(
            (s) => s.interact,
            (pressed) => {
                if (!pressed) return
                const { activeStationId, beginInteraction } = useGameStore.getState()
                if (activeStationId) beginInteraction(activeStationId)
            }
        )

        const unsubExit = subscribeKeys(
            (s) => s.escape,
            (pressed) => {
                if (!pressed) return
                const { overlayStationId, endInteraction } = useGameStore.getState()
                if (overlayStationId) endInteraction()
            }
        )

        return () => {
            unsubInteract()
            unsubExit()
        }
    }, [subscribeKeys])

    return null
}
