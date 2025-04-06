import {RigidBody, useRapier} from "@react-three/rapier";
import {useGLTF, useKeyboardControls} from "@react-three/drei";
import {useFrame} from "@react-three/fiber";
import {useEffect, useRef, useState} from "react";
import {useControls} from "leva";
import * as THREE from "three"


export default function Player() {
    const fox = useGLTF('./Fox/glTF/Fox.gltf')

    const body = useRef();
    const [subscribeKeys, getKeys] = useKeyboardControls()
    const {rapier, world} = useRapier()
    const [ smoothedCameraPosition ] = useState(() => new THREE.Vector3(10, 10, 10))
    const [ smoothedCameraTarget ] = useState(() => new THREE.Vector3())


    const {
        friction,
        restitution,
        linearDamping,
        angularDamping,
        walkImpulseStrength,
        jumpHeight,
        jumpTriggerHeight
    } = useControls("PlayerMovement", {
            friction: {value:-0.5, min: -1, max: 1, step: 0.01},
            restitution: {value: 0.0, min: 0, max: 1, step: 0.01},
            linearDamping: {value: 1, min: 0, max: 5, step: 0.01},
            angularDamping: {value: 1, min: 0, max: 5, step: 0.01},
            walkImpulseStrength: {value: 0.5, min: 0, max: 5, step: 0.01},
            jumpTriggerHeight: {value: 0.05, min: 0, max: 0.5, step: 0.01},
            jumpHeight: {value: 0.6, min: 0, max: 1, step: 0.01}
        }
    )


    const jump = () => {
        const origin = body.current.translation();
        origin.y -= 0.03
        const ray = new rapier.Ray(origin, {x: 0, y: -1, z: 0}) //where the ray starts and in which direction
        const hit = world.castRay(ray, 10, true)
        if (hit.timeOfImpact < jumpTriggerHeight)
            body.current.applyImpulse({x: 0.0, y: jumpHeight, z: 0.0}, false)

    }


    useEffect(() => {
        /**
         * Controls
         */
        const unsubscribeJump = subscribeKeys(
            (state) => state.jump
            ,
            (value) => {
                if (value)
                    jump()
            }
        )

        return () => {
            unsubscribeJump()
        }

    }, [])


    useFrame((state, delta) => {
        /**
         * Controls
         */
        const {forward, backward, leftward, rightward, jump} = getKeys()
        const impulse = {x: 0.0, y: 0, z: 0.0}

        const impulseStrength = walkImpulseStrength * delta

        if (forward) {
            impulse.z -= impulseStrength
            body.current
        }
        if (backward) {
            impulse.z += impulseStrength
        }
        if (rightward) {
            impulse.x += impulseStrength
        }
        if (leftward) {
            impulse.x -= impulseStrength
        }
        // Wenn in beiden Richtungen bewegt wird, normalisiere den Vektor:
        if (impulse.x !== 0 && impulse.z !== 0) {
            impulse.x /= Math.sqrt(2);
            impulse.z /= Math.sqrt(2);
        }

        body.current.applyImpulse(impulse, true)



        /**
         * Camera
         */

        const bodyPosition = body.current.translation()

        const cameraPosition = new THREE.Vector3()
        cameraPosition.copy(bodyPosition)
        cameraPosition.z += 2.9
        cameraPosition.y += 1.8

        const cameraTarget = new THREE.Vector3()
        cameraTarget.copy(bodyPosition)
        cameraTarget.y += 0.25

        smoothedCameraPosition.lerp(cameraPosition, 5 * delta)
        smoothedCameraTarget.lerp(cameraTarget, 5 * delta)

        state.camera.position.copy(smoothedCameraPosition)
        state.camera.lookAt(smoothedCameraTarget)

    })

    return (
        <RigidBody
            ref={body}
            canSleep={false}
            position-y={1}
            friction={friction}
            restitution={restitution}
            linearDamping={linearDamping}
            angularDamping={angularDamping}
            rotation-y={Math.PI}
            scale={0.008}
            type={"dynamic"}
        >
            <primitive object={fox.scene}/>
        </RigidBody>
    )
}