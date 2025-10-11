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
import {
    InstancedRigidBodies,
    useRapier,
    useBeforePhysicsStep,
    useAfterPhysicsStep,
} from '@react-three/rapier'


// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function makeAcceptFilter(filter) {
    if (!filter) return (o) => true
    if (typeof filter === 'function') return filter
    if (filter instanceof RegExp) return (o) => typeof o.name === 'string' && filter.test(o.name)
    if (typeof filter === 'string') {
        const needle = filter.toLowerCase()
        return (o) => typeof o.name === 'string' && o.name.toLowerCase().includes(needle)
    }
    return () => true
}

/** Liefert das erste Mesh aus einer Szene, das `filter` erfüllt. */
function getMeshFromScene(scene, { filter }) {
    const accept = makeAcceptFilter(filter)
    let mesh = null
    scene.traverse((o) => {
        if (!mesh && o.isMesh && o.geometry && accept(o)) mesh = o
    })
    return mesh
}

/** Erzeugt ein Float32Array der Instanzmatrizen aus einer Referenz-Szene. */
function collectInstanceMatrixArray(root, { filter, relativeTo = null } = {}) {
    const accept =
        makeAcceptFilter(filter) ||
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
                                   source,                // { geometry, material }
                                   refsUrl,
                                   filter,
                                   relativeTo = null,
                                   frustumCulled = false,
                                   physics = false,

                                   // Collider-Modus & Parameter für Sockel
                                   type = 'fixed',
                                   colliders = 'cuboid',
                                   colliderMode = 'auto',   // 'auto' (AABB) | 'base' (nur Sockel)
                                   baseHeight = 1,
                                   baseRadius = 0.45,

                                   ...props
                               }) {
    const refs = useGLTF(refsUrl, true)
    const { world, rapier } = useRapier()

    const mats = useMemo(
        () => collectInstanceMatrixArray(refs.scene, { filter, relativeTo }),
        [refs, filter, relativeTo]
    )

    const count = mats.length / 16
    const meshRef = useRef()

    // Parent-Transform aus props in Matrix backen
    const parentMatrix = useMemo(() => {
        const m = new THREE.Matrix4()
        const pos = new THREE.Vector3()
        const quat = new THREE.Quaternion()
        const scl = new THREE.Vector3(1, 1, 1)

        if (props.position) {
            const p = props.position
            pos.set(p[0] || 0, p[1] || 0, p[2] || 0)
        }
        if (props.scale) {
            const s = props.scale
            if (Array.isArray(s)) scl.set(s[0] ?? 1, s[1] ?? 1, s[2] ?? 1)
            else if (typeof s === 'number') scl.setScalar(s)
        }
        if (props.rotation) {
            const r = props.rotation
            const e = new THREE.Euler(r[0] || 0, r[1] || 0, r[2] || 0)
            quat.setFromEuler(e)
        } else if (props.quaternion) {
            const q = props.quaternion
            quat.set(q[0] || 0, q[1] || 0, q[2] || 0, q[3] || 1)
        }

        return m.compose(pos, quat, scl)
    }, [props.position, props.rotation, props.quaternion, props.scale])

    // Visuales Instancing
    const useManualInstancing = physics && colliderMode === 'base' ? true : !physics

    useLayoutEffect(() => {
        if (!useManualInstancing) return
        const im = meshRef.current
        if (!im || count === 0) return

        const tmp = new THREE.Matrix4()
        const combined = new THREE.Matrix4()
        for (let i = 0; i < count; i++) {
            tmp.fromArray(mats, i * 16)
            combined.multiplyMatrices(parentMatrix, tmp)
            im.setMatrixAt(i, combined)
        }
        im.instanceMatrix.needsUpdate = true
    }, [mats, count, useManualInstancing, parentMatrix])

    useEffect(() => {
        if (useManualInstancing && meshRef.current?.instanceMatrix) {
            meshRef.current.instanceMatrix.setUsage(THREE.StaticDrawUsage)
        }
    }, [useManualInstancing])

    if (count === 0) return null

    // -------------------- Physik --------------------

    // A) AUTO: InstancedRigidBodies + colliders="cuboid"
    if (physics && colliderMode === 'auto') {
        const instancesForPhysics = useMemo(() => {
            const tmp = new THREE.Matrix4()
            const pos = new THREE.Vector3()
            const quat = new THREE.Quaternion()
            const scl = new THREE.Vector3()
            const arr = new Array(count)
            for (let i = 0; i < count; i++) {
                tmp.fromArray(mats, i * 16).decompose(pos, quat, scl)
                arr[i] = {
                    key: `inst-${i}`,
                    position: [pos.x, pos.y, pos.z],
                    quaternion: [quat.x, quat.y, quat.z, quat.w],
                    scale: [scl.x, scl.y, scl.z],
                }
            }
            return arr
        }, [mats, count])

        const { position, rotation, quaternion, scale, ...renderProps } = props

        return (
            <InstancedRigidBodies
                instances={instancesForPhysics}
                type={type}
                colliders={colliders}
                rotation={rotation}
                quaternion={quaternion}
                position={position}
                scale={scale}
            >
                <instancedMesh
                    ref={meshRef}
                    args={[source.geometry, source.material, count]}
                    frustumCulled={frustumCulled}
                    {...renderProps}
                />
            </InstancedRigidBodies>
        )
    }

    // B) BASE: eigene Bodies (nur Sockel)
    const bodiesRef = useRef([])
    const rebuildRef = useRef(false)

    const baseBodiesData = useMemo(() => {
        if (!(physics && colliderMode === 'base')) return null
        const tmp = new THREE.Matrix4()
        const combined = new THREE.Matrix4()
        const pos = new THREE.Vector3()
        const quat = new THREE.Quaternion()
        const scl = new THREE.Vector3()

        const halfH = baseHeight * 0.5
        const hx = baseRadius
        const hy = halfH
        const hz = baseRadius
        const EPS = 1e-6

        const data = new Array(count)
        for (let i = 0; i < count; i++) {
            tmp.fromArray(mats, i * 16)
            combined.multiplyMatrices(parentMatrix, tmp)
            combined.decompose(pos, quat, scl)

            data[i] = {
                tx: pos.x, ty: pos.y, tz: pos.z,
                qx: quat.x, qy: quat.y, qz: quat.z, qw: quat.w,
                hx: Math.max(EPS, hx * scl.x),
                hy: Math.max(EPS, hy * scl.y),
                hz: Math.max(EPS, hz * scl.z),
                oy: hy * scl.y,
            }
        }
        return data
    }, [physics, colliderMode, mats, count, parentMatrix, baseHeight, baseRadius])

    useEffect(() => {
        if (!(physics && colliderMode === 'base')) return
        rebuildRef.current = true
    }, [physics, colliderMode, baseBodiesData])

    useBeforePhysicsStep(() => {
        if (!(physics && colliderMode === 'base')) return
        if (!rebuildRef.current) return
        for (const b of bodiesRef.current) {
            try { world.removeRigidBody(b) } catch {}
        }
        bodiesRef.current = []
    })

    useAfterPhysicsStep(() => {
        if (!(physics && colliderMode === 'base')) return
        if (!rebuildRef.current) return
        if (!baseBodiesData) return

        for (let i = 0; i < baseBodiesData.length; i++) {
            const d = baseBodiesData[i]
            const rbDesc = rapier.RigidBodyDesc.fixed()
                .setTranslation(d.tx, d.ty, d.tz)
                .setRotation({ x: d.qx, y: d.qy, z: d.qz, w: d.qw })
            const body = world.createRigidBody(rbDesc)

            const colDesc = rapier.ColliderDesc.cuboid(d.hx, d.hy, d.hz)
                .setTranslation(0, d.oy, 0)
                .setFriction(0.0)
                .setRestitution(0.0)

            world.createCollider(colDesc, body)
            bodiesRef.current.push(body)
        }
        rebuildRef.current = false
    })

    useEffect(() => {
        return () => {
            if (!(physics && colliderMode === 'base')) return
            rebuildRef.current = true
        }
    }, [physics, colliderMode])

    // Visuals (manuell gesetzte instanceMatrix)
    const { position, rotation, quaternion, scale, ...renderProps } = props
    return (
        <instancedMesh
            ref={meshRef}
            args={[source.geometry, source.material, count]}
            frustumCulled={frustumCulled}
            {...renderProps}
        />
    )
}


