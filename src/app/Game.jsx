// app/Game.jsx
import { useEffect, useRef } from 'react'
import { Physics } from '@react-three/rapier'

import Environment from '../environment/Environment.jsx'
import Player from '../player/Player.jsx'

import { Html, OrbitControls } from '@react-three/drei'
import PreloadAssets from './PreLoadAssets.jsx'
import Postprocessing from './Postprocessing.jsx'
import CameraController from './CameraController.jsx'
import InteractionManager from './InteractionManager.jsx'
import {useGameStore} from "../hooks/useGame.js";


export default function Game() {
    const playerRef = useRef(null)


    return (
        <>
            {/* 3D */}
            <Physics debug={false} updateLoop="follow" timestep="fixed">
                <PreloadAssets />
                <Environment playerRef={playerRef} />
                <Player ref={playerRef} />
            </Physics>

            {/* Kamera + Interaktion */}
            <CameraController playerRef={playerRef} />
            <InteractionManager />

            <Postprocessing />
            <OrbitControls />
        </>
    )
}
