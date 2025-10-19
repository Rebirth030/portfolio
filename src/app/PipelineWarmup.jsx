import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

/**
 * Erzwingt nach dem ersten Frame die Pipeline-/Shader-Kompilierung für die
 * aktuell montierte Szene (inkl. Shadow- und Post-Pass Ressourcen).
 * Wirkung: keine "erstes Mal im Blick" Stotterer mehr.
 */
export default function PipelineWarmup({ delayMs = 50 }) {
    const { gl: renderer, scene, camera } = useThree()

    useEffect(() => {
        let alive = true
        let t = setTimeout(async () => {
            if (!alive || !renderer || !scene || !camera) return
            try {
                // 1) Alles vorbereiten (WebGPU: erstellt Pipelines/Bindgroups)
                if (renderer.compileAsync) {
                    await renderer.compileAsync(scene, camera)
                } else {
                    renderer.compile(scene, camera)
                }

                // 2) Ein bis zwei „leere“ Renderläufe, damit auch Post-FX warm sind
                // (falls Postprocessing.useFrame rendert, genügt ein normaler render())
                renderer.render(scene, camera)
                renderer.render(scene, camera)
            } catch (e) {
                // Fallback: ignorieren – Warmup ist optional
                // console.warn('Pipeline warmup skipped:', e)
            }
        }, delayMs)
        return () => { alive = false; clearTimeout(t) }
    }, [renderer, scene, camera, delayMs])

    return null
}
