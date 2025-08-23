import { useMemo } from 'react';
import { InstancedFromRefsMesh } from '../InstancedFromRefs.jsx';
import createBushMesh from './Bush.jsx';

export default function InstancedBushes(props) {
  const modelMesh = useMemo(() => createBushMesh(), []);
  return (
    <InstancedFromRefsMesh
      modelMesh={modelMesh}
      refsUrl="/BushInstances.glb"
      filter={(o) => o.isMesh && o.name.startsWith('Bush')}
      castShadow
      receiveShadow
      position={[0,-20,0]}
      {...props}
    />
  );
}
