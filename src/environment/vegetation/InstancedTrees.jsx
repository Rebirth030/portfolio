import { useMemo } from 'react'
import { InstancedFromRefs, InstancedFromRefsMesh } from '../InstancedFromRefs.jsx'
import { createSpruceTopMesh } from './SpruceTreeTop.jsx'

export default function InstancedTrees() {
  const spruceMesh = useMemo(() => createSpruceTopMesh(), [])

  return (
    <>
      <InstancedFromRefs
        modelUrl="/OakTreeStem.glb"
        refsUrl="/OakTreeInstances.glb"
        filter={(o) => o.isMesh && o.name.startsWith('OakTree')}
        castShadow
        receiveShadow
        position={[0,-20,0]}
        physics={true}
        colliderMode="base"
        baseHeight={1}
        baseRadius={0.45}
      />
      <InstancedFromRefsMesh
        modelMesh={spruceMesh}
        refsUrl="/Tree3Instances.glb"
        filter={(o) => o.isMesh && o.name.startsWith('Tree3')}
        castShadow
        receiveShadow
        position={[0,-15,0]}
        wind={{
          windDirectionX: -1.0,
          windDirectionZ:  1.0,
          windSpeed:       0.2,
          windScale1:      0.06,
          windScale2:      0.055,
          heightDivisor:   0.25,
          strength:        0.3,
        }}
      />
      <InstancedFromRefs
        modelUrl="/Tree3Stem.glb"
        refsUrl="/Tree3Instances.glb"
        filter={(o) => o.isMesh && o.name.startsWith('Tree3')}
        castShadow
        receiveShadow
        position={[0,-20,0]}
        physics={true}
      />
    </>
  )
}
