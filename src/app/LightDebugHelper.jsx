// src/debug/LightDebugHelpers.jsx
import { useEffect, useRef, useState } from 'react'
import { useHelper } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Visualisiert ein DirectionalLight:
 * - DirectionalLightHelper (zeigt Position & Richtung)
 * - CameraHelper für die Shadow-OrthographicCamera (zeigt Frustum/Abdeckung)
 */
export default function LightDebugHelpers({
                                              lightRef,               // ref auf <directionalLight />
                                              enabled = true,
                                              showFrustum = true,
                                              color = '#00ffff',
                                              size = 2                // Größe der Light-Hilfsgeometrie
                                          }) {
    // DirectionalLight-Helfer (Position/Richtung)
    useHelper(enabled ? lightRef : null, THREE.DirectionalLightHelper, size, color)

    // Shadow-Camera-Helfer (Abdeckung/Frustum)
    const camRef = useRef(null)
    const [ready, setReady] = useState(false)

    useEffect(() => {
        if (!enabled || !lightRef?.current?.shadow?.camera) return
        camRef.current = lightRef.current.shadow.camera
        setReady(true)
    }, [enabled, lightRef])

    useHelper(enabled && showFrustum && ready ? camRef : null, THREE.CameraHelper, color)

    return null
}
