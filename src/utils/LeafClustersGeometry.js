// src/factories/LeafClusterFactory.js
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Erzeugt ein zusammengefasstes Blatt-Cluster aus Planes (BushFactory-Logik).
 * Rückgabe: THREE.BufferGeometry mit Vertexfarben.
 */
export function createLeafClusterGeometry({
                                              baseLin,                // THREE.Color (linear)
                                              count = 100,
                                              radius = 0.6,
                                              planeSize = 0.6,
                                              tilt = 0.35
                                          } = {}) {
    const tmpQ = new THREE.Quaternion()
    const zAxis = new THREE.Vector3(0, 0, 1)
    const pos = new THREE.Vector3()
    const dir = new THREE.Vector3()
    const tmp = new THREE.Vector3()
    const color = new THREE.Color()

    const geos = []

    const baseHSL = { h: 0, s: 0, l: 0 }
    baseLin.getHSL(baseHSL)

    for (let i = 0; i < count; i++) {
        const g = new THREE.PlaneGeometry(planeSize, planeSize, 1, 1)

        // Position random auf Kugel
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

        // Vertex-Farben (leichte Varianz)
        const vCount = g.attributes.position.count
        const colors = new Float32Array(vCount * 3)

        for (let vi = 0; vi < vCount; vi++) {
            tmp.set(
                g.attributes.position.getX(vi),
                g.attributes.position.getY(vi),
                g.attributes.position.getZ(vi)
            )
            const d = Math.min(1, tmp.length() / (radius + planeSize))

            const h = baseHSL.h + (Math.random() - 0.5) * 0.015
            const s = THREE.MathUtils.clamp(baseHSL.s - 0.06 * d + (Math.random() - 0.5) * 0.03, 0, 1)
            const l = THREE.MathUtils.clamp(baseHSL.l + 0.08 * d + (Math.random() - 0.5) * 0.015, 0, 1)
            color.setHSL(h, s, l)

            const off = vi * 3
            colors[off] = color.r
            colors[off + 1] = color.g
            colors[off + 2] = color.b
        }
        g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        geos.push(g)
    }

    const geometry = mergeGeometries(geos, false)
    geometry.computeBoundingSphere()
    geometry.computeBoundingBox()

    return geometry
}
