import * as THREE from 'three/webgpu'
import { useLoader } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'

export function useTerrainAssets() {
  const { nodes } = useGLTF('/PortfolioTerrain.glb', true)
  const terrainMapTex = useLoader(THREE.TextureLoader, '/TerrainColoring0000.png')
  const noiseTex = useLoader(THREE.TextureLoader, '/noiseTexture.png')
  const heightMapTex = useLoader(THREE.TextureLoader, '/Heightmap.png')
  const terrainPathTex = useLoader(THREE.TextureLoader, '/TerrainColoring0000.png')
  // Wrapping
  ;[terrainMapTex, terrainPathTex, noiseTex].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping })
  heightMapTex.wrapS = heightMapTex.wrapT = THREE.ClampToEdgeWrapping
  // ColorSpace
  terrainMapTex.colorSpace = THREE.SRGBColorSpace
  terrainPathTex.colorSpace = THREE.SRGBColorSpace
  noiseTex.colorSpace = THREE.LinearSRGBColorSpace
  heightMapTex.colorSpace = THREE.LinearSRGBColorSpace
  return { nodes, terrainMapTex, noiseTex, heightMapTex, terrainPathTex }
}
