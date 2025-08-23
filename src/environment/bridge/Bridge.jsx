import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import { RigidBody } from '@react-three/rapier'

export default function Bridge() {
  const bridge = useGLTF('Models.glb', true)
  const bridgeMesh = useMemo(() => bridge.scene.children[0], [bridge])
  return (
    <RigidBody
      colliders="trimesh"
      type="fixed"
      friction={1.5}
      position={[0, -20, 0]}
    >
      <primitive object={bridgeMesh} />
    </RigidBody>
  )
}
