// InstancedFromRefs.jsx
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { useLoader } from '@react-three/fiber'
import { useMemo, useLayoutEffect, useEffect, useRef } from 'react'
import buildNodeMaterialFromExisting from '../utils/buildNodeMaterialFromExisting.js'

// TSL (für optionalen Wind, nur fürs Material)
import { positionWorld, positionLocal } from 'three/tsl'
import { buildWindOffsetNode, defaultWind } from '../utils/wind.js'

// Physik
import { InstancedRigidBodies } from '@react-three/rapier'

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function collectInstanceMatrixArray(root, { filter, relativeTo = null } = {}) {
    const accept =
        filter ||
        ((o) => {
            const n = (o.name || '').toLowerCase()
            if (o.isLight || o.isCamera || o.isBone) return false
            return n.startsWith('ref') || n.includes('instance') || n.startsWith('tree') || o.userData?.ref === true
        })

    root.updateMatrixWorld(true)
    if (relativeTo) relativeTo.updateMatrixWorld(true)

    const parentInv = new THREE.Matrix4()
    if (relativeTo) parentInv.copy(relativeTo.matrixWorld).invert()

    let count = 0
    root.traverse((o) => { if (o.isObject3D && accept(o)) count++ })

    const out = new Float32Array(count * 16)
    const m = new THREE.Matrix4()
    let offset = 0

    root.traverse((o) => {
        if (!o.isObject3D || !accept(o)) return
        m.copy(o.matrixWorld)
        if (relativeTo) m.premultiply(parentInv)
        m.toArray(out, offset)
        offset += 16
    })

    return out
}

function getFirstMesh(scene) {
    let mesh = null
    scene.traverse((o) => { if (!mesh && o.isMesh && o.geometry) mesh = o })
    return mesh
}

/** Lädt (einmal) Noise-Textur & baut Wind-Optionen – ohne Duplikate. */
function useWindResources(wind) {
    const noiseTex = useLoader(THREE.TextureLoader, '/noiseTexture.png')
    useEffect(() => {
        if (wind && noiseTex) {
            noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping
            noiseTex.minFilter = THREE.LinearMipMapLinearFilter
            noiseTex.magFilter = THREE.LinearFilter
        }
    }, [wind, noiseTex])

    const windOpts = useMemo(
        () => (typeof wind === 'object' ? { ...defaultWind, ...wind } : defaultWind),
        [wind]
    )

    return { noiseTex, windOpts }
}

/** Wendet Wind (falls aktiv) auf ein NodeMaterial an. */
function applyWindToMaterial(material, { noiseTex, windOpts }, wind) {
    if (!wind || !noiseTex) return material
    const worldPos   = positionWorld
    const offsetNode = positionLocal
    const windOffset = buildWindOffsetNode({
        noiseTex,
        worldPos,
        offsetNode,
        params: windOpts,
        mapXZTo: 'xy->(x, y)',
    })
    material.positionNode = offsetNode.add(windOffset)
    material.needsUpdate = true
    return material
}

