import { InstancedFromRefs } from '../InstancedFromRefs.jsx';

export default function InstancedTrees(props) {
  return (
    <InstancedFromRefs
      modelUrl="/OakTreeStem.glb"
      refsUrl="/OakTreeInstances.glb"
      filter={(o) => o.isMesh && o.name.startsWith('OakTree')}
      castShadow
      receiveShadow
      position={[0,-20,0]}
      physics
      colliderMode="base"
      baseHeight={1}
      baseRadius={0.45}
      {...props}
    />
  );
}
