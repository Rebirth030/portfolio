import * as THREE from 'three/webgpu'

// Bestehende Werte
export const PLANE_POS = new THREE.Vector3(0, -3, 0)
export const PLANE_W = 256
export const PLANE_H = 256
export const uvOffset = new THREE.Vector2(128, 128)
export const uvScale  = new THREE.Vector2(1 / 256, 1 / 256)

// Neu ausgelagerte Konstanten (TerrainPhysics)
export const BRIDGE_GLB    = 'Models.glb'
export const BRIDGE_NAME   = 'Bridge'
export const BRIDGE_MARGIN = 1.1

export const MIN_BLUE   = 0.30     // Wasser-Schwelle für Heightfield Collider
export const MAX_BLUE   = 1.00
export const FOG_BLACK  = 0.3// Fog-AlphaMap: „schwarz genug“ ⇒ blockieren
export const WALL_TOP_Y = 50       // Höhe der unsichtbaren Sperre
export const DILATE     = true     // kleine Lücken schließen (3×3)
