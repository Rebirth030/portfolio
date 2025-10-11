// app/CameraController.jsx
import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useControls, folder } from 'leva'
import * as THREE from 'three/webgpu'
import {useGameStore} from "../hooks/useGame.js";


export default function CameraController({ playerRef }) {
    const smoothedPos = useMemo(() => new THREE.Vector3(), [])
    const smoothedTg  = useMemo(() => new THREE.Vector3(), [])
    const tmpPos      = useMemo(() => new THREE.Vector3(), [])
    const tmpTg       = useMemo(() => new THREE.Vector3(), [])

    const snapshotRef = useRef(null)
    const transitionRef = useRef(null)

    const {
        cameraFollowing,
        cameraOffsetY,
        cameraOffsetZ,
        cameraTargetOffsetY,
        cameraLerpFactor,
    } = useControls('Camera', {
        Follow: folder({
            cameraFollowing:     { value: true, label: 'Enable Follow' },
            cameraOffsetY:       { value: 16.2,  min: 0,  max: 20, step: 0.1, label: 'Offset Y' },
            cameraOffsetZ:       { value: 15.6,  min: 1,  max: 20, step: 0.1, label: 'Offset Z (behind)' },
            cameraTargetOffsetY: { value: 0.3,   min: 0,  max: 5,  step: 0.1, label: 'Target Y' },
            cameraLerpFactor:    { value: 5.0,   min: 1,  max: 20, step: 0.1, label: 'Lerp Factor' },
        }),
    }, { collapsed: false })

    // API für Focus/Rückkehr im Store registrieren
    const setCameraApi = useGameStore(s => s.setCameraApi)
    useEffect(() => {
        const api = {
            focusTo: (focusPose, duration = 1.0) => {
                return new Promise((resolve) => {
                    snapshotRef.current = {
                        pos: smoothedPos.clone(),
                        tg:  smoothedTg.clone(),
                    }
                    transitionRef.current = {
                        type: 'focus',
                        start: performance.now(),
                        duration: duration * 1000,
                        fromPos: smoothedPos.clone(),
                        fromTg:  smoothedTg.clone(),
                        toPos:   new THREE.Vector3().fromArray(focusPose.position),
                        toTg:    new THREE.Vector3().fromArray(focusPose.target),
                        resolve,
                    }
                })
            },
            returnToSnapshot: (duration = 1.0) => {
                return new Promise((resolve) => {
                    const snap = snapshotRef.current
                    if (!snap) {
                        resolve()
                        return
                    }
                    transitionRef.current = {
                        type: 'return',
                        start: performance.now(),
                        duration: duration * 1000,
                        fromPos: smoothedPos.clone(),
                        fromTg:  smoothedTg.clone(),
                        toPos:   snap.pos.clone(),
                        toTg:    snap.tg.clone(),
                        resolve,
                    }
                    snapshotRef.current = null
                })
            },
        }
        setCameraApi(api)
        return () => setCameraApi(null)
    }, [setCameraApi, smoothedPos, smoothedTg])

    useFrame((state, delta) => {
        const transition = transitionRef.current
        if (transition) {
            const t = (performance.now() - transition.start) / transition.duration
            if (t >= 1) {
                smoothedPos.copy(transition.toPos)
                smoothedTg.copy(transition.toTg)
                state.camera.position.copy(smoothedPos)
                state.camera.lookAt(smoothedTg)
                transition.resolve?.()
                transitionRef.current = null
                return
            } else {
                smoothedPos.lerpVectors(transition.fromPos, transition.toPos, t)
                smoothedTg.lerpVectors(transition.fromTg, transition.toTg, t)
                state.camera.position.copy(smoothedPos)
                state.camera.lookAt(smoothedTg)
                return
            }
        }

        // Follow-Modus
        const bodyApi = playerRef?.current
        if (!bodyApi || !cameraFollowing) return

        const p = bodyApi.translation()
        tmpPos.set(p.x, p.y + cameraOffsetY, p.z + cameraOffsetZ)
        tmpTg.set(p.x, p.y + cameraTargetOffsetY, p.z)

        smoothedPos.lerp(tmpPos, cameraLerpFactor * delta)
        smoothedTg .lerp(tmpTg,  cameraLerpFactor * delta)

        state.camera.position.copy(smoothedPos)
        state.camera.lookAt(smoothedTg)
    })

    return null
}
