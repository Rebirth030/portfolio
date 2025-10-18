// src/environment/PreloadAssets.jsx
import { useGLTF, useTexture, Preload } from '@react-three/drei'

// Alle Pfade so, wie sie im Screenshot stehen (im Public-Root mit führendem '/')
const GLBS = [
    '/Models.glb',
    '/Character.glb',
    '/PortfolioTerrain.glb',
    '/Instances.glb',
]

const TEXTURES = [
    '/AlphaMap.png',
    '/bushLeaves_sdf.png',
    '/spruceLeaves_sdf.png',
    '/noiseTexture.png',
    '/Heightmap.png',
    '/TerrainColoring0000.png',
]

// Optional export der Listen
export const ASSET_LIST = { GLBS, TEXTURES }

/**
 * Diese Komponente ruft die drei-eigenen Preload-Routinen auf.
 */
export default function PreloadAssets() {
    // GLB/GLTF (mit DRACO-Unterstützung, falls benötigt)
    GLBS.forEach((url) => useGLTF.preload(url, true))
    // Texturen (PNG/JPG)
    TEXTURES.forEach((url) => useTexture.preload(url))

    return <Preload all />
}
