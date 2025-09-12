// src/components/common/PreparedStaticModel.jsx
import { RigidBody } from '@react-three/rapier'
import usePreparedModelNode from "../hooks/usePreparedModelNode.js";

export default function PreparedStaticModel({
                                                modelUrl = 'Models.glb',
                                                nodeName,                       // z.B. 'Bridge' / 'Altar'
                                                // Wrapper-Transform (Offset/Fine-Tuning)
                                                position = [0, 0, 0],
                                                rotation,
                                                scale,
                                                // Schatten/Material
                                                castShadow = true,
                                                receiveShadow = true,
                                                materialMapper,                 // optional
                                                respectUserData = true,
                                                transmissiveCastsShadow = false,
                                                transparentCastsShadow  = false,
                                                // Physik
                                                colliders = 'trimesh',          // 'trimesh' | 'hull' | 'cuboid' | 'none'
                                                type = 'fixed',                 // 'fixed' | 'dynamic' | 'kinematicPosition' | 'kinematicVelocity'
                                                friction = 1,
                                                restitution = 0
                                            }) {
    const node = usePreparedModelNode({
        modelUrl,
        nodeName,
        castShadow,
        receiveShadow,
        materialMapper,
        respectUserData,
        transmissiveCastsShadow,
        transparentCastsShadow,
        bakeWorldTransform: true // wichtig für „wie in Blender“
    })

    if (!node) return null

    // Primitive behält die (eingebackene) Blender-Transform.
    const content = <primitive object={node} />

    if (colliders === 'none') {
        // Ohne Physik: Offset am Group-Wrapper
        return (
            <group position={position} rotation={rotation} scale={scale}>
                {content}
            </group>
        )
    }

    // Mit Physik: Offset/Rotation an den RigidBody, Scale am inneren Group
    // (Skalierung beeinflusst Collider-Geometrie beim Erstellen)
    return (
        <RigidBody
            colliders={colliders}
            type={type}
            friction={friction}
            restitution={restitution}
            position={position}
            rotation={rotation}
        >
            <group scale={scale}>
                {content}
            </group>
        </RigidBody>
    )
}
