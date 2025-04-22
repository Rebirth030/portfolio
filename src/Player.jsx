import { useRef, useEffect, useMemo } from "react";
import { RigidBody, CapsuleCollider, useRapier } from "@react-three/rapier";
import { useGLTF, useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useControls, folder } from "leva"; // Import folder
import * as THREE from "three";


const UP_VECTOR = new THREE.Vector3(0, 1, 0);
const DOWN_VECTOR = new THREE.Vector3(0, -1, 0);


export default function Player() {

    const body = useRef();
    const meshRef = useRef();
    const [subscribeKeys, getKeys] = useKeyboardControls();
    const { rapier, world } = useRapier();
    const rapierWorld = world;

    // --- 3D Model ---
    // Use useMemo to prevent reloading/re-cloning the model unnecessarily
    const { scene: foxScene } = useGLTF("./Fox/glTF/Fox.gltf");

    // --- Leva Controls ---
    const {
        // Physics Properties (existing)
        friction, restitution, linearDamping, angularDamping,
        // Capsule Collider (new, default to current values)
        capsuleHalfHeight, capsuleRadius,
        // Movement (existing + new)
        walkImpulseStrength, runMultiplier, airControlMultiplier, rotationSpeed,
        // Jumping (existing + new)
        jumpHeight, jumpTriggerHeight, groundCheckDistance,
        // Camera Follow (new)
        cameraOffsetY, cameraOffsetZ, cameraTargetOffsetY, cameraLerpFactor,
    } = useControls("Player Settings", {
        Physics: folder({
             friction: { value: 0.5, min: 0, max: 1, step: 0.01 },
             restitution: { value: 0.1, min: 0, max: 1, step: 0.01 },
             linearDamping: { value: 0.9, min: 0, max: 5, step: 0.01 },
             angularDamping: { value: 0.9, min: 0, max: 5, step: 0.01 },
        }),
        Collider: folder({
            // Default to current hardcoded values
            capsuleHalfHeight: { value: 0.3, min: 0.1, max: 1, step: 0.01 },
            capsuleRadius: { value: 0.3, min: 0.1, max: 1, step: 0.01 },
        }),
        Movement: folder({
             walkImpulseStrength: { value: 3.5, min: 0, max: 10, step: 0.1 },
             runMultiplier: { value: 1.40, min: 1, max: 5, step: 0.01 },
             airControlMultiplier: { value: 0.2, min: 0, max: 1, step: 0.01 },
             rotationSpeed: { value: 15, min: 1, max: 30, step: 1 },
        }),
        Jumping: folder({
            jumpHeight: { value: 1.5, min: 0, max: 10, step: 0.1 },
            // How close to ground to *initiate* jump
            jumpTriggerHeight: { value: 0.1, min: 0.01, max: 0.5, step: 0.01 },
            // How far to check down for ground status in general
            groundCheckDistance: { value: 0.15, min: 0.01, max: 0.5, step: 0.01 },
        }),
        Camera: folder({
            // Defaults based on previous hardcoded values
            cameraOffsetY: { value: 3.9, min: 0, max: 5, step: 0.1 },
            cameraOffsetZ: { value: 4.0, min: 1, max: 10, step: 0.1 },
            cameraTargetOffsetY: { value: 0.3, min: 0, max: 5, step: 0.1 },
            cameraLerpFactor: { value: 5.0, min: 1, max: 20, step: 0.1 },
        }),
    });

    // --- Camera State ---
    const smoothedCameraPosition = useMemo(() => new THREE.Vector3(10, 10, 10), []);
    const smoothedCameraTarget = useMemo(() => new THREE.Vector3(), []);

    // --- Reusable Objects for Frame Loop ---
    const _rayOrigin = useMemo(() => new THREE.Vector3(), []);
    const _impulse = useMemo(() => new THREE.Vector3(), []);
    const _cameraPosition = useMemo(() => new THREE.Vector3(), []);
    const _cameraTarget = useMemo(() => new THREE.Vector3(), []);
    const _rotateQuat = useMemo(() => new THREE.Quaternion(), []);

    // --- Ground Check Function ---
    const checkGrounded = (rigidBody, distance) => {
        if (!rapierWorld || !rigidBody) return false;

        // Raycast origin: center of the bottom sphere of the capsule
        _rayOrigin.copy(rigidBody.translation());
        _rayOrigin.y -= capsuleHalfHeight; // Move origin to the bottom sphere center

        const ray = new rapier.Ray(_rayOrigin, DOWN_VECTOR);
        const maxToi = distance + capsuleRadius; // Check from sphere surface down
        const solid = true;
        const colliderToExclude = rigidBody.collider(0); // Get the body's collider

        const hit = rapierWorld.castRay(
            ray, maxToi, solid,
            undefined, undefined, // filterFlags, filterGroups
            colliderToExclude
        );

        // Grounded if hit is within the desired distance from the *surface* of the bottom sphere
        return hit && typeof hit.timeOfImpact === 'number' && hit.timeOfImpact <= distance + capsuleRadius;
    };


    // --- Jump Action ---
    const jump = () => {
        const rigidBody = body.current;
        if (!rigidBody) return;

        // Check if grounded before jumping using the specific jumpTriggerHeight
        if (checkGrounded(rigidBody, jumpTriggerHeight)) {
            rigidBody.applyImpulse({ x: 0, y: jumpHeight, z: 0 }, true);
        }
    };

    useEffect(() => {
        const unsubscribeJump = subscribeKeys(
            (state) => state.jump,
            (value) => { if (value) jump(); }
        );
        return unsubscribeJump;
    }, [subscribeKeys, jump, rapierWorld, capsuleHalfHeight, capsuleRadius, jumpHeight, jumpTriggerHeight]); // Added dependencies


    useFrame((state, delta) => {
        const bodyApi = body.current;
        const mesh = meshRef.current;

        if (!bodyApi || !mesh || !rapierWorld) return;

        const isGrounded = checkGrounded(bodyApi, groundCheckDistance);

        const { forward, backward, leftward, rightward, run } = getKeys();

        _impulse.set(
            (rightward ? 1 : 0) - (leftward ? 1 : 0),
            0, // Horizontal impulse only
            (backward ? 1 : 0) - (forward ? 1 : 0)
        );
        const hasInput = _impulse.lengthSq() > 0;

        if (hasInput) {
             _impulse.normalize();

            let baseStrength = walkImpulseStrength;
            if (!isGrounded) {
                baseStrength *= airControlMultiplier;
            }

            const runActive = isGrounded && run;
            const effectiveImpulseStrength = runActive ? baseStrength * runMultiplier : baseStrength;


            _impulse.multiplyScalar(effectiveImpulseStrength * delta);
            bodyApi.applyImpulse(_impulse, true);


            const moveAngle = Math.atan2(_impulse.x / (effectiveImpulseStrength * delta), _impulse.z / (effectiveImpulseStrength * delta)); // Get angle from normalized direction
             _rotateQuat.setFromAxisAngle(UP_VECTOR, moveAngle);

             mesh.quaternion.rotateTowards(_rotateQuat, delta * rotationSpeed);
        }


        const bodyPosition = bodyApi.translation();
        _cameraPosition.set(
            bodyPosition.x,
            bodyPosition.y + cameraOffsetY,
            bodyPosition.z + cameraOffsetZ
        );
        _cameraTarget.set(
            bodyPosition.x,
            bodyPosition.y + cameraTargetOffsetY,
            bodyPosition.z
        );

        smoothedCameraPosition.lerp(_cameraPosition, cameraLerpFactor * delta);
        smoothedCameraTarget.lerp(_cameraTarget, cameraLerpFactor * delta);

        state.camera.position.copy(smoothedCameraPosition);
        state.camera.lookAt(smoothedCameraTarget);
    });


    return (
        <RigidBody
            ref={body}
            colliders={false}
            canSleep={false}
            position={[0, 1, 0]}
            friction={friction}
            restitution={restitution}
            linearDamping={linearDamping}
            angularDamping={angularDamping}
            type="dynamic"
            enabledRotations={[false, false, false]}
        >

            <CapsuleCollider args={[capsuleHalfHeight, capsuleRadius]} />

            <primitive
                object={foxScene} // Use the cloned model
                scale={0.008}
                position-y={-0.5}
                ref={meshRef}
                rotation-y={Math.PI}
            />
        </RigidBody>
    );
}