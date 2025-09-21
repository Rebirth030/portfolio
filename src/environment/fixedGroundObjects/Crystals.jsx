// src/environment/fixedGroundObjects/Crystals.jsx
import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { useControls, folder } from 'leva'
import * as THREE from 'three/webgpu'
import buildCrystalMaterial from '../../materials/buildCrystalMaterial.js'
import { InstancedFromRefsMesh } from '../../app/InstancedFromRefs.jsx'


function pickMeshByName(root, name) {
    return root.getObjectByName(name)
}

function prepareCrystalMesh(srcMesh, matParams) {
    const geo = srcMesh.geometry
    geo.computeVertexNormals()
    geo.computeBoundingBox()

    const bb = geo.boundingBox
    const yMin = bb.min.y
    const yMax = bb.max.y
    const center = new THREE.Vector3()
    bb.getCenter(center)

    const material = buildCrystalMaterial(
        srcMesh,
        matParams,
    )

    const mesh = new THREE.Mesh(geo, material)
    mesh.castShadow = false
    mesh.receiveShadow = true
    return mesh
}

export default function Crystals() {
    const {
        // Farben (künstlerische Tints)
        tintEdge, tintCenter, tintMix,

        // UV-Maske (Kante→Mitte)
        uvThreshold, uvSoftness,

        // Basisfarbe aus Position
        edgeGain, centerGain, baseBias, useNormalFallback,

        // Facetten-Konturen (UV/fwidth)
        edgeWidth, edgeStrength, edgeTint,

        // Ground-Bounce (Up-Tint)
        groundTint, groundIntensity,

        // Soft-Knee (Luma-Kompression)
        kneeStart, kneeMax, kneeStrength,

        // Fresnel / Emission
        rimPower, rimIntensity, dispersion,
    } = useControls('Crystals', {
        Colors: folder({
            tintEdge:   { value: '#8F00FF', label: 'Edge Tint' },
            tintCenter: { value: '#00F0FF', label: 'Center Tint' },
            tintMix:    { value: 0.0, min: 0, max: 1, step: 0.01, label: 'Tint Mix' },
        }, { collapsed: true }),

        UVMask: folder({
            uvThreshold: { value: 0.01, min: 0.0, max: 1.0, step: 0.001, label: 'Threshold' },
            uvSoftness:  { value: 0.20, min: 0.0, max: 1.0, step: 0.001, label: 'Softness' },
        }, { collapsed: true }),

        Base: folder({
            edgeGain:          { value: 0.90, min: 0.0, max: 3.0, step: 0.01, label: 'Edge Gain' },
            centerGain:        { value: 0.4, min: 0.0, max: 3.0, step: 0.01, label: 'Center Gain' },
            baseBias:          { value: 0.04, min: 0.0, max: 1.0, step: 0.001, label: 'Base Bias' },
            useNormalFallback: { value: true, label: 'Center Normal Fallback' },
        }, { collapsed: true }),

        Lines: folder({
            edgeWidth:    { value: 0.9, min: 0.1, max: 3.0, step: 0.01, label: 'Line Width (AA)' },
            edgeStrength: { value: 0.05, min: 0.0, max: 1.0, step: 0.01, label: 'Line Strength' },
            edgeTint:     { value: '#FFEFFF', label: 'Line Tint' },
        }, { collapsed: true }),

        Ground: folder({
            groundTint:      { value: '#9FCCB3', label: 'Ground Tint' },
            groundIntensity: { value: 0.15, min: 0.0, max: 1.0, step: 0.01, label: 'Intensity' },
        }, { collapsed: true }),

        SoftKnee: folder({
            // Hinweis: kneeMax sollte > kneeStart liegen
            kneeStart:    { value: 0.7, min: 0.0, max: 2.0, step: 0.01, label: 'Start' },
            kneeMax:      { value: 1.5, min: 0.5, max: 6.0, step: 0.01, label: 'Max' },
            kneeStrength: { value: 1.2, min: 0.1, max: 4.0, step: 0.01, label: 'Strength' },
        }, { collapsed: true }),

        RimEmission: folder({
            rimPower:    { value: 3.0, min: 0.5, max: 8.0, step: 0.05, label: 'Rim Power' },
            rimIntensity:{ value: 0.6, min: 0.0, max: 2.0, step: 0.01, label: 'Rim Intensity' },
            dispersion:  { value: 0.12, min: 0.0, max: 0.5, step: 0.005, label: 'Dispersion' },
        }, { collapsed: true }),
    }, { collapsed: true })

    const matParams = useMemo(() => ({

        tintEdge,
        tintCenter,
        tintMix,

        // UV-Maske
        uvThreshold,
        uvSoftness,

        // Basisfarbe aus Position
        edgeGain,
        centerGain,
        baseBias,
        useNormalFallback,

        // Facetten-Konturen
        edgeWidth,
        edgeStrength,
        edgeTint,

        // Ground-Bounce
        groundTint,
        groundIntensity,

        // Soft-Knee
        kneeStart,
        kneeMax,
        kneeStrength,

        // Emission
        rimPower,
        rimIntensity,
        dispersion,
    }), [
        tintEdge, tintCenter, tintMix,
        uvThreshold, uvSoftness,
        edgeGain, centerGain, baseBias, useNormalFallback,
        edgeWidth, edgeStrength, edgeTint,
        groundTint, groundIntensity,
        kneeStart, kneeMax, kneeStrength,
        rimPower, rimIntensity, dispersion,
    ])

    const gltf = useGLTF('/Models.glb', true)

    const mesh1 = useMemo(() => {
        const m = pickMeshByName(gltf.scene, 'C_Cluster1')
        return m ? prepareCrystalMesh(m, matParams) : null
    }, [gltf, matParams])

    const mesh2 = useMemo(() => {
        const m = pickMeshByName(gltf.scene, 'C_Cluster2')
        return m ? prepareCrystalMesh(m, matParams) : null
    }, [gltf, matParams])

    const mesh3 = useMemo(() => {
        const m = pickMeshByName(gltf.scene, 'C_Cluster3')
        return m ? prepareCrystalMesh(m, matParams) : null
    }, [gltf, matParams])

    return (
        <>
            {mesh1 && (
                <InstancedFromRefsMesh
                    modelMesh={mesh1}
                    refsUrl="/Instances.glb"
                    filter={(o) => o.isMesh && o.name.startsWith('Crystal_1_Instance')}
                    position={[0, -20, 0]}
                    frustumCulled={false}
                    physics
                />
            )}
            {mesh2 && (
                <InstancedFromRefsMesh
                    modelMesh={mesh2}
                    refsUrl="/Instances.glb"
                    filter={(o) => o.isMesh && o.name.startsWith('Crystal_2_Instance')}
                    position={[0, -20, 0]}
                    frustumCulled={false}
                    physics
                />
            )}
            {mesh3 && (
                <InstancedFromRefsMesh
                    modelMesh={mesh3}
                    refsUrl="/Instances.glb"
                    filter={(o) => o.isMesh && o.name.startsWith('Crystal_3_Instance')}
                    position={[0, -20, 0]}
                    frustumCulled={false}
                    physics
                />
            )}
        </>
    )
}
