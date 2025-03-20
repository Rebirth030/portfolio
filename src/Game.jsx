import { OrbitControls } from '@react-three/drei'
import {useControls} from 'leva'
import FloorGrid from "./exchange/FloorGrid.jsx";



export default function Game(){
    const { position } = useControls({
        position: "top-left"
    })

    return <>
        <OrbitControls makeDefault />

        <directionalLight
            castShadow={true}
            position={ [ 4, 4, 1 ] }
            intensity={ 4.5 }
            shadow-mapSize={ [ 1024, 1024 ] }
            shadow-camera-near={ 1 }
            shadow-camera-far={ 10 }
            shadow-camera-top={ 10 }
            shadow-camera-right={ 10 }
            shadow-camera-bottom={ - 10 }
            shadow-camera-left={ - 10 }
        />
        <ambientLight intensity={ 1.5 } />

        <mesh castShadow={true} position-x={ - 2 }>
            <sphereGeometry />
            <meshStandardMaterial color="orange" />
        </mesh>

        <mesh castShadow={true} position-x={ 2 } scale={ 1.5 }>
            <boxGeometry />
            <meshStandardMaterial color="mediumpurple" />
        </mesh>

        <mesh receiveShadow={true} position-y={ - 1 } rotation-x={ - Math.PI * 0.5 } scale={ 10 }>
            <planeGeometry />
            <meshStandardMaterial color="greenyellow" />
        </mesh>

    </>
}