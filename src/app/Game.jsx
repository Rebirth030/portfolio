// app/Game.jsx

import { Physics } from '@react-three/rapier'

import Environment from '../environment/Environment.jsx'
import Player from '../player/Player.jsx'

import PreloadAssets from './PreLoadAssets.jsx'
import Postprocessing from './Postprocessing.jsx'
import CameraController from './CameraController.jsx'
import InteractionManager from './InteractionManager.jsx'
import {useRef} from "react";
import OverlayRoot from "./overlays/OverlayRoot.jsx";



export default function Game() {
    const playerRef = useRef(null)


    return (
        <>
            <Physics debug={false} updateLoop="follow" timestep="fixed">
                <PreloadAssets />
                <Environment playerRef={playerRef} />
                <Player ref={playerRef} />
            </Physics>

            <CameraController playerRef={playerRef} />
            <InteractionManager />

            <Postprocessing />
        </>
    )
}