// -----------------------------------------------------------------------------
// Core (gemeinsam für beide Varianten)
// -----------------------------------------------------------------------------
function InstancedFromRefsCore({
                                   source,                // { geometry, material } – REQUIRED
                                   refsUrl,               // GLB mit Instanz-Refs – REQUIRED
                                   filter,
                                   relativeTo = null,
                                   frustumCulled = false,
                                   physics = false,
                                   ...props               // Transform + Render-Props
                               }) {
    const refs = useGLTF(refsUrl, true)

    const mats = useMemo(
        () => collectInstanceMatrixArray(refs.scene, { filter, relativeTo }),
        [refs, filter, relativeTo]
    )

    const count = mats.length / 16
    const meshRef = useRef()

    // Visuales Instancing nur ohne Physik selbst setzen
    useLayoutEffect(() => {
        if (physics) return
        const im = meshRef.current
        if (!im || count === 0) return
        if (im.instanceMatrix && im.instanceMatrix.array && im.instanceMatrix.array.length === mats.length) {
            im.instanceMatrix.array.set(mats)
            im.instanceMatrix.needsUpdate = true
        } else {
            const tmp = new THREE.Matrix4()
            for (let i = 0; i < count; i++) {
                tmp.fromArray(mats, i * 16)
                im.setMatrixAt(i, tmp)
            }
            im.instanceMatrix.needsUpdate = true
        }
    }, [mats, count, physics])

    useEffect(() => {
        if (!physics && meshRef.current?.instanceMatrix) {
            meshRef.current.instanceMatrix.setUsage(THREE.StaticDrawUsage)
        }
    }, [physics])

    if (count === 0) return null

    const instancesForPhysics = useMemo(() => {
        if (!physics) return null
        const tmp = new THREE.Matrix4()
        const pos = new THREE.Vector3()
        const quat = new THREE.Quaternion()
        const scl = new THREE.Vector3()
        const arr = new Array(count)

        for (let i = 0; i < count; i++) {
            tmp.fromArray(mats, i * 16).decompose(pos, quat, scl)
            arr[i] = {
                key: `tree-${i}`,
                position: [pos.x, pos.y, pos.z],
                quaternion: [quat.x, quat.y, quat.z, quat.w],
                scale: [scl.x, scl.y, scl.z],
            }
        }
        return arr
    }, [physics, mats, count])

    if (!physics) {
        // Ohne Physik: alle Props ans Mesh (inkl. Transform)
        return (
            <instancedMesh
                ref={meshRef}
                args={[source.geometry, source.material, count]}
                frustumCulled={frustumCulled}
                {...props}
            />
        )
    }



    return (
        <InstancedRigidBodies
            instances={instancesForPhysics}
            type="fixed"
            colliders="cuboid"
            {...props}
        >
            <instancedMesh
                ref={meshRef}
                args={[source.geometry, source.material, count]}
                frustumCulled={frustumCulled}

            />
        </InstancedRigidBodies>
    )
}

// -----------------------------------------------------------------------------
// Öffentliche Komponenten
// -----------------------------------------------------------------------------

/** 1) Wie gehabt: Modell aus GLB, Refs aus GLB */
export function InstancedFromRefs({
                                      modelUrl,
                                      refsUrl,
                                      filter,
                                      relativeTo = null,
                                      frustumCulled = false,
                                      wind = null,
                                      physics = false,
                                      ...props
                                  }) {
    const model = useGLTF(modelUrl, true)
    const baseMesh = getFirstMesh(model.scene)
    if (!baseMesh) throw new Error('Kein Mesh im model.glb gefunden')

    const nodeMat = useMemo(
        () => buildNodeMaterialFromExisting(baseMesh.material),
        [baseMesh.material]
    )

    // Wind-Ressourcen EINMAL, ohne Duplikate:
    const windRes = useWindResources(wind)
    const material = useMemo(
        () => applyWindToMaterial(nodeMat, windRes, wind),
        [nodeMat, windRes, wind]
    )

    const source = useMemo(
        () => ({ geometry: baseMesh.geometry, material }),
        [baseMesh.geometry, material]
    )

    return (
        <InstancedFromRefsCore
            source={source}
            refsUrl={refsUrl}
            filter={filter}
            relativeTo={relativeTo}
            frustumCulled={frustumCulled}
            physics={physics}
            {...props}
        />
    )
}

/** 2) Neu: Modell als direktes THREE.Mesh, Refs aus GLB */
export function InstancedFromRefsMesh({
                                          modelMesh,            // THREE.Mesh (REQUIRED)
                                          refsUrl,              // GLB mit Instanz-Refs (REQUIRED)
                                          filter,
                                          relativeTo = null,
                                          frustumCulled = false,
                                          wind = null,
                                          physics = false,
                                          ...props
                                      }) {
    if (!modelMesh || !modelMesh.isMesh || !modelMesh.geometry) {
        throw new Error('InstancedFromRefsMesh erwartet ein gültiges THREE.Mesh in "modelMesh".')
    }

    const nodeMat = useMemo(
        () => buildNodeMaterialFromExisting(modelMesh.material),
        [modelMesh.material]
    )

    const windRes = useWindResources(wind)
    const material = useMemo(
        () => applyWindToMaterial(nodeMat, windRes, wind),
        [nodeMat, windRes, wind]
    )

    const source = useMemo(
        () => ({ geometry: modelMesh.geometry, material }),
        [modelMesh.geometry, material]
    )

    return (
        <InstancedFromRefsCore
            source={source}
            refsUrl={refsUrl}
            filter={filter}
            relativeTo={relativeTo}
            frustumCulled={frustumCulled}
            physics={physics}
            {...props}
        />
    )
}
