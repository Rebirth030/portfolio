import { useMemo } from 'react'
import { InstancedFromRefsMesh } from '../InstancedFromRefs.jsx' // deine bestehende Datei
import createBushMesh from './Bush.jsx'

export default function InstancedBushes() {
    const modelMesh = useMemo(() => createBushMesh(), [])
    return (
        <InstancedFromRefsMesh
            modelMesh={modelMesh}
            refsUrl="/BushInstances.glb"
            filter={(o) => o.isMesh && o.name.startsWith('Bush')}
            castShadow
            receiveShadow
            position={[0, -20, 0]}
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
    )
}
