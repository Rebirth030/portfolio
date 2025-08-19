// createSpruceTopMesh.js
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { loadAlphaMap, baseLinearColor, createLeafMaterial, ringAngleOffset } from '../../utils/foliageUtils.js'

export function createSpruceTopMesh(opts = {}) {
    const {
        color = '#3b6f2a',
        coneRadius = 1,
        coneHeight = 5,
        levels = 15,
        perLevelBottom = 8,
        perLevelTop = 3,
        levelCurve = 1.5,
        planeSizeBase = 1.5,
        planeSizeFalloff = 0.65,
        // Neigung zur Achse (unten → oben)
        tiltAxisBottomDeg = 55,
        tiltAxisTopDeg = 25,
        randomJitter = 0.08,
        backlight = 0.16,
        alphaUrl = '/spruceLeaves.png'
    } = opts

    const alphaMap = loadAlphaMap(alphaUrl)
    const baseLin  = baseLinearColor(color)

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

            // Position mit leichtem Jitter
            const rr = Math.max(0.0001, rRing + rRing * randomJitter * (Math.random() - 0.5))
            const yy = y + coneHeight * randomJitter * 0.15 * (Math.random() - 0.5)
            const x = rr * Math.cos(phi)
            const z = rr * Math.sin(phi)

            // lokales Dreibein (ex/ey/ez)
            const rHat = new THREE.Vector3(x, 0, z).normalize()              // nach außen
            const ex   = new THREE.Vector3().crossVectors(axisY, rHat).normalize() // Tangente
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

            // realistischere Farben: innen dunkler, Spitzen wärmer; oben kühler
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

                const h = THREE.MathUtils.clamp(py / coneHeight, 0, 1)
                const rN = THREE.MathUtils.clamp(Math.hypot(px, pz) / rMaxAtY, 0, 1)

                const ao = 0.55 + 0.35 * rN + 0.10 * h
                const hueShift = tipWarm * rN - skyTint * h
                const hOut = THREE.MathUtils.clamp(baseHSL.h + hueShift, 0, 1)
                const sOut = THREE.MathUtils.clamp(baseHSL.s + 0.25 * (rN - 0.5) - 0.08 * h, 0, 1)
                const lOut = THREE.MathUtils.clamp(baseHSL.l * ao + (Math.random() - 0.5) * 0.02, 0, 1)

                const col = new THREE.Color().setHSL(
                    THREE.MathUtils.clamp(hOut + (Math.random() - 0.5) * 0.006, 0, 1),
                    THREE.MathUtils.clamp(sOut + (Math.random() - 0.5) * 0.03, 0, 1),
                    lOut
                )
                colors[vi * 3 + 0] = col.r
                colors[vi * 3 + 1] = col.g
                colors[vi * 3 + 2] = col.b
            }
            g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
            geos.push(g)
        }
    }

    const geometry = mergeGeometries(geos, false)
    geometry.computeBoundingSphere()
    geometry.computeBoundingBox()

    const material = createLeafMaterial({
        alphaMap,
        baseLin,
        backlight,
        // Fichte: reicht meist von oben; Sie können hier auch Ihre Sonnenrichtung setzen
        sunDir: new THREE.Vector3(0, 1, 0)
    })

    return new THREE.Mesh(geometry, material)
}
