import Bridge from './bridge/Bridge.jsx';
import InstancedTrees from './vegetation/InstancedTrees.jsx';
import InstancedBushes from './vegetation/InstancedBushes.jsx';
import TerrainVisual from './terrain/TerrainVisual.jsx';
import TerrainPhysics from './terrain/TerrainPhysics.jsx';

export default function Environment() {
  return (
    <>
      <Bridge />
      <InstancedTrees />
      <InstancedBushes />
      <TerrainVisual />
      <TerrainPhysics />
    </>
  );
}
