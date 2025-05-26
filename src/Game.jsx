import {OrbitControls} from '@react-three/drei'
import FloorGrid from "./exchange/FloorGrid.jsx";
import {Physics, RigidBody} from "@react-three/rapier";
import Player from "./Player.jsx";
import InfiniteGrass from "./gras/InfiniteGras.jsx";
import {useRef} from "react";
import * as THREE from "three/webgpu";
import {useFrame} from "@react-three/fiber";
import Postprocessing from "./Postprocessing.jsx";
import {tslFn, vec4} from "three/src/Three.TSL.js";
import {useControls} from "leva";


export default function Game() {
    const playerRef = useRef();
    const lightRef = useRef();

    const {shadow} = useControls("Shadow", {
        shadow: {
            value: new THREE.Color(0xf20c0c),

        }
    })
    useFrame(() => {
        if (!playerRef.current || !lightRef.current) return;

        lightRef.current.position.copy(playerRef.current.translation());
        lightRef.current.position.y += 4;
        lightRef.current.position.x += 10;
        lightRef.current.target.position.copy(playerRef.current.translation());

        lightRef.current.target.updateMatrixWorld();
    })

    const material = new THREE.MeshStandardNodeMaterial({
        color: new THREE.Color(0x00ff00),
    })
    material.shadowNode = tslFn(() => {
        return vec4(1,0,0,0)
    })


    return (
        <>
            <Physics
                debug={false}
                updateLoop={"follow"}
                timestep="fixed"

            >

                <OrbitControls/>
                <FloorGrid/>
                <RigidBody>
                    <mesh
                        position={[0, 5, 2]}
                        rotation={[-Math.PI * 0.5, 0, 0]}
                        scale={0.7988585829734802}
                        castShadow
                        receiveShadow

                    >
                        <boxGeometry/>
                        <primitive object={material} attach="material" />
                    </mesh>
                </RigidBody>
                <Player ref={playerRef}/>
                <directionalLight
                    ref={lightRef}
                    color={0xff7f24}
                    intensity={10}
                    castShadow
                    shadow-mapSize={[1024, 1024]}

                />


                <InfiniteGrass playerRef={playerRef}/>

            </Physics>
            <ambientLight intensity={1}/>

            <Postprocessing/>

        </>
    )
}