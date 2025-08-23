import { pass } from 'three/tsl'
import { PostProcessing } from 'three/webgpu'
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import { useFrame, useThree } from '@react-three/fiber'
import { folder, useControls } from 'leva'
import { useRef, useEffect } from 'react'

export default function Postprocessing() {
    const {
        threshold, strength, radius,
        toneMappingExposure,
    } = useControls('Materials', {
        Bloom: folder({
            threshold: { value: 0.00, min: 0.0, max: 1, step: 0.01 },
            strength: { value: 0.1, min: 0.0, max: 3, step: 0.01 },
            radius: { value: 0.1, min: 0.0, max: 1, step: 0.01 },
        }, { collapsed: true }),
        ToneMapping: folder({
            toneMappingExposure: { value: 0.7, min: 0.1, max: 3, step: 0.01 },
        }, { collapsed: true }),
    }, { collapsed: true })

    const bloomPassRef = useRef()
    const postProcessingRef = useRef()
    const { scene, camera, gl: renderer } = useThree()

    useEffect(() => {
        if (!renderer || !scene || !camera) {
            return
        }

        const scenePass = pass(scene, camera)
        const outputPass = scenePass.getTextureNode('output')

        const bloomPass = bloom(outputPass, strength, radius, threshold)
        bloomPassRef.current = bloomPass

        const postProcessing = new PostProcessing(renderer)

        const outputNode = outputPass.add(bloomPass)
        postProcessing.outputNode = outputNode
        postProcessingRef.current = postProcessing

        return () => {
            postProcessingRef.current = null
        }
    }, [renderer, scene, camera, threshold, strength, radius])

    useFrame(() => {
        if (postProcessingRef.current) {
            postProcessingRef.current.render()
        }
        if (renderer) renderer.toneMappingExposure = toneMappingExposure
    }, 1)

    return null
}
