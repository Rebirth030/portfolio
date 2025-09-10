// src/components/trees/InstancedTrees.jsx
import { useMemo, useEffect } from 'react'
import { useControls, folder } from 'leva'
import { InstancedFromRefs, InstancedFromRefsMesh } from '../InstancedFromRefs.jsx'
import { createSpruceTopMesh } from './SpruceTreeTop.jsx'
import createOakMesh from './OakLeaves.jsx'
import * as THREE from 'three'

export default function InstancedTrees() {
    // — Meshes einmalig erzeugen —
    const spruceMesh = useMemo(() => createSpruceTopMesh(), [])
    const oakMesh    = useMemo(() => createOakMesh(), [])

    // --- Leva: Alles in einem Ordner, Unterordner "Oak" & "Spruce" ---
    const {
        // Oak
        oakThreshold, oakSoftness, oakAlphaTest,
        oakInnerR, oakOuterR, oakFadeStr,
        oakBacklight,
        // Spruce
        spThreshold, spSoftness, spAlphaTest,
        spInnerR, spOuterR, spFadeStr,
        spBacklight
    } = useControls('Tree Leaves', {
        Oak: folder({
            Cutout: folder({
                oakThreshold: { value: 0.50, min: 0.0, max: 1.0, step: 0.001, label: 'threshold' },
                oakSoftness:  { value: 1.00, min: 0.0, max: 4.0, step: 0.01,  label: 'softness'  },
                oakAlphaTest: { value: 0.50, min: 0.0, max: 1.0, step: 0.01,  label: 'alphaTest' }
            }, { collapsed: true }),
            ScreenFade: folder({
                oakInnerR:  { value: 0.09, min: 0.0, max: 0.5, step: 0.001, label: 'innerRadius' },
                oakOuterR:  { value: 0.18, min: 0.0, max: 0.8, step: 0.001, label: 'outerRadius' },
                oakFadeStr: { value: 1.00, min: 0.0, max: 1.0, step: 0.01,  label: 'fadeStrength' }
            }, { collapsed: true }),
            Shading: folder({
                oakBacklight: { value: 0.18, min: 0.0, max: 0.6, step: 0.01, label: 'backlight' }
            }, { collapsed: true })
        }, { collapsed: true }),

        Spruce: folder({
            Cutout: folder({
                spThreshold: { value: 0.50, min: 0.0, max: 1.0, step: 0.001, label: 'threshold' },
                spSoftness:  { value: 1.00, min: 0.0, max: 4.0, step: 0.01,  label: 'softness'  },
                spAlphaTest: { value: 0.50, min: 0.0, max: 1.0, step: 0.01,  label: 'alphaTest' }
            }, { collapsed: true }),
            ScreenFade: folder({
                spInnerR:  { value: 0.02, min: 0.0, max: 0.5, step: 0.0005, label: 'innerRadius' },
                spOuterR:  { value: 0.18,   min: 0.0, max: 0.8, step: 0.001,  label: 'outerRadius' },
                spFadeStr: { value: 1.00,   min: 0.0, max: 1.0, step: 0.01,   label: 'fadeStrength' }
            }, { collapsed: true }),
            Shading: folder({
                spBacklight: { value: 0.16, min: 0.0, max: 0.6, step: 0.01, label: 'backlight' }
            }, { collapsed: true })
        }, { collapsed: true })
    }, { collapsed: true })

    // — Oak: Uniforms & Material-Settings live aktualisieren —
    useEffect(() => {
        const mat = oakMesh?.material
        const ctrl = mat?.userData?.leafSdfControls
        if (!ctrl) return
        ctrl.uThreshold.value = oakThreshold
        ctrl.uSoftness.value  = oakSoftness
        ctrl.uInnerR.value    = oakInnerR
        ctrl.uOuterR.value    = oakOuterR
        ctrl.uFadeStr.value   = oakFadeStr
        ctrl.uBacklight.value = oakBacklight
        if (mat.alphaTest !== oakAlphaTest) { mat.alphaTest = oakAlphaTest; mat.needsUpdate = true }
    }, [oakMesh, oakThreshold, oakSoftness, oakInnerR, oakOuterR, oakFadeStr, oakBacklight, oakAlphaTest])

    // — Spruce: Uniforms & Material-Settings live aktualisieren —
    useEffect(() => {
        const mat = spruceMesh?.material
        const ctrl = mat?.userData?.leafSdfControls
        if (!ctrl) return
        ctrl.uThreshold.value = spThreshold
        ctrl.uSoftness.value  = spSoftness
        ctrl.uInnerR.value    = spInnerR
        ctrl.uOuterR.value    = spOuterR
        ctrl.uFadeStr.value   = spFadeStr
        ctrl.uBacklight.value = spBacklight
        if (mat.alphaTest !== spAlphaTest) { mat.alphaTest = spAlphaTest; mat.needsUpdate = true }
    }, [spruceMesh, spThreshold, spSoftness, spInnerR, spOuterR, spFadeStr, spBacklight, spAlphaTest])

    return (
        <>
            {/* Oak stems */}
            <InstancedFromRefs
                modelUrl="/OakTreeStem.glb"
                refsUrl="/OakTreeInstances.glb"
                filter={(o) => o.isMesh && o.name.startsWith('OakTree')}
                castShadow
                receiveShadow
                position={[0, -20, 0]}
                physics
                colliderMode="base"
                baseHeight={1}
                baseRadius={0.45}
            />

            {/* Oak leaves */}
            <InstancedFromRefsMesh
                modelMesh={oakMesh}
                refsUrl="/OakTreeLeafInstances.glb"
                filter={(o) => o.isMesh && o.name.startsWith('OakTreeLeaf')}
                castShadow
                receiveShadow
                position={[0, -20, 0]}
                wind={{
                    windDirectionX: -1.0,
                    windDirectionZ:  1.0,
                    windSpeed:       0.2,
                    windScale1:      0.06,
                    windScale2:      0.055,
                    heightDivisor:   0.25,
                    strength:        0.3,
                }}
            />

            {/* Spruce crown */}
            <InstancedFromRefsMesh
                modelMesh={spruceMesh}
                refsUrl="/Tree3Instances.glb"
                filter={(o) => o.isMesh && o.name.startsWith('Tree3')}
                castShadow
                receiveShadow
                position={[0, -15, 0]}
                wind={{
                    windDirectionX: -1.0,
                    windDirectionZ:  1.0,
                    windSpeed:       0.2,
                    windScale1:      0.06,
                    windScale2:      0.055,
                    heightDivisor:   0.25,
                    strength:        0.3,
                }}
            />

            {/* Tree3 stems */}
            <InstancedFromRefs
                modelUrl="/Tree3Stem.glb"
                refsUrl="/Tree3Instances.glb"
                filter={(o) => o.isMesh && o.name.startsWith('Tree3')}
                castShadow
                receiveShadow
                position={[0, -20, 0]}
                physics
            />
        </>
    )
}
