// app/Zone.jsx
import { useEffect, useMemo, useRef } from 'react'
import { RigidBody, CuboidCollider, interactionGroups } from '@react-three/rapier'

import {useGameStore} from "../hooks/useGame.js";


export default function Zone({ id, zone, focusPose }) {
    const setActiveStation = useGameStore((s) => s.setActiveStation)

    const onEnter = () => setActiveStation(id)
    const onExit  = () => setActiveStation(null)

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
