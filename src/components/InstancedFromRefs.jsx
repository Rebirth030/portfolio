// InstancedFromRefs.jsx (mit useLoader)
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { useLoader } from '@react-three/fiber';
import { useMemo, useLayoutEffect, useEffect, useRef } from 'react'
import buildNodeMaterialFromExisting from '../utils/buildNodeMaterialFromExisting.js'

// ⬇️ TSL-Nodes
import {
    Fn, texture, time, uniform, negate, clamp,
    vec3, float,
    positionWorld, positionLocal,
} from 'three/tsl'
import {buildWindOffsetNode, defaultWind, windFn} from "../utils/wind.js";


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

export function InstancedFromRefs({
                                      modelUrl,
                                      refsUrl,
                                      filter,
                                      relativeTo = null,
                                      frustumCulled = false,
                                      wind = null, // Boolean ODER Options-Objekt
                                      ...props
                                  }) {
    const model = useGLTF(modelUrl, true)
    const refs  = useGLTF(refsUrl, true)

    // Noise (dein aktueller Pfad)
    const noiseTex = useLoader(THREE.TextureLoader, '/noiseTexture.png');
    if (wind && noiseTex) {
        noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping
        noiseTex.minFilter = THREE.LinearMipMapLinearFilter
        noiseTex.magFilter = THREE.LinearFilter
    }


    // Falls wind ein Objekt ist, mergen; bei true/false bleiben Defaults
    const windOpts = useMemo(() => (
        typeof wind === 'object' ? { ...defaultWind, ...wind } : defaultWind
    ), [wind])

    const source = useMemo(() => {
        let mesh = null
        model.scene.traverse((o) => { if (!mesh && o.isMesh && o.geometry) mesh = o })
        if (!mesh) throw new Error('Kein Mesh im model.glb gefunden')

        const material = buildNodeMaterialFromExisting(mesh.material)

        if (wind && noiseTex) {
            const worldPos   = positionWorld
            const offsetNode = positionLocal

            const windOffset = buildWindOffsetNode({
                noiseTex,
                worldPos,
                offsetNode,
                params: windOpts,
                mapXZTo: 'xy->(x, y)'
            })

            material.positionNode = offsetNode.add(windOffset)
            material.needsUpdate = true
        }

        return { geometry: mesh.geometry, material }
    }, [model, wind, noiseTex, windOpts])

    const mats = useMemo(
        () => collectInstanceMatrixArray(refs.scene, { filter, relativeTo }),
        [refs, filter, relativeTo]
    )

    const count = mats.length / 16
    const meshRef = useRef()

    useLayoutEffect(() => {
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
    }, [mats, count])

    useEffect(() => {
        if (meshRef.current?.instanceMatrix) {
            meshRef.current.instanceMatrix.setUsage(THREE.StaticDrawUsage)
        }
    }, [])

    if (count === 0) return null

    return (
        <instancedMesh
            ref={meshRef}
            args={[source.geometry, source.material, count]}
            frustumCulled={frustumCulled}
            {...props}
        />
    )
}
