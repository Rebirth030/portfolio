import {CapsuleCollider, RigidBody, useRapier} from "@react-three/rapier";
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
        friction: { value: 0.5, min: 0, max: 1, step: 0.01 },
        restitution: { value: 0.1, min: 0, max: 1, step: 0.01 },
        linearDamping: { value: 0.9, min: 0, max: 5, step: 0.01 },
        angularDamping: { value: 0.9, min: 0, max: 5, step: 0.01 },
        walkImpulseStrength: { value: 1.74, min: 0, max: 5, step: 0.01 },
        jumpTriggerHeight: { value: 0.1, min: 0, max: 0.5, step: 0.01 },
        jumpHeight: { value: 5, min: 0, max: 10, step: 0.1 }
    });


    const jump = () => {
        const origin = body.current.translation();
        const ray = new rapier.Ray(origin, { x: 0, y: -1, z: 0 });
        const hit = world.castRay(ray, 1, true);

        if (hit && hit.toi < jumpTriggerHeight) {
            body.current.applyImpulse({ x: 0, y: jumpHeight, z: 0 }, false);
        }
    };



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
        const { forward, backward, leftward, rightward } = getKeys();
        const impulse = new THREE.Vector3();

        const impulseStrength = walkImpulseStrength * delta;

        if (forward) impulse.z -= 1;
        if (backward) impulse.z += 1;
        if (leftward) impulse.x -= 1;
        if (rightward) impulse.x += 1;

        if (impulse.length() > 0) {
            impulse.normalize().multiplyScalar(impulseStrength);
            body.current.applyImpulse(impulse, true);

            const currentRotation = body.current.rotation();
            const targetAngle = Math.atan2(impulse.x, impulse.z);
            const rotationSpeed = 5; // Adjust for desired smoothness

            // Interpolate the Y-axis rotation
            const newY = THREE.MathUtils.lerp(currentRotation.y, targetAngle, rotationSpeed * delta);
            body.current.setRotation({ x: 0, y: newY, z: 0 }, true);
        }




        /**
         * Camera
         */

        const bodyPosition = body.current.translation();

        const desiredCameraPosition = new THREE.Vector3(
            bodyPosition.x,
            bodyPosition.y + 2,
            bodyPosition.z + 5
        );

        smoothedCameraPosition.lerp(desiredCameraPosition, 5 * delta);

        const cameraTarget = new THREE.Vector3(
            bodyPosition.x,
            bodyPosition.y + 1,
            bodyPosition.z
        );

        smoothedCameraTarget.lerp(cameraTarget, 5 * delta);

        state.camera.position.copy(smoothedCameraPosition);
        state.camera.lookAt(smoothedCameraTarget);

    })

    return (
        <RigidBody
            ref={body}
            colliders={false} // Disable automatic collider generation
            canSleep={false}
            position={[0, 1, 0]}
            friction={0.5}
            restitution={0.1}
            linearDamping={0.9}
            angularDamping={0.9}
            rotation={[0, Math.PI, 0]}
            scale={0.008}
            type="dynamic"
            enabledRotations={[false, true, false]}
        >
            {/* Define a capsule collider with halfHeight and radius */}
            <CapsuleCollider args={[0.35, 0.3]} />
            <primitive object={fox.scene} />
        </RigidBody>
    );
}