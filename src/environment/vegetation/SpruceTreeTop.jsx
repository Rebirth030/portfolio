// components/trees/SpruceTreeTop.jsx
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { baseLinearColor, createTreeLeafMaterialSDF } from '../../utils/foliageUtils.js'

export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
export const ringAngleOffset = (i) => i * GOLDEN_ANGLE

export function createSpruceTopMesh({
                                        // Farb-/Form-Parameter des Kegels
                                        color = '#4e833c',
                                        coneRadius = 1,
                                        coneHeight = 5,
                                        levels = 15,
                                        perLevelBottom = 8,
                                        perLevelTop = 3,
                                        levelCurve = 1.5,

                                        // Ebenengrößen/Neigung
                                        planeSizeBase = 1.5,
                                        planeSizeFalloff = 0.65,
                                        tiltAxisBottomDeg = 55,
                                        tiltAxisTopDeg = 25,
                                        randomJitter = 0.08,

                                        // Assets
                                        sdfUrl = '/spruceLeaves_sdf.png',
                                        screenNoiseUrl = '/noiseTexture.png'
                                    } = {}) {
    const baseLin = baseLinearColor(color)
    const axisY = new THREE.Vector3(0, 1, 0)
    const geos = []

    for (let li = 0; li < levels; li++) {
        const tLin = (levels === 1) ? 0 : li / (levels - 1)
        const t    = Math.pow(tLin, levelCurve)

        const y       = t * coneHeight
        const rRing   = THREE.MathUtils.lerp(coneRadius, 0, t)
        const pSize   = THREE.MathUtils.lerp(planeSizeBase, planeSizeBase * planeSizeFalloff, t)
        const nThis   = Math.max(3, Math.round(THREE.MathUtils.lerp(perLevelBottom, perLevelTop, t)))
        const phiBase = ringAngleOffset(li)

        for (let pi = 0; pi < nThis; pi++) {
            const phi = phiBase + (pi / nThis) * Math.PI * 2

            const rr = Math.max(0.0001, rRing + rRing * randomJitter * (Math.random() - 0.5))
            const yy = y + coneHeight * randomJitter * 0.15 * (Math.random() - 0.5)
            const x = rr * Math.cos(phi)
            const z = rr * Math.sin(phi)

            const rHat = new THREE.Vector3(x, 0, z).normalize()
            const ex   = new THREE.Vector3().crossVectors(axisY, rHat).normalize()
            const theta = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(tiltAxisBottomDeg, tiltAxisTopDeg, t))
            const ey = new THREE.Vector3().copy(rHat).multiplyScalar(Math.sin(theta))
                .addScaledVector(axisY, -Math.cos(theta)).normalize()
            const ez = new THREE.Vector3().crossVectors(ex, ey).normalize()
            const basis = new THREE.Matrix4().makeBasis(ex, ey, ez)

            const g = new THREE.PlaneGeometry(pSize, pSize, 1, 1)
            g.applyMatrix4(basis)
            g.rotateZ((Math.random() - 0.5) * Math.PI * 0.5)
            g.translate(x, yy, z)
            g.computeVertexNormals()

            // Vertexfarben (Varianz)
            const vCount = g.attributes.position.count
            const colors = new Float32Array(vCount * 3)
            const baseHSL = { h: 0, s: 0, l: 0 }
            baseLin.getHSL(baseHSL)
            const rMaxAtY = Math.max(1e-6, rRing)
            const skyTint = 0.06, tipWarm = 0.03

            for (let vi = 0; vi < vCount; vi++) {
                const px = g.attributes.position.getX(vi)
                const py = g.attributes.position.getY(vi)
                const pz = g.attributes.position.getZ(vi)

                const h  = THREE.MathUtils.clamp(py / coneHeight, 0, 1)
                const rN = THREE.MathUtils.clamp(Math.hypot(px, pz) / rMaxAtY, 0, 1)

                const ao       = 0.55 + 0.35 * rN + 0.10 * h
                const hueShift = tipWarm * rN - skyTint * h
                const hOut     = THREE.MathUtils.clamp(baseHSL.h + hueShift, 0, 1)
                const sOut     = THREE.MathUtils.clamp(baseHSL.s + 0.25 * (rN - 0.5) - 0.08 * h, 0, 1)
                const lOut     = THREE.MathUtils.clamp(baseHSL.l * ao + (Math.random() - 0.5) * 0.02, 0, 1)

                const col = new THREE.Color().setHSL(
                    THREE.MathUtils.clamp(hOut + (Math.random() - 0.5) * 0.006, 0, 1),
                    THREE.MathUtils.clamp(sOut + (Math.random() - 0.5) * 0.03, 0, 1),
                    lOut
                )
                const off = vi * 3
                colors[off + 0] = col.r
                colors[off + 1] = col.g
                colors[off + 2] = col.b
            }
            g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
            geos.push(g)
        }
    }

    const geometry = mergeGeometries(geos, false)
    geometry.computeBoundingSphere()
    geometry.computeBoundingBox()

    // Material mit Defaults; Runtime-Tuning via InstancedTrees (Leva)
    const material = createTreeLeafMaterialSDF({
        sdfUrl,
        screenNoiseUrl,
        baseLin
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
}
