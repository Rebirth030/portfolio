import { useRef, useEffect, useMemo, useState, forwardRef, useImperativeHandle } from "react";
import { RigidBody, CapsuleCollider, useRapier } from "@react-three/rapier";
import { useAnimations, useGLTF, useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useControls, folder } from "leva";
import * as THREE from "three/webgpu";
import buildNodeMaterialFromExisting from "../materials/buildNodeMaterialFromExisting.js";
import { LAYERS } from "../physics/layers.js";

const UP_VECTOR = new THREE.Vector3(0, 1, 0);

// -----------------------------------------------------------------------------
// Hook: Smooth Camera Follow
// -----------------------------------------------------------------------------
function useSmoothCamera(bodyApi, {
    cameraFollowing,
    cameraOffsetY,
    cameraOffsetZ,
    cameraTargetOffsetY,
    cameraLerpFactor
}) {
    const smoothedPos = useMemo(() => new THREE.Vector3(), []);
    const smoothedTg  = useMemo(() => new THREE.Vector3(), []);
    const tmpPos      = useMemo(() => new THREE.Vector3(), []);
    const tmpTg       = useMemo(() => new THREE.Vector3(), []);

    useFrame((state, delta) => {
        if (!bodyApi || !cameraFollowing) return;
        const p = bodyApi.translation();
        tmpPos.set(p.x, p.y + cameraOffsetY, p.z + cameraOffsetZ);
        tmpTg.set(p.x, p.y + cameraTargetOffsetY, p.z);
        smoothedPos.lerp(tmpPos, cameraLerpFactor * delta);
        smoothedTg .lerp(tmpTg,  cameraLerpFactor * delta);
        state.camera.position.copy(smoothedPos);
        state.camera.lookAt(smoothedTg);
    })
}

