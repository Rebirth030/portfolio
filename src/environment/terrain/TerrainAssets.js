import * as THREE from 'three/webgpu'
import { useLoader } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'

export function useTerrainAssets() {
  const { nodes } = useGLTF('/PortfolioTerrain.glb', true)
  const terrainMapTex = useLoader(THREE.TextureLoader, '/TerrainColoring0000.png')
  const noiseTex = useLoader(THREE.TextureLoader, '/noiseTexture.png')
  const heightMapTex = useLoader(THREE.TextureLoader, '/Heightmap.png')
  const terrainPathTex = useLoader(THREE.TextureLoader, '/TerrainColoring0000.png')
  terrainPathTex.wrapS = terrainPathTex.wrapT = THREE.RepeatWrapping
  ;[terrainMapTex, noiseTex].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping })
  heightMapTex.wrapS = heightMapTex.wrapT = THREE.ClampToEdgeWrapping
  return { nodes, terrainMapTex, noiseTex, heightMapTex, terrainPathTex }
}
