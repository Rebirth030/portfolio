import { RigidBody } from '@react-three/rapier';
import { useBridgeMesh } from '../terrain/TerrainAssets.js';

export default function Bridge() {
  const bridgeMesh = useBridgeMesh();
  return (
    <RigidBody type="fixed" colliders="trimesh" friction={1.5} position={[0,-20,0]}>
      <primitive object={bridgeMesh} />
    </RigidBody>
  );
}
