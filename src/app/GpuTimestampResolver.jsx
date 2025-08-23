import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three/webgpu'

export default function GpuTimestampResolver() {
    const { gl } = useThree()
    useFrame(() => {
        if (gl && typeof gl.resolveTimestampsAsync === 'function') {
            gl.resolveTimestampsAsync(THREE.TimestampQuery.RENDER).catch(() => {})
        }
    })
    return null
}
