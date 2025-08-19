// BushFactory.js
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {baseLinearColor, createLeafMaterial, loadAlphaMap} from "../../utils/foliageUtils.js";


export default function createBushMesh({
                                           color = '#61803e',
                                           count = 100,
                                           radius = 0.6,
                                           planeSize = 0.6,
                                           tilt = 0.35,
                                           backlight = 0.18,
                                           sunDir = new THREE.Vector3(-0.35, 1.0, 0.2).normalize(),
                                           alphaUrl = '/bushLeaves.png'
                                       } = {}) {
    const alphaMap = loadAlphaMap(alphaUrl)
    const baseLin = baseLinearColor(color)

    const tmpQ = new THREE.Quaternion()
    const zAxis = new THREE.Vector3(0, 0, 1)
    const pos = new THREE.Vector3()
    const dir = new THREE.Vector3()
    const geos = []

    for (let i = 0; i < count; i++) {
        const g = new THREE.PlaneGeometry(planeSize, planeSize, 1, 1)

        // Position auf Kugel
        const r = radius * Math.pow(Math.random(), 0.35)
        const u = Math.random(), v = Math.random()
        const theta = Math.acos(1 - 2 * u), phi = 2 * Math.PI * v
        pos.setFromSphericalCoords(r, theta, phi)

        // Ausrichten & platzieren
        dir.copy(pos).normalize()
        tmpQ.setFromUnitVectors(zAxis, dir)
        g.applyQuaternion(tmpQ)
        g.rotateZ((Math.random() - 0.5) * Math.PI * 2)
        g.rotateY((Math.random() - 0.5) * tilt)
        g.translate(pos.x, pos.y, pos.z)
        g.computeVertexNormals()

        // Vertex-Farben (leichte Varianz um Basisfarbe)
        const vCount = g.attributes.position.count
        const colors = new Float32Array(vCount * 3)
        const baseHSL = { h: 0, s: 0, l: 0 }
        baseLin.getHSL(baseHSL)

        for (let vi = 0; vi < vCount; vi++) {
            const px = g.attributes.position.getX(vi)
            const py = g.attributes.position.getY(vi)
            const pz = g.attributes.position.getZ(vi)
            const d = Math.min(1, new THREE.Vector3(px, py, pz).length() / (radius + planeSize))

            const h = baseHSL.h + (Math.random() - 0.5) * 0.015
            const s = THREE.MathUtils.clamp(baseHSL.s - 0.06 * d + (Math.random() - 0.5) * 0.03, 0, 1)
            const l = THREE.MathUtils.clamp(baseHSL.l + 0.08 * d + (Math.random() - 0.5) * 0.015, 0, 1)
            const c = new THREE.Color().setHSL(h, s, l)
            colors[vi * 3 + 0] = c.r
            colors[vi * 3 + 1] = c.g
            colors[vi * 3 + 2] = c.b
        }
        g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        geos.push(g)
    }

    const geometry = mergeGeometries(geos, false)
    geometry.computeBoundingSphere()
    geometry.computeBoundingBox()

    const material = createLeafMaterial({ alphaMap, baseLin, backlight, sunDir })
    return new THREE.Mesh(geometry, material)
}
