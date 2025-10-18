// app/Zone.jsx

import { RigidBody, CuboidCollider} from '@react-three/rapier'

import {useGameStore} from "../hooks/useGame.js";
import {getZone} from "./constants/stations.js";


export default function Zone({ id}) {
    const setActiveStation = useGameStore((s) => s.setActiveStation)

    const onEnter = () => setActiveStation(id)
    const onExit  = () => setActiveStation(null)
    const zone = getZone(id)

    return (
        <RigidBody type="fixed" colliders={false} enabledRotations={[false,false,false]} ccd={false}>
                <CuboidCollider
                    args={[zone.radius ?? 3, zone.height ?? 3, zone.depth ?? 3]} // [halfHeight, radius]
                    position={zone.position}
                    sensor
                    onIntersectionEnter={onEnter}
                    onIntersectionExit={onExit}
                />
            )
        </RigidBody>
    )
}
