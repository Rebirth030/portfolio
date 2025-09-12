import SceneLights from './SceneLights.jsx'
import Bridge from './singular-objects/Bridge.jsx'
import InstancedTrees from './vegetation/InstancedTrees.jsx'
import InstancedBushes from './vegetation/InstancedBushes.jsx'
import TerrainVisual from './terrain/TerrainVisual.jsx'
import TerrainPhysics from './terrain/TerrainPhysics.jsx'
import InfiniteGrass from './InfiniteGrass.jsx'
import Altar from "./singular-objects/Altar.jsx";


export default function Environment({ playerRef }) {
    return (
        <>
            <SceneLights playerRef={playerRef} />
            <Bridge />
            <Altar />
            <InstancedTrees />
            <InstancedBushes />
            <TerrainVisual />
            <InfiniteGrass playerRef={playerRef} />
            <TerrainPhysics />
        </>
    )
}
