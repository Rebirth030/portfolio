import * as THREE from 'three/webgpu'
import { useLoader } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'

export function useTerrainAssets() {
    const { nodes } = useGLTF('/PortfolioTerrain.glb', true)

    const terrainMapTex  = useLoader(THREE.TextureLoader, '/TerrainColoring0000.png')
    const noiseTex       = useLoader(THREE.TextureLoader, '/noiseTexture.png')
    const heightMapTex   = useLoader(THREE.TextureLoader, '/Heightmap.png')
    const terrainPathTex = useLoader(THREE.TextureLoader, '/TerrainColoring0000.png')
    const fogMaskTex = useLoader(THREE.TextureLoader, '/AlphaMap.png')

// Wraps wie zuvor
    fogMaskTex.wrapS = fogMaskTex.wrapT = THREE.ClampToEdgeWrapping
    terrainMapTex.wrapS = terrainMapTex.wrapT = THREE.RepeatWrapping
    terrainPathTex.wrapS = terrainPathTex.wrapT = THREE.RepeatWrapping
    noiseTex.wrapS       = noiseTex.wrapT       = THREE.RepeatWrapping
    heightMapTex.wrapS   = heightMapTex.wrapT   = THREE.ClampToEdgeWrapping

// WICHTIG: FlipY exakt wie „früher“ (siehe Begründung oben)
    terrainMapTex.flipY  = true
    terrainPathTex.flipY = true
    heightMapTex.flipY   = true
    noiseTex.flipY       = true  // unkritisch, aber macht es konsistent

// Masken schärfer, kein Mipmap-Bleeding (Pfadbreite bleibt stabil)
    terrainMapTex.generateMipmaps  = false
    terrainMapTex.minFilter        = THREE.LinearFilter
    terrainMapTex.magFilter        = THREE.LinearFilter

    terrainPathTex.generateMipmaps = false
    terrainPathTex.minFilter       = THREE.LinearFilter
    terrainPathTex.magFilter       = THREE.LinearFilter
    // Height/Noise dürfen Mips behalten (ok für Glättung), aber falls du 1:1 willst:
    // heightMapTex.generateMipmaps = false
    // heightMapTex.minFilter = THREE.LinearFilter
    // heightMapTex.magFilter = THREE.LinearFilter

    return { nodes, terrainMapTex, terrainPathTex, noiseTex, heightMapTex, fogMaskTex }
}
