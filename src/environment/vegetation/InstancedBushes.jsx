import { useMemo } from 'react'
import { InstancedFromRefsMesh } from '../InstancedFromRefs.jsx'
import createBushMesh from './Bush.jsx'
import { folder, useControls } from 'leva'

export default function InstancedBushes() {
  const { bushColorHex } = useControls('Terrain Material', {
    Colors: folder({ bushColorHex: { value: '#61803e' } }, { collapsed: true })
  }, { collapsed: true })
  const bushMesh = useMemo(() => createBushMesh({ color: bushColorHex }), [bushColorHex])
  return (
    <InstancedFromRefsMesh
      modelMesh={bushMesh}
      refsUrl="/BushInstances.glb"
      filter={(o) => o.isMesh && o.name.startsWith('Bush')}
      castShadow
      receiveShadow
      position={[0, -20, 0]}
      wind={{
        windDirectionX: -1.0,
        windDirectionZ: 1.0,
        windSpeed: 0.2,
        windScale1: 0.06,
        windScale2: 0.055,
        heightDivisor: 0.25,
        strength: 0.3,
      }}
    />
  )
}