// -----------------------------------------------------------------------------
// Player Component
// -----------------------------------------------------------------------------
const Player = forwardRef(function Player(props, ref) {
    // Refs & state
    const momentum     = useRef(new THREE.Vector3());
    const prevSector   = useRef(0);                   // track last 8-sector index
    const meshRef      = useRef();
    const bodyRef      = useRef();
    const [ , getKeys] = useKeyboardControls();
    useRapier();

    useImperativeHandle(ref, () => ({
        translation: () => bodyRef.current?.translation?.(),
        linvel: () => bodyRef.current?.linvel?.(),
        api: bodyRef.current,
    }));

    // Load model & animations
    const { scene: characterScene, animations } = useGLTF("./Character.glb");
    const { actions, names } = useAnimations(animations, characterScene);
    const [currentAction, setCurrentAction] = useState("Idle");

    const idleIndex = names.indexOf("Idle");
    const walkIndex = names.indexOf("Walk");
    const runIndex  = names.indexOf("Run");

    // Enable shadows once
    useEffect(() => {

        characterScene.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.material = buildNodeMaterialFromExisting(child.material)
                child.geometry.computeVertexNormals()
            }
        });
    }, [characterScene]);

    // Leva controls
    const {
        capsuleHalfHeight, capsuleRadius,
        walkImpulseStrength, runMultiplier, rotationSpeed, decelFactor,
        cameraOffsetY, cameraOffsetZ, cameraTargetOffsetY, cameraLerpFactor, cameraFollowing
    } = useControls("Player Settings", {
        Collider: folder({
            capsuleHalfHeight: { value: 0.7, min: 0.1, max: 1, step: 0.01 },
            capsuleRadius:     { value: 0.3, min: 0.1, max: 1, step: 0.01 },
        }, { collapsed: true }),
        Movement: folder({
            walkImpulseStrength: { value: 2.5, min: 0, max: 10, step: 0.1 },
            runMultiplier:       { value: 2.25, min: 1, max: 5, step: 0.01 },
            rotationSpeed:       { value: 15,   min: 1, max: 30, step: 1 },
            decelFactor:         { value: 4.75, min: 0.01, max: 10, step: 0.01 },
        }, { collapsed: true }),
        /* Jumping: folder({
          jumpHeight:           { value: 2.9,  min: 0,  max: 10,   step: 0.1 },
          jumpTriggerHeight:    { value: 0.1,  min: 0.01, max: 0.5, step: 0.01 },
          groundCheckDistance:  { value: 0.15, min: 0.01, max: 0.5, step: 0.01 },
          airControlMultiplier: { value: 0.2,  min: 0,    max: 1,   step: 0.01 },
        }, { collapsed: true }), */
        Camera: folder({
            cameraFollowing:     { value: true },
            cameraOffsetY:       { value: 16.2,  min: 0,  max: 20, step: 0.1 },
            cameraOffsetZ:       { value: 15.6,  min: 1,  max: 20, step: 0.1 },
            cameraTargetOffsetY: { value: 0.3,  min: 0,  max: 5,  step: 0.1 },
            cameraLerpFactor:    { value: 5.0,  min: 1,  max: 20, step: 0.1 },
        }),
    }, { collapsed: true });

    // Fade animation when currentAction changes
    useEffect(() => {
        const name = names[
            currentAction === "Idle" ? idleIndex
                : currentAction === "Walk" ? walkIndex
                    : runIndex
            ];
        const action = actions[name];
        action?.reset().fadeIn(0.2).play();
        return () => action?.fadeOut(0.5);
    }, [currentAction, actions, names]);

    // Pre-allocate temporaries
    const _dir   = useMemo(() => new THREE.Vector3(), []);
    const _quat  = useMemo(() => new THREE.Quaternion(), []);
    const _zero  = useMemo(() => new THREE.Vector3(), []);

    // Optional jump helpers (commented out)
    /*
    const checkGrounded = (rigidBody) => { … };
    const jump = () => { … };
    useEffect(() => { … }, [subscribeKeys, jump]);
    */

    // Attach smooth camera
    useSmoothCamera(bodyRef.current, {
        cameraFollowing,
        cameraOffsetY,
        cameraOffsetZ,
        cameraTargetOffsetY,
        cameraLerpFactor
    })

    // Main update loop
    useFrame((_, delta) => {
        const body = bodyRef.current;
        if (!body) return;

        // 1) Read input & build raw direction vector
        const { forward, backward, leftward, rightward, run } = getKeys();
        _dir.set(
            ( rightward ?  1 : 0 ) - ( leftward  ? 1 : 0 ),
            0,
            ( backward  ? 1 : 0 ) - ( forward   ? 1 : 0 )
        );

        // 2) Compute raw angle & quantize to 8 sectors
        let sector = prevSector.current;
        let targetVel = _zero;
        if (_dir.lengthSq() > 0) {
            const angle = Math.atan2(_dir.x, _dir.z);         // angle from Z-axis
            const eight = 2 * Math.PI / 8;
            sector = Math.round(angle / eight) % 8;          // nearest octant
            const quantAngle = sector * eight;
            // 3) Build quantized direction
            const dir8 = new THREE.Vector3(
                Math.sin(quantAngle),
                0,
                Math.cos(quantAngle)
            );
            // 4) Scale by desired speed
            const speed = walkImpulseStrength * (run ? runMultiplier : 1);
            targetVel = dir8.multiplyScalar(speed);
        }

        // 5) Update momentum:
        //    - if sector changed, snap immediately
        //    - else smoothly lerp towards targetVel
        if (sector !== prevSector.current) {
            momentum.current.copy(targetVel);
            prevSector.current = sector;
        } else {
            const t = Math.min(1, decelFactor * delta);
            momentum.current.lerp(targetVel, t);
        }

        // 6) Apply velocity (keep vertical)
        const { y } = body.linvel();
        body.setLinvel(
            { x: momentum.current.x, y, z: momentum.current.z },
            true
        );

        // 7) Rotate mesh to face quantized movement dir
        if (_dir.lengthSq() > 0) {
            _quat.setFromAxisAngle(UP_VECTOR, sector * (2 * Math.PI / 8));
            meshRef.current.quaternion.rotateTowards(_quat, rotationSpeed * delta);
        }

        // 8) Switch animations: Idle / Walk / Run
        const nextAction = _dir.lengthSq() > 0
            ? (run ? "Run" : "Walk")
            : "Idle";
        if (currentAction !== nextAction) {
            setCurrentAction(nextAction);
        }
    });

    return (
        <RigidBody
            ref={bodyRef}
            colliders={false}
            canSleep={false}
            position={[0, 25, 0]}
            type="dynamic"
            enabledRotations={[false, false, false]}
            collisionGroups={{ memberships: LAYERS.PLAYER, filters: LAYERS.TERRAIN | LAYERS.DEFAULT }}
        >
            <CapsuleCollider args={[capsuleHalfHeight, capsuleRadius]} />
            <primitive
                ref={meshRef}
                object={characterScene}
                position-y={-capsuleHalfHeight - capsuleRadius}
            />
        </RigidBody>
    );
});

export default Player;
