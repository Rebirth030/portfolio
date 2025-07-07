import {OrbitControls} from '@react-three/drei'
import FloorGrid from "./exchange/FloorGrid.jsx";
import {Physics, RigidBody} from "@react-three/rapier";
import Player from "./Player.jsx";
import InfiniteGrass from "./gras/InfiniteGras.jsx";
import {useRef} from "react";
import * as THREE from "three/webgpu";
import {useFrame} from "@react-three/fiber";
import Postprocessing from "./Postprocessing.jsx";
import {Fn, vec4} from "three/src/Three.TSL.js";
import {useControls} from "leva";
import Terrain from "./Terrain.jsx";


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
        lightRef.current.position.y += 10;
        lightRef.current.position.z += 25;
        lightRef.current.target.position.copy(playerRef.current.translation());

        lightRef.current.target.updateMatrixWorld();
    })

    const material = new THREE.MeshStandardNodeMaterial({
        color: new THREE.Color(0x00ff00),
    })
    material.castShadowNode = Fn(() => {
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

                <RigidBody>
                    <mesh
                        position={[0, 50, 2]}
                        rotation={[-Math.PI * 0.5, 0, 0]}
                        scale={1}
                        castShadow
                        receiveShadow

                    >
                        <boxGeometry/>
                        <primitive object={material} attach="material" />
                    </mesh>

                    {/*<mesh
                        position={[0, 6, 0]}
                        scale={1}
                        rotation={[-Math.PI* 0.5, 0, 0]}
                        >
                        <planeGeometry args={[10, 10, 10, 10]}/>
                        <primitive object={planMaterial} attach="material" />
                    </mesh>*/}

                </RigidBody>
                <Player ref={playerRef}/>
                <directionalLight
                    ref={lightRef}
                    color={0xddddff}
                    intensity={1}
                    castShadow
                    shadow-mapSize={[1024, 1024]}

                />


                <InfiniteGrass playerRef={playerRef}/>
                <Terrain/>
            </Physics>
            <ambientLight intensity={1}/>


            <Postprocessing/>

        </>
    )
}