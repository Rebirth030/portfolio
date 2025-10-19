import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { folder, useControls } from 'leva'
import * as THREE from 'three'
import LightDebugHelpers from '../app/LightDebugHelper.jsx'

export default function SceneLights({ playerRef }) {
    const anchorRef = useRef()
    const orbitRef  = useRef()
    const dirRef    = useRef()
    const targetRef = useRef()
    const ambRef    = useRef()
    const frameRef  = useRef(0)


    // --- Leva ---
    const {
        ambColor, ambIntensity,
        color, intensity,
        radius, height, azimuthDeg, targetYOffset,
        shadowSize, shadowNear, shadowFar, shadowMapSize,
        shadowBias, shadowNormalBias,
        castShadow, shadowFrameSkip, shadowMoveEps,
        showHelpers, showFrustum, helperColor, helperSize
    } = useControls('Lighting', {
        Ambient: folder({
            ambColor: { value: '#b7c9ff' },
            ambIntensity: { value: 0.61, min: 0, max: 3, step: 0.01 },
        }, { collapsed: true }),
        Directional: folder({
            color: { value: '#ddddff' },
            intensity: { value: 0.50, min: 0, max: 5, step: 0.01 },
            radius: { value: 84.7, min: 0, max: 200, step: 0.1 },
            height: { value: 46.1, min: 0, max: 200, step: 0.1 },
            azimuthDeg: { value: 90, min: 0, max: 360, step: 1 },
            targetYOffset: { value: 0, min: -10, max: 10, step: 0.1 },
            castShadow: { value: true }
        }, { collapsed: true }),
        Shadows: folder({
            shadowSize: { value: 59, min: 10, max: 100, step: 1 },
            shadowNear: { value: 33, min: 0.01, max: 50, step: 0.01 },
            shadowFar:  { value: 146, min: 10, max: 300, step: 1 },
            shadowMapSize: { options: [512, 1024, 2048, 4096], value: 1024 },
            shadowBias: { value: -0.0005, min: -0.01, max: 0.01, step: 0.0001 },
            shadowNormalBias: { value: 0.5, min: 0, max: 4, step: 0.01 },
            shadowFrameSkip: { value: 1, min: 1, max: 6, step: 1 },   // nur jede N-te Frame Shadow updaten
            shadowMoveEps:   { value: 0.25, min: 0, max: 2, step: 0.01 }, // Mindestbewegung (Meter), bevor Shadow refresh
        }, { collapsed: true }),
        Debug: folder({
            showHelpers: { value: false },
            showFrustum: { value: false },
            helperColor: { value: '#00ffff' },
            helperSize:  { value: 2, min: 0.5, max: 10, step: 0.5 },
        }, { collapsed: true })
    }, { collapsed: true })

    // --- statische/selten ändernde Einstellungen ---
    useEffect(() => {
        if (!dirRef.current) return
        const L = dirRef.current
        L.color.set(color)
        L.intensity = intensity
        L.castShadow = castShadow

        // Shadow-Setup
        L.shadow.mapSize.set(shadowMapSize, shadowMapSize)
        L.shadow.bias = shadowBias
        L.shadow.normalBias = shadowNormalBias

        const cam = L.shadow.camera
        cam.left   = -shadowSize
        cam.right  =  shadowSize
        cam.top    =  shadowSize
        cam.bottom = -shadowSize
        cam.near   = shadowNear
        cam.far    = shadowFar
        cam.updateProjectionMatrix()

        // sehr wichtig: Shadow nur bei Bedarf neu rendern
        L.shadow.autoUpdate = false
    }, [color, intensity, castShadow, shadowMapSize, shadowBias, shadowNormalBias, shadowSize, shadowNear, shadowFar])

    // Licht-Grundsetup + Shadows
    useEffect(() => {
        const L = dirRef.current
        if (!L) return
        L.color.set(color)
        L.intensity = intensity
        L.castShadow = castShadow
        L.shadow.mapSize.set(shadowMapSize, shadowMapSize)
        L.shadow.bias = shadowBias
        L.shadow.normalBias = shadowNormalBias
        const cam = L.shadow.camera
        cam.left = -shadowSize; cam.right = shadowSize
        cam.top  =  shadowSize; cam.bottom = -shadowSize
        cam.near = shadowNear;  cam.far    = shadowFar
        cam.updateProjectionMatrix()
        L.shadow.autoUpdate = false
    }, [color, intensity, castShadow, shadowMapSize, shadowBias, shadowNormalBias, shadowSize, shadowNear, shadowFar])

    // Orbit/Offsets nur bei Regleränderung
    useEffect(() => {
        if (!orbitRef.current || !dirRef.current || !targetRef.current) return
        orbitRef.current.rotation.y = THREE.MathUtils.degToRad(azimuthDeg)
        dirRef.current.position.set(0, height, radius)
        targetRef.current.position.set(0, targetYOffset, 0)
        dirRef.current.shadow.needsUpdate = true
    }, [azimuthDeg, height, radius, targetYOffset])

    // Ambient
    useEffect(() => {
        if (!ambRef.current) return
        ambRef.current.color.set(ambColor)
        ambRef.current.intensity = ambIntensity
    }, [ambColor, ambIntensity])

    // 🔒 Ziel-Verlinkung: Licht zeigt IMMER auf targetRef (Kind des Anchors)
    useEffect(() => {
        const L = dirRef.current
        const T = targetRef.current
        if (L && T) {
            L.target = T
            // einmal sicherstellen, dass die Weltmatrix frisch ist
            T.updateMatrixWorld()
            L.shadow.needsUpdate = true
        }
    }, [])

    // Folgen + Shadow-Throttle
    const last = useMemo(() => new THREE.Vector3(1e9, 1e9, 1e9), [])
    useFrame(() => {
        const body = playerRef?.current
        const L = dirRef.current
        const anchor = anchorRef.current
        if (!body || !L || !anchor) return
        const p = body.translation?.()
        if (!p) return

        const dx = p.x - last.x, dy = p.y - last.y, dz = p.z - last.z
        const moved2 = dx*dx + dy*dy + dz*dz
        if (moved2 > shadowMoveEps * shadowMoveEps) {
            anchor.position.set(p.x, p.y, p.z)
            last.set(p.x, p.y, p.z)

            // nur jede N-te Frame Shadow updaten
            frameRef.current++
            if (frameRef.current % shadowFrameSkip === 0) {
                L.shadow.needsUpdate = true
            }
        }
    })

    return (
        <>
            <ambientLight ref={ambRef} />
            {/* Anchor folgt dem Spieler; Target hängt am Anchor → zeigt immer auf den Player */}
            <group ref={anchorRef}>
                <object3D ref={targetRef} />
                <group ref={orbitRef}>
                    <directionalLight
                        ref={dirRef}
                        color={color}
                        intensity={intensity}
                        castShadow={castShadow}
                        shadow-mapSize={[shadowMapSize, shadowMapSize]}
                        shadow-camera-near={shadowNear}
                        shadow-camera-far={shadowFar}
                        shadow-camera-left={-shadowSize}
                        shadow-camera-right={shadowSize}
                        shadow-camera-top={shadowSize}
                        shadow-camera-bottom={-shadowSize}
                    />
                    {showHelpers && (
                        <LightDebugHelpers
                            lightRef={dirRef}
                            enabled={showHelpers}
                            showFrustum={showFrustum}
                            color={helperColor}
                            size={helperSize}
                        />
                    )}
                </group>
            </group>
        </>
    )
}