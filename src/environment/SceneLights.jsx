import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function SceneLights({ playerRef }) {
  const dirRef = useRef()
  useFrame(() => {
    const p = playerRef?.current?.translation?.()
    if (!p || !dirRef.current) return
    const L = dirRef.current
    L.position.set(p.x, p.y + 10, p.z + 25)
    L.target.position.set(p.x, p.y, p.z)
    L.target.updateMatrixWorld()
  })
  return (
    <>
      <ambientLight intensity={1} />
      <directionalLight
        ref={dirRef}
        color={0xddddff}
        intensity={1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
    </>
  )
}