// -----------------------------------------------------------------------------
// Öffentliche Komponenten
// -----------------------------------------------------------------------------

/** 1) Modell & Refs beide aus GLB, jeweils mit Filter */
export function InstancedFromRefs({
                                      modelUrl,          // GLB mit mehreren Meshes
                                      modelFilter,       // Pflicht: Funktion | RegExp | String
                                      refsUrl,           // GLB mit Referenz-Nodes
                                      filter,            // Funktion | RegExp | String
                                      relativeTo = null,
                                      frustumCulled = false,
                                      wind = null,
                                      physics = false,
                                      type = 'fixed',
                                      colliders = 'cuboid',
                                      ...props
                                  }) {
    const model = useGLTF(modelUrl, true) // Draco/Meshopt werden nur genutzt, wenn die Datei es verlangt. :contentReference[oaicite:1]{index=1}
    const baseMesh = useMemo(() => {
        const m = getMeshFromScene(model.scene, { filter: modelFilter })
        if (!m) throw new Error('InstancedFromRefs: Kein Mesh gefunden, das modelFilter entspricht. Model: ' + modelUrl + ', Filter: ' + modelFilter)
        return m
    }, [model, modelFilter])

    const nodeMat = useMemo(
        () => buildNodeMaterialFromExisting(baseMesh.material),
        [baseMesh.material]
    )

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
            type={type}
            colliders={colliders}
            {...props}
        />
    )
}

/** 2) Alternativ: Modell als direktes THREE.Mesh, Refs aus GLB */
export function InstancedFromRefsMesh({
                                          modelMesh,            // THREE.Mesh (REQUIRED)
                                          refsUrl,              // GLB mit Instanz-Refs (REQUIRED)
                                          filter,
                                          relativeTo = null,
                                          frustumCulled = false,
                                          wind = null,
                                          physics = false,
                                          type = 'fixed',
                                          colliders = 'cuboid',
                                          ...props
                                      }) {
    if (!modelMesh || !modelMesh.isMesh || !modelMesh.geometry) {
        throw new Error('InstancedFromRefsMesh erwartet ein gültiges THREE.Mesh in "modelMesh".')
    }

    const nodeMat = modelMesh.material
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
            type={type}
            colliders={colliders}
            {...props}
        />
    )
}
