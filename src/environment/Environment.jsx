import SceneLights from './SceneLights.jsx'
import Bridge from './bridge/Bridge.jsx'
import InstancedTrees from './vegetation/InstancedTrees.jsx'
import InstancedBushes from './vegetation/InstancedBushes.jsx'
import TerrainVisual from './terrain/TerrainVisual.jsx'
import TerrainPhysics from './terrain/TerrainPhysics.jsx'
import InfiniteGrass from './InfiniteGrass.jsx'


export default function Environment({ playerRef }) {
    return (
        <>
            <SceneLights playerRef={playerRef} />
            <Bridge />
            <InstancedTrees />
            <InstancedBushes />
            <TerrainVisual />
            <InfiniteGrass playerRef={playerRef} />
            <TerrainPhysics />
        </>
    )
}
