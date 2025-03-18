import './style.css';
import {createRoot} from 'react-dom/client'
import * as THREE from 'three/webgpu'
import * as TSL from 'three/tsl'
import {Canvas} from '@react-three/fiber'
import Game from './Game'
import {StrictMode} from "react";
import {Leva} from 'leva'
import {Perf} from 'r3f-perf'


createRoot(document.getElementById('root')).render(
    < StrictMode>
        <Leva collapsed={true}/>
        <Canvas
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
