// src/environment/bridge/Bridge.jsx
import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import buildNodeMaterialFromExisting from '../../utils/buildNodeMaterialFromExisting.js'

const MODEL_URL = 'Models.glb'
const BRIDGE_NAME = 'Bridge' // exakt wie im GLB benannt

export default function Bridge() {
    const gltf = useGLTF(MODEL_URL, true)

    // Gesuchten Knoten finden (Name → Fallback auf erstes passendes Child)
    const bridgeRoot = useMemo(() => {
        const root = gltf.scene
        const picked =
            root.getObjectByName(BRIDGE_NAME)
        // Klonen, damit Material-Manipulation nicht den GLTF-Cache verändert
        return picked.clone(true)
    }, [gltf])

    // Schatten + Material-Konvertierung auf allen Meshes
    useEffect(() => {
        if (!bridgeRoot) return
        bridgeRoot.traverse((o) => {
            if (!o.isMesh) return

            // Schattenflags
            o.castShadow = true
            o.receiveShadow = true

            // Material(e) konvertieren
            if (Array.isArray(o.material)) {
                o.material = o.material.map((m) => buildNodeMaterialFromExisting(m))
            } else if (o.material) {
                o.material = buildNodeMaterialFromExisting(o.material)
            }

            // Transparenz aus (meist bessere Schlagschatten)
            if (o.material) {
                if (Array.isArray(o.material)) {
                    o.material.forEach((m) => {
                        m.transparent = false
                        m.needsUpdate = true
                    })
                } else {
                    o.material.transparent = false
                    o.material.needsUpdate = true
                }
            }
        })
    }, [bridgeRoot])

    return (
        <RigidBody
            colliders="trimesh"
            type="fixed"
            friction={1.5}
            position={[0, -20, 0]}
        >
            <primitive object={bridgeRoot} />
        </RigidBody>
    )
}

// Optional: an geeigneter Stelle vorladen
// useGLTF.preload('Models.glb')
