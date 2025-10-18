import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useControls, folder } from 'leva'
import * as THREE from 'three/webgpu'
import { useGameStore } from '../hooks/useGame.js'

export default function CameraController({ playerRef }) {
    const smoothedPos = useMemo(() => new THREE.Vector3(), [])
    const smoothedTg = useMemo(() => new THREE.Vector3(), [])
    const tmpPos = useMemo(() => new THREE.Vector3(), [])
    const tmpTg = useMemo(() => new THREE.Vector3(), [])

    const transitionRef = useRef(null)

    const {
        cameraFollowing,
        cameraOffsetY,
        cameraOffsetZ,
        cameraTargetOffsetY,
        cameraLerpFactor,
    } = useControls(
        'Camera',
        {
            Follow: folder({
                cameraFollowing: { value: true, label: 'Enable Follow' },
                cameraOffsetY: { value: 16.2, min: 0, max: 20, step: 0.1, label: 'Offset Y' },
                cameraOffsetZ: { value: 15.6, min: 1, max: 20, step: 0.1, label: 'Offset Z (behind)' },
                cameraTargetOffsetY: { value: 0.3, min: 0, max: 5, step: 0.1, label: 'Target Y' },
                cameraLerpFactor: { value: 5.0, min: 1, max: 20, step: 0.1, label: 'Lerp Factor' },
            }),
        },
        { collapsed: false },
    )

    // Kamera-API im Store registrieren
    const setCameraApi = useGameStore((s) => s.setCameraApi)
    useEffect(() => {
        const api = {
            focusTo: (focusPose, duration = 1.0) =>
                new Promise((resolve) => {
                    transitionRef.current = {
                        start: performance.now(),
                        duration: duration * 1000,
                        fromPos: smoothedPos.clone(),
                        fromTg: smoothedTg.clone(),
                        toPos: new THREE.Vector3().fromArray(focusPose.position),
                        toTg: new THREE.Vector3().fromArray(focusPose.target),
                        resolve,
                    }
                }),
        }
        setCameraApi(api)
        return () => setCameraApi(null)
    }, [setCameraApi, smoothedPos, smoothedTg])

    const applyCamera = (state) => {
        state.camera.position.copy(smoothedPos)
        state.camera.lookAt(smoothedTg)
    }

    useFrame((state, delta) => {
        const transition = transitionRef.current
        const { inputLocked } = useGameStore.getState()

        // Fokus-Übergang
        if (transition) {
            const t = (performance.now() - transition.start) / transition.duration
            const a = Math.min(Math.max(t, 0), 1) // clamp [0,1]
            smoothedPos.lerpVectors(transition.fromPos, transition.toPos, a)
            smoothedTg.lerpVectors(transition.fromTg, transition.toTg, a)
            applyCamera(state)
            if (t >= 1) {
                transition.resolve?.()
                transitionRef.current = null
            }
            return
        }

        // Follow-Modus (nur wenn Inputs nicht gesperrt)
        if (!inputLocked) {
            const bodyApi = playerRef?.current
            if (!bodyApi || !cameraFollowing) return

            const p = bodyApi.translation()
            tmpPos.set(p.x, p.y + cameraOffsetY, p.z + cameraOffsetZ)
            tmpTg.set(p.x, p.y + cameraTargetOffsetY, p.z)

            smoothedPos.lerp(tmpPos, cameraLerpFactor * delta)
            smoothedTg.lerp(tmpTg, cameraLerpFactor * delta)

            applyCamera(state)
        }
    })

    return null
}
