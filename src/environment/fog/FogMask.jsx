// src/environment/fog/FogMask.js
import * as THREE from 'three/webgpu'
import { texture, vec2, sub } from 'three/tsl'
import { useLoader } from '@react-three/fiber'
import { uvOffset, uvScale } from '../Terrain/TerrainConstants.js'

/**
 * useFogMask
 * - Lädt eine kreisförmige Alpha-Map (weiß = Mitte sichtbar, schwarz = Rand ausfaden)
 * - Gibt eine Funktion zurück, die einen Node liefert: mask(worldXZ) -> 0..1
 *   (1 = Mitte / sichtbar, 0 = Rand / ausblenden)
 */
export function useFogMask(url = '/fog/fogRadial.png') {
    const fogTex = useLoader(THREE.TextureLoader, url)
    // WICHTIG: Masken sind non-color:
    fogTex.colorSpace = THREE.NoColorSpace
    fogTex.wrapS = fogTex.wrapT = THREE.ClampToEdgeWrapping
    fogTex.flipY = false

    /**
     * buildMaskNode(worldXZNode)
     * worldXZNode: z.B. positionWorld.xz
     */
    const buildMaskNode = (worldXZNode) => {
        // identische Projektions-UVs wie Terrain:
        const u = worldXZNode.x.add(uvOffset.x).mul(uvScale.x)
        const v = worldXZNode.y.add(uvOffset.y).mul(uvScale.y)
        // Terrain-Texturen werden vertikal geflippt → hier genauso:
        const uvNode = vec2(u, sub(1.0, v))
        // Maske aus Rotkanal (grau = alle Kanäle gleich)
        return texture(fogTex, uvNode).r
    }

    return { buildMaskNode }
}
