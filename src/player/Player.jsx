import { useRef, useEffect, useMemo, useState, forwardRef } from 'react'
import { RigidBody, CapsuleCollider} from '@react-three/rapier'
import { useAnimations, useGLTF, useKeyboardControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useControls, folder } from 'leva'
import * as THREE from 'three/webgpu'
import buildNodeMaterialFromExisting from '../utils/buildNodeMaterialFromExisting.js'

const UP_VECTOR = new THREE.Vector3(0, 1, 0)

function useSmoothCamera(bodyApi, {
    cameraFollowing,
    cameraOffsetY,
    cameraOffsetZ,
    cameraTargetOffsetY,
    cameraLerpFactor
}) {
    const smoothedPos = useMemo(() => new THREE.Vector3(), [])
    const smoothedTg  = useMemo(() => new THREE.Vector3(), [])
    const tmpPos      = useMemo(() => new THREE.Vector3(), [])
    const tmpTg       = useMemo(() => new THREE.Vector3(), [])

    useFrame((state, delta) => {
        if (!bodyApi || !cameraFollowing) return
        const p = bodyApi.translation()
        tmpPos.set(p.x, p.y + cameraOffsetY, p.z + cameraOffsetZ)
        tmpTg.set(p.x, p.y + cameraTargetOffsetY, p.z)
        smoothedPos.lerp(tmpPos, cameraLerpFactor * delta)
        smoothedTg .lerp(tmpTg,  cameraLerpFactor * delta)
        state.camera.position.copy(smoothedPos)
        state.camera.lookAt(smoothedTg)
    })
}

const Player = forwardRef(function Player(_props, reference) {
    const [, getKeys] = useKeyboardControls()

    const momentum   = useRef(new THREE.Vector3())
    const prevSector = useRef(0)
    const meshRef    = useRef()
    const bodyRef    = useRef()

    const { scene: characterScene, animations } = useGLTF('./Character.glb')
    const { actions, names } = useAnimations(animations, characterScene)
    const [currentAction, setCurrentAction] = useState('Idle')

    const idleIndex = Math.max(0, names.indexOf('Idle'))
    const walkIndex = Math.max(0, names.indexOf('Walk'))
    const runIndex  = Math.max(0, names.indexOf('Run'))

    useEffect(() => {
        characterScene.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true
                child.receiveShadow = true
                child.material = buildNodeMaterialFromExisting(child.material)
                child.geometry?.computeVertexNormals?.()
            }
        })
    }, [characterScene])

    const {
        capsuleHalfHeight, capsuleRadius,
        walkImpulseStrength, runMultiplier, rotationSpeed, decelFactor,
        cameraOffsetY, cameraOffsetZ, cameraTargetOffsetY, cameraLerpFactor, cameraFollowing
    } = useControls('Player Settings', {
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
        Camera: folder({
            cameraFollowing:     { value: true },
            cameraOffsetY:       { value: 16.2,  min: 0,  max: 20, step: 0.1 },
            cameraOffsetZ:       { value: 15.6,  min: 1,  max: 20, step: 0.1 },
            cameraTargetOffsetY: { value: 0.3,   min: 0,  max: 5,  step: 0.1 },
            cameraLerpFactor:    { value: 5.0,   min: 1,  max: 20, step: 0.1 },
        }),
    }, { collapsed: true })

    useEffect(() => {
        const name =
            currentAction === 'Idle'
                ? names[idleIndex]
                : currentAction === 'Walk'
                    ? names[walkIndex]
                    : names[runIndex]
        const action = actions[name]
        action?.reset().fadeIn(0.2).play()
        return () => action?.fadeOut(0.5)
    }, [currentAction, actions, names, idleIndex, walkIndex, runIndex])

    const _dir  = useMemo(() => new THREE.Vector3(), [])
    const _quat = useMemo(() => new THREE.Quaternion(), [])
    const _zero = useMemo(() => new THREE.Vector3(), [])

    useSmoothCamera(bodyRef.current, {
        cameraFollowing,
        cameraOffsetY,
        cameraOffsetZ,
        cameraTargetOffsetY,
        cameraLerpFactor
    })

    useFrame((_, delta) => {
        const body = bodyRef.current
        if (!body) return

        const { forward, backward, leftward, rightward, run } = getKeys()
        _dir.set(
            ( rightward ?  1 : 0 ) - ( leftward  ? 1 : 0 ),
            0,
            ( backward  ? 1 : 0 ) - ( forward   ? 1 : 0 )
        )

        let sector = prevSector.current
        let targetVel = _zero
        if (_dir.lengthSq() > 0) {
            const angle = Math.atan2(_dir.x, _dir.z)
            const eight = (2 * Math.PI) / 8
            sector = Math.round(angle / eight) % 8
            const quantAngle = sector * eight
            const dir8 = new THREE.Vector3(Math.sin(quantAngle), 0, Math.cos(quantAngle))
            const speed = walkImpulseStrength * (run ? runMultiplier : 1)
            targetVel = dir8.multiplyScalar(speed)
        }

        if (sector !== prevSector.current) {
            momentum.current.copy(targetVel)
            prevSector.current = sector
        } else {
            const t = Math.min(1, decelFactor * delta)
            momentum.current.lerp(targetVel, t)
        }

        const { y } = body.linvel()
        body.setLinvel({ x: momentum.current.x, y, z: momentum.current.z }, true)

        if (_dir.lengthSq() > 0 && meshRef.current) {
            _quat.setFromAxisAngle(UP_VECTOR, sector * ((2 * Math.PI) / 8))
            meshRef.current.quaternion.rotateTowards(_quat, rotationSpeed * delta)
        }

        const nextAction = _dir.lengthSq() > 0 ? (run ? 'Run' : 'Walk') : 'Idle'
        if (currentAction !== nextAction) setCurrentAction(nextAction)
    })

    return (
        <RigidBody
            ref={(api) => {
                // Body-API intern halten UND dem Parent-Ref durchreichen
                bodyRef.current = api || undefined
                if (typeof reference === 'function') reference(api)
                else if (reference) reference.current = api
            }}
            colliders={false}
            canSleep={false}
            position={[0, 2, 0]}
            type="dynamic"
            enabledRotations={[false, false, false]}
        >
            <CapsuleCollider args={[capsuleHalfHeight, capsuleRadius]} />
            <primitive
                ref={meshRef}
                object={characterScene}
                position-y={-capsuleHalfHeight - capsuleRadius}
            />
        </RigidBody>
    )
})

export default Player
