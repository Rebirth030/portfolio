import {InstancedFromRefs} from "../../app/InstancedFromRefs.jsx";
import PreparedStaticModel from "../../app/PrepareStaticModel.jsx";

export default function LanternStand() {
    return (
        <>
            <PreparedStaticModel
                modelUrl="Models.glb"
                nodeName="LanternStand"
                position={[0, -20, 0]}
                // Schatten/Material-Regeln
                castShadow
                // Physik
                colliders="cuboid"
                type="dynamic"
                friction={1.5}
                restitution={0}
            />
            <PreparedStaticModel
                modelUrl="Models.glb"
                nodeName="LanternStand001"
                position={[0, -20, 0]}
                // Schatten/Material-Regeln
                castShadow
                // Physik
                colliders="cuboid"
                type="dynamic"
                friction={1.5}
                restitution={0}
            />
            <PreparedStaticModel
                modelUrl="Models.glb"
                nodeName="LanternStand002"
                position={[0, -20, 0]}
                // Schatten/Material-Regeln
                castShadow
                // Physik
                colliders="cuboid"
                type="dynamic"
                friction={1.5}
                restitution={0}
            />
            <PreparedStaticModel
                modelUrl="Models.glb"
                nodeName="LanternStand003"
                position={[0, -20, 0]}
                // Schatten/Material-Regeln
                castShadow
                // Physik
                colliders="cuboid"
                type="dynamic"
                friction={1.5}
                restitution={0}
            />
            <PreparedStaticModel
                modelUrl="Models.glb"
                nodeName="LanternStand004"
                position={[0, -20, 0]}
                // Schatten/Material-Regeln
                castShadow
                // Physik
                colliders="cuboid"
                type="dynamic"
                friction={1.5}
                restitution={0}
            />
        </>
    )
}