import { useRef } from 'react'
import { Physics } from '@react-three/rapier'

import Environment from '../environment/Environment.jsx'
import Player from '../player/Player.jsx'
import Postprocessing from './Postprocessing.jsx'
import {OrbitControls} from "@react-three/drei";
import PreloadAssets from "./PreLoadAssets.jsx";

/**
 * Game kapselt die Physik (Rapier) und orchestriert Environment + Player.
 * Ein einziger playerRef wird an Environment (Lichter/Gras) und Player (RigidBody-API) weitergegeben.
 */
export default function Game() {
    const playerRef = useRef(null)

    return (
        <>
            <PreloadAssets />
            <OrbitControls />
            <Physics debug={false} updateLoop="follow" timestep="fixed">
                <Environment playerRef={playerRef} />
                <Player ref={playerRef} />
            </Physics>
            <Postprocessing />
        </>
    )
}
