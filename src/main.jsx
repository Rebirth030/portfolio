import './style.css';
import {createRoot} from 'react-dom/client'
import * as THREE from 'three/webgpu'

import {Canvas} from '@react-three/fiber'
import Game from './Game'
import {StrictMode,} from "react";
import {Leva} from 'leva'
import {Perf} from 'r3f-perf'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <Leva collapsed={true}/>

            <Canvas
                gl={async (props) => {
                    console.info("WebGPU is supported");
                    const renderer = new THREE.WebGPURenderer(props);
                    renderer.forceWebGL = false;
                    renderer.toneMapping = THREE.ACESFilmicToneMapping
                    renderer.outputColorSpace = THREE.SRGBColorSpace
                    await renderer.init();
                    return renderer;
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
            </Canvas>

    </StrictMode>
)
