// InstancedFromRefs.jsx
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { useLoader } from '@react-three/fiber'
import { useMemo, useLayoutEffect, useEffect, useRef } from 'react'
import buildNodeMaterialFromExisting from '../materials/buildNodeMaterialFromExisting.js'

// TSL (für optionalen Wind, nur fürs Material)
import { positionWorld, positionLocal } from 'three/tsl'
import { buildWindOffsetNode, defaultWind } from '../utils/wind.js'

// Physik
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
                                   source,                // { geometry, material }
                                   refsUrl,
                                   filter,
                                   relativeTo = null,
                                   frustumCulled = false,
                                   physics = false,

                                   // NEU: Collider-Modus & Parameter für Sockel
                                   colliderMode = 'auto',   // 'auto' (AABB) | 'base' (nur Sockel)
                                   baseHeight = 1,          // Gesamthöhe des Sockels (Meter)
                                   baseRadius = 0.45,       // Radius des Sockels (Meter)

                                   ...props                 // Transform + Render-Props
                               }) {
    const refs = useGLTF(refsUrl, true)
    const { world, rapier } = useRapier()        // NEU: Zugriff auf Rapier-World

    const mats = useMemo(
        () => collectInstanceMatrixArray(refs.scene, { filter, relativeTo }),
        [refs, filter, relativeTo]
    )

    const count = mats.length / 16
    const meshRef = useRef()

    // -------------------------------------------------
    // Hilfsfunktionen für Transform-Komposition (Parent)
    // -------------------------------------------------
    const parentMatrix = useMemo(() => {
        const m = new THREE.Matrix4()
        // extrahiere optionale Parent-TRS aus props
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
            // rotation als Euler [x,y,z] (Radian)
            const r = props.rotation
            const e = new THREE.Euler(r[0] || 0, r[1] || 0, r[2] || 0)
            quat.setFromEuler(e)
        } else if (props.quaternion) {
            const q = props.quaternion
            quat.set(q[0] || 0, q[1] || 0, q[2] || 0, q[3] || 1)
        }

        return m.compose(pos, quat, scl)
    }, [props.position, props.rotation, props.quaternion, props.scale])

    // -------------------------------------------------
    // Visuales Instancing:
    // - bei auto: von IRB gesteuert (s.u.)
    // - bei base: wir setzen die Matrix selbst
    // -------------------------------------------------
    const useManualInstancing = physics && colliderMode === 'base' ? true : !physics

    useLayoutEffect(() => {
        if (!useManualInstancing) return
        const im = meshRef.current
        if (!im || count === 0) return

        // Wenn ein Parent-Transform existiert, kombinieren wir es
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

    // -------------------------------------------------
    // Physik
    // -------------------------------------------------

    // A) AUTO: wie gehabt via InstancedRigidBodies + colliders="cuboid"
    if (physics && colliderMode === 'auto') {
        // Instanzen für IRB (ohne Parent-TRS, der kommt über props an IRB)
        const instancesForPhysics = useMemo(() => {
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
        }, [mats, count])

        // Transform-Props an IRB, Render-Props ans Mesh
        const { position, rotation, quaternion, scale, ...renderProps } = props

        return (
            <InstancedRigidBodies
                instances={instancesForPhysics}
                type="fixed"
                colliders="cuboid"
                position={position}
                rotation={rotation}
                quaternion={quaternion}
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

    // B) BASE: imperativ RigidBodies nur am Sockel – Tick-synchron, borrow-sicher

// Wir halten NUR die Bodies (Colliders hängen an den Bodies)
    const bodiesRef = useRef([])
// Flag, um (de)konstruktions-Vorgänge zu takten
    const rebuildRef = useRef(false)

// Daten der gewünschten Bodies vorab berechnen
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
                // Welt-TRS
                tx: pos.x,
                ty: pos.y,
                tz: pos.z,
                qx: quat.x,
                qy: quat.y,
                qz: quat.z,
                qw: quat.w,
                // Collider-Halbausdehnungen (skaliert) + lokaler Offset (Mitte des Sockels)
                hx: Math.max(EPS, hx * scl.x),
                hy: Math.max(EPS, hy * scl.y),
                hz: Math.max(EPS, hz * scl.z),
                oy: hy * scl.y, // Mittelpunkt des Sockels = halbe Höhe über „Boden“
            }
        }
        return data
    }, [physics, colliderMode, mats, count, parentMatrix, baseHeight, baseRadius])

// Immer wenn sich baseBodiesData ändert, planen wir einen Rebuild
    useEffect(() => {
        if (!(physics && colliderMode === 'base')) return
        rebuildRef.current = true
    }, [physics, colliderMode, baseBodiesData])

// Vor dem Physik-Step: alte Bodies sicher entfernen (wenn Rebuild ansteht)
    useBeforePhysicsStep(() => {
        if (!(physics && colliderMode === 'base')) return
        if (!rebuildRef.current) return
        // Alte Bodies sauber raus
        for (const b of bodiesRef.current) {
            try { world.removeRigidBody(b) } catch {}
        }
        bodiesRef.current = []
    })

// Nach dem Physik-Step: neue Bodies erzeugen (wenn Rebuild ansteht)
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

        // Rebuild abgeschlossen
        rebuildRef.current = false
    })

// Cleanup beim Unmount: im nächsten Tick entfernen
    useEffect(() => {
        return () => {
            if (!(physics && colliderMode === 'base')) return
            // Markieren und beim nächsten beforeStep werden Bodies entfernt
            rebuildRef.current = true
        }
    }, [physics, colliderMode])


    // Visuals rendern (mit manuell gesetzter instanceMatrix)
    const { position, rotation, quaternion, scale, ...renderProps } = props
    return (
        <instancedMesh
            ref={meshRef}
            args={[source.geometry, source.material, count]}
            frustumCulled={frustumCulled}
            {...renderProps} // nur Render-Props (Transform haben wir bereits eingerechnet)
        />
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
            {...props}
        />
    )
}
