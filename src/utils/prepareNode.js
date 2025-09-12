// src/utils/prepareNode.js
import buildNodeMaterialFromExisting from './buildNodeMaterialFromExisting.js'

/**
 * Bereitet einen bereits geklonten Object3D-Teilbaum vor:
 * - setzt Schattenflags
 * - konvertiert Materialien zu Node-Material (inkl. Transmission)
 * - respektiert optionale userData-Flags
 * - nimmt transmissiven/transparenten Submeshes optional den Schattenwurf
 */
export default function prepareNode(root, {
    castShadowDefault = true,
    receiveShadowDefault = true,
    materialMapper = buildNodeMaterialFromExisting,
    respectUserData = true,
    transmissiveCastsShadow = false,   // false => transmissive/transparent wirft KEINEN Schatten
    transparentCastsShadow  = false    // false => transparent wirft KEINEN Schatten
} = {}) {
    if (!root) return root

    root.traverse((o) => {
        if (!o.isMesh) return

        // Schattenflags (mit userData-Override)
        let castShadow   = castShadowDefault
        let receiveShadow= receiveShadowDefault

        if (respectUserData && o.userData) {
            if (o.userData.noCastShadow === true)    castShadow = false
            if (o.userData.noReceiveShadow === true) receiveShadow = false
        }

        // Material(e) konvertieren
        if (Array.isArray(o.material)) {
            o.material = o.material.map((m) => materialMapper(m) ?? m)
        } else if (o.material) {
            o.material = materialMapper(o.material) ?? o.material
        }

        // transmissive/transparent → optional Schattenwurf deaktivieren (nur Submesh!)
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        const hasTransmissive = mats.some(m => m && m.transmission > 0.001)
        const hasTransparent  = mats.some(m => m && (m.transparent === true || (m.opacity !== undefined && m.opacity < 1.0)))

        if (!transmissiveCastsShadow && hasTransmissive) castShadow = false
        if (!transparentCastsShadow  && hasTransparent)  castShadow = false

        o.castShadow = castShadow
        o.receiveShadow = receiveShadow

        // Sicherheits-Update
        mats.forEach((m) => { if (m) m.needsUpdate = true })
    })

    return root
}
