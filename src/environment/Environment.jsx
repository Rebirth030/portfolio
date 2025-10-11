import SceneLights from './SceneLights.jsx'
import Bridge from './fixedEnvironmentObjects/Bridge.jsx'
import InstancedTrees from './vegetation/InstancedTrees.jsx'
import InstancedBushes from './vegetation/InstancedBushes.jsx'
import TerrainVisual from './terrain/TerrainVisual.jsx'
import TerrainPhysics from './terrain/TerrainPhysics.jsx'
import InfiniteGrass from './InfiniteGrass.jsx'
import Altar from "./fixedEnvironmentObjects/Altar.jsx";
import Crystals from "./fixedEnvironmentObjects/Crystals.jsx";
import * as Three from "three/webgpu";
import Sparkles from "./Sparkles.jsx";
import {folder, useControls} from "leva";
import * as THREE from "three";
import Stones from "./fixedEnvironmentObjects/Stones.jsx";
import Sticks from "./movableObjects/Sticks.jsx";
import LanternStand from "./movableObjects/LanternStand.jsx";
import WoodWorking from "./fixedEnvironmentObjects/WoodWorking.jsx";
import MarketStall from "./fixedEnvironmentObjects/MarketStall.jsx";
import WoodenChest from "./movableObjects/WoodenChest.jsx";
import Cask from "./movableObjects/Cask.jsx";
import {Plank} from "./movableObjects/Plank.jsx";
import RuneStones from "./movableObjects/RuneStones.jsx";
import Bench from "./movableObjects/Bench.jsx";
import Monolith from "./movableObjects/Monolith.jsx";


export default function Environment({ playerRef }) {

    const {fogColor, color, speed, opacity, size, count, emissionColor, emissionStrength } = useControls('Environment', {
        Fog: folder({
            fogColor:   { value: '#8ab2d8', label: 'Fog Color' },
        }, { collapsed: true }),
        Sparkles: folder({
            color: { value: '#CC88FF', label: 'Color'},
            speed: { value: 1, min: 0, max: 10, step: 0.1, label: 'Speed' },
            opacity: { value: 10, min: 0, max: 100, step: 1, label: 'Opacity' },
            size: { value: 1, min: 0, max: 10, step: 0.1, label: 'Size' },
            count: { value: 5000, min: 0, max: 10000, step: 1, label: 'Count' },
            emissionColor: { value: '#FFF5CC', label: 'Emission Color' },
            emissionStrength: { value: 20, min: 0, max: 50, step: 0.1, label: 'Emission Strength' },
        }, {collapsed: true}),
        }, { collapsed: true })
    return (
        <>
            <SceneLights playerRef={playerRef} />
            <Bridge />
            <Altar />
            <Crystals />
            <Stones />
            <InstancedTrees />
            <InstancedBushes />
            <TerrainVisual />
            <InfiniteGrass playerRef={playerRef} />
            <TerrainPhysics />
            <Sticks/>
            <LanternStand/>
            <WoodWorking/>
            <MarketStall/>
            <WoodenChest/>
            <Cask />
            <Plank />
            <RuneStones/>
            <Bench />
            <Monolith />
            {/*<color attach="background" args={[fogColor]} />*/}
            <fog attach="fog" args={[fogColor,  10,  150]}/>
            <Sparkles
                count={count}
                size={size}
                opacity={opacity}
                scale={[256,3,256]}
                speed={speed}
                color={new Three.Color(color)}
                emissionColor={new Three.Color(emissionColor)}
                emissionStrength={emissionStrength}
            />
        </>
    )
}
