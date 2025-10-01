import PreparedStaticModel from "../../app/PrepareStaticModel.jsx";

export default function WoodenChest() {
    return<>
        <PreparedStaticModel
            modelUrl="Models.glb"
            nodeName="HolzKiste"
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
            nodeName="HolzKiste001"
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
            nodeName="HolzKiste002"
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
            nodeName="HolzKiste003"
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
            nodeName="HolzKiste004"
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
            nodeName="HolzKiste005"
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