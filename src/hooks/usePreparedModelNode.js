// src/utils/usePreparedModelNode.js
import {useMemo} from 'react'
import {useGLTF} from '@react-three/drei'
import {SkeletonUtils} from 'three-stdlib'
import * as THREE from 'three'
import prepareNode from "../utils/prepareNode.js";


export default function usePreparedModelNode({
                                                 modelUrl,
                                                 nodeName,
                                                 castShadow = true,
                                                 receiveShadow = true,
                                                 materialMapper,            // optional override
                                                 respectUserData = true,
                                                 transmissiveCastsShadow = false,
                                                 transparentCastsShadow  = false,
                                                 bakeWorldTransform = true // wichtig: Blender-Transform beibehalten
                                             } = {}) {
    const gltf = useGLTF(modelUrl, true)

    return useMemo(() => {
        if (!gltf?.scene) return null

        const original = gltf.scene.getObjectByName(nodeName)
        if (!original) {
            console.warn(`[usePreparedModelNode] Knoten "${nodeName}" nicht in "${modelUrl}" gefunden. Rendering wird ausgelassen.`)
            return null
        }

        // Robust klonen (auch für SkinnedMesh ok)
        const cloned = SkeletonUtils.clone(original)

        if (bakeWorldTransform) {
            // Weltmatrix des Originals in den Klon „einbacken“
            // => behält Position/Rotation/Scale wie in Blender/GLB
            original.updateWorldMatrix(true, false) // Eltern aktualisieren
            const wm = original.matrixWorld.clone()
            const pos = new THREE.Vector3()
            const rot = new THREE.Quaternion()
            const scl = new THREE.Vector3()
            wm.decompose(pos, rot, scl)

            cloned.position.copy(pos)
            cloned.quaternion.copy(rot)
            cloned.scale.copy(scl)
            cloned.updateMatrix()
            cloned.updateMatrixWorld(true)
        }

        // Materialien/Schatten etc. vorbereiten
        prepareNode(cloned, {
            castShadowDefault: castShadow,
            receiveShadowDefault: receiveShadow,
            materialMapper,
            respectUserData,
            transmissiveCastsShadow,
            transparentCastsShadow
        })

        return cloned
    }, [
        gltf, modelUrl, nodeName,
        castShadow, receiveShadow,
        materialMapper, respectUserData,
        transmissiveCastsShadow, transparentCastsShadow,
        bakeWorldTransform
    ])
}
