import { useGLTF, useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three/webgpu';

export function useTerrainTextures() {
  const terrainMapTex = useTexture('/TerrainColoring0000.png');
  const noiseTex = useTexture('/noiseTexture.png');
  const heightMapTex = useTexture('/Heightmap.png');
  const terrainPathTex = useTexture('/TerrainColoring0000.png');

  useMemo(() => {
    [terrainMapTex, noiseTex].forEach(t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
    });
    terrainPathTex.wrapS = terrainPathTex.wrapT = THREE.RepeatWrapping;
    terrainPathTex.colorSpace = THREE.SRGBColorSpace;
    heightMapTex.wrapS = heightMapTex.wrapT = THREE.ClampToEdgeWrapping;
  }, [terrainMapTex, noiseTex, heightMapTex, terrainPathTex]);

  return { terrainMapTex, noiseTex, heightMapTex, terrainPathTex };
}

export function useBridgeMesh() {
  const gltf = useGLTF('Models.glb', true);
  return useMemo(() => gltf.scene.children[0], [gltf]);
}

export function usePortfolioTerrain() {
  const { nodes } = useGLTF('/PortfolioTerrain.glb', true);
  return useMemo(() => ({ mesh: nodes.Plane }), [nodes]);
}
