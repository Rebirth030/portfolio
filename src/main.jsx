import './style.css';
import {createRoot} from 'react-dom/client'
import * as THREE from 'three/webgpu'

import {Canvas} from '@react-three/fiber'
import Game from './Game'
import {StrictMode, Suspense,} from "react";
import {Leva} from 'leva'
import {Perf} from 'r3f-perf'
import {KeyboardControls, StatsGl} from "@react-three/drei";



createRoot(document.getElementById('root')).render(
    <Suspense fallback={<div> Loading... </div>}>
        <StrictMode >
            <Leva/>
            <KeyboardControls map={[
                {name: 'forward', keys: ['ArrowUp', 'KeyW']},
                {name: 'backward', keys: ['ArrowDown', 'KeyS']},
                {name: 'leftward', keys: ['ArrowLeft', 'KeyA']},
                {name: 'rightward', keys: ['ArrowRight', 'KeyD']},
                {name: 'jump', keys: ['Space']},
                {name: 'run', keys: ['Shift']},
            ]}>
                <Canvas
                    gl={async (glProps) => {
                        const renderer = new THREE.WebGPURenderer(glProps)
                        renderer.forceWebGL = false;
                        renderer.toneMapping = THREE.ACESFilmicToneMapping
                        renderer.outputColorSpace = THREE.SRGBColorSpace
                        await renderer.init()
                        return renderer
                    }}
                    shadows
                    camera={{
                        fov: 45,
                        near: 0.1,
                        far: 200,
                        position: [2.5, 4, 6]
                    }}
                >
                    <Game/>
                    <StatsGl

                    />
                </Canvas>
            </KeyboardControls>
        </StrictMode>
    </Suspense>
)