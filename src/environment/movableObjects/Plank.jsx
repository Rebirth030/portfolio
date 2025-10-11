import PreparedStaticModel from "../../app/PrepareStaticModel.jsx";

export function Plank() {
    return <>
        <PreparedStaticModel
            modelUrl="Models.glb"
            nodeName="Plank"
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
            nodeName="Plank001"
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
            nodeName="Plank002"
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
            nodeName="Plank003"
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
}