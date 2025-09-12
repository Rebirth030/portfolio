import { useMemo } from 'react'
import * as THREE from 'three/webgpu'
import { HeightfieldCollider } from '@react-three/rapier'
import { useGLTF } from '@react-three/drei'
import { useTerrainAssets } from './TerrainAssets.js'
import {
    BRIDGE_GLB, BRIDGE_NAME, BRIDGE_MARGIN,
    MIN_BLUE, MAX_BLUE, FOG_BLACK, WALL_TOP_Y, DILATE
} from './TerrainConstants.js'

function imageToImageData(imgLike) {
    const c = document.createElement('canvas')
    const w = imgLike.width, h = imgLike.height
    c.width = w; c.height = h
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(imgLike, 0, 0, w, h)
    return ctx.getImageData(0, 0, w, h)
}

function getBridgeRectsFromGLB(gltfScene) {
    const rects = []
    if (!gltfScene) return rects
    const box = new THREE.Box3()

    const bridges = []
    gltfScene.traverse((o) => {
        if (o.name === BRIDGE_NAME || o.name?.toLowerCase().includes('bridge')) bridges.push(o)
    })

    for (const o of bridges) {
        o.updateWorldMatrix(true, true)
        box.setFromObject(o)
        rects.push({
            minX: box.min.x - BRIDGE_MARGIN,
            maxX: box.max.x + BRIDGE_MARGIN,
            minZ: box.min.z - BRIDGE_MARGIN,
            maxZ: box.max.z + BRIDGE_MARGIN,
        })
    }
    return rects
}

function pointInRectXZ(x, z, r) {
    return x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ
}

export default function TerrainPhysics() {
    const { nodes, terrainMapTex, fogMaskTex } = useTerrainAssets()
    const models = useGLTF(BRIDGE_GLB, true)

    const { heights, widthSegs, maxX, minX, maxZ, minZ } = useMemo(() => {
        const mesh = nodes?.Plane
        if (!mesh) return { heights: new Float32Array(4), widthSegs: 1, maxX:1, minX:0, maxZ:1, minZ:0 }

        const posAttr = mesh.geometry.attributes.position
        const uvAttr  = mesh.geometry.attributes.uv
        const total   = posAttr.count
        const rows    = Math.sqrt(total) | 0
        const widthSegs = rows - 1

        mesh.geometry.computeBoundingBox()
        const bb = mesh.geometry.boundingBox
        const [minX, maxX] = [bb.min.x, bb.max.x]
        const [minZ, maxZ] = [bb.min.z, bb.max.z]

        const heights = new Float32Array(rows * rows).fill(bb.min.y)
        const deltaX = (maxX - minX) / widthSegs
        const deltaZ = (maxZ - minZ) / widthSegs

        // Bilddaten: Wasser (blau)
        const img = terrainMapTex?.image
        const imgData = img ? imageToImageData(img) : null
        const iw = imgData?.width  ?? 0
        const ih = imgData?.height ?? 0
        const data = imgData?.data

        // Bilddaten: Fog-AlphaMap (grau)
        const fImg  = fogMaskTex?.image
        const fID   = fImg ? imageToImageData(fImg) : null
        const fw    = fID?.width  ?? 0
        const fh    = fID?.height ?? 0
        const fData = fID?.data

        const sampleBlue = (u, v) => {
            if (!data) return 0
            // Kein (1 - v) – identische UV-Konvention wie im Shader
            const x = Math.min(iw - 1, Math.max(0, Math.round(u * (iw - 1))))
            const y = Math.min(ih - 1, Math.max(0, Math.round(v * (ih - 1))))
            const idx = (y * iw + x) * 4
            return data[idx + 2] / 255
        }

        const sampleFog = (u, v) => {
            if (!fData) return 1 // „weiß“ = kein Block
            const x = Math.min(fw - 1, Math.max(0, (u * (fw - 1) + 0.5) | 0))
            const y = Math.min(fh - 1, Math.max(0, (v * (fh - 1) + 0.5) | 0))
            const idx = (y * fw + x) * 4
            return fData[idx] * (1/255) // Rotkanal
        }

        const isWaterBlue = (b) => b >= MIN_BLUE && b <= MAX_BLUE
        const isFogBlack  = (a) => a <= FOG_BLACK

        const bridgeRects = getBridgeRectsFromGLB(models?.scene)

        const mask = new Uint8Array(rows * rows)

        // 1) Basis-Höhen & Maske füllen
        for (let k = 0; k < total; k++) {
            const x = posAttr.array[k*3]
            const y = posAttr.array[k*3 + 1]
            const z = posAttr.array[k*3 + 2]

            let i = Math.round((x - minX) / deltaX)
            let j = Math.round((z - minZ) / deltaZ)
            i = Math.min(Math.max(i, 0), widthSegs)
            j = Math.min(Math.max(j, 0), widthSegs)

            const idxHF = i * rows + j // column-major
            heights[idxHF] = y

            if (uvAttr && (data || fData)) {
                const u = uvAttr.getX(k)
                const v = uvAttr.getY(k)

                // Wasser (mit Bridge-Cutout)
                let water = isWaterBlue(sampleBlue(u, v))
                if (water && bridgeRects.length) {
                    for (const r of bridgeRects) {
                        if (pointInRectXZ(x, z, r)) { water = false; break }
                    }
                }

                // Fog-Blockade (kein Cutout)
                const fogA = sampleFog(u, v)
                const fogBlock = isFogBlack(fogA)

                mask[j * rows + i] = (water || fogBlock) ? 1 : 0
            }
        }

        // 2) Optionale Dilation
        if (DILATE && (data || fData)) {
            const out = new Uint8Array(mask.length)
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < rows; x++) {
                    let on = mask[y*rows + x]
                    if (!on) {
                        for (let dy=-1; dy<=1 && !on; dy++) {
                            for (let dx=-1; dx<=1 && !on; dx++) {
                                const nx=x+dx, ny=y+dy
                                if (nx>=0 && nx<rows && ny>=0 && ny<rows) on = mask[ny*rows + nx]
                            }
                        }
                    }
                    out[y*rows + x] = on
                }
            }
            mask.set(out)
        }

        // 3) Blockstellen anheben
        const wallY = Math.max(bb.max.y + 10, WALL_TOP_Y)
        for (let j = 0; j < rows; j++) {
            for (let i = 0; i < rows; i++) {
                if (mask[j*rows + i]) {
                    heights[i*rows + j] = wallY
                }
            }
        }

        return { heights, widthSegs, maxX, minX, maxZ, minZ }
    }, [nodes, terrainMapTex, fogMaskTex, models])

    return (
        <group position={[0, -20, 0]}>
            <HeightfieldCollider
                args={[widthSegs, widthSegs, heights, new THREE.Vector3(maxX - minX, 1, maxZ - minZ)]}
                friction={1.5}
            />
        </group>
    )
}
