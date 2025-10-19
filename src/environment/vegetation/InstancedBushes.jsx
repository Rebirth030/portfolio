import { useMemo } from 'react'
import { InstancedFromRefsMesh } from '../../app/InstancedFromRefs.jsx' // deine bestehende Datei
import createBushMesh from './Bush.jsx'
import {useControls} from "leva";

export default function InstancedBushes() {
    const {color} = useControls('Bush', {

        color: { value: '#415c2c', label: 'Color' },
    }, { collapsed: true })

    const modelMesh = useMemo(() => createBushMesh({color: color}), [color])

    return (
        <InstancedFromRefsMesh
            modelMesh={modelMesh}
            refsUrl="/Instances.glb"
            filter={(o) => o.isMesh && o.name.startsWith('Bush')}
            castShadow={false}
            receiveShadow={true}
            position={[0, -20, 0]}
            wind={{
                windDirectionX: -1.0,
                windDirectionZ:  1.0,
                windSpeed:       0.2,
                windScale1:      0.06,
                windScale2:      0.055,
                heightDivisor:   0.25,
                strength:        0.4,
            }}
        />
    )
}
