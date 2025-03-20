import './style.css';
import {createRoot} from 'react-dom/client'
import {WebGPURenderer} from 'three/webgpu'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'

import {Canvas} from '@react-three/fiber'
import Game from './Game'
import {StrictMode, useState} from "react";
import {Leva} from 'leva'
import {Perf} from 'r3f-perf'

createRoot(document.getElementById('root')).render(
    < StrictMode>
        <Leva collapsed={true}/>
        <Canvas
            gl={(canvas) => {
                const renderer = new WebGPURenderer({
                    canvas: canvas,
                    antialias: true,
                    alpha: true,
                    forceWebGL: false
                })
                renderer.toneMapping = ACESFilmicToneMapping
                renderer.outputColorSpace = SRGBColorSpace
            }}
            shadows
            camera={{
                fov: 45,
                near: 0.1,
                far: 200,
                position: [2.5, 4, 6]
            }}
        >
            <Perf position={"top-left"}/>
            <Game/>
        </Canvas>
    </StrictMode>
)
