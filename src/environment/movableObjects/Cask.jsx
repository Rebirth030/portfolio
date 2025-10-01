import PreparedStaticModel from "../../app/PrepareStaticModel.jsx";

export default function Cask() {
    return<>
        <PreparedStaticModel
            modelUrl="Models.glb"
            nodeName="Fass"
            position={[0, -20, 0]}
            // Schatten/Material-Regeln
            castShadow
            // Physik
            colliders="hull"
            type="dynamic"
            friction={1.5}
            restitution={0}
        />
        <PreparedStaticModel
            modelUrl="Models.glb"
            nodeName="Fass001"
            position={[0, -20, 0]}
            // Schatten/Material-Regeln
            castShadow
            // Physik
            colliders="hull"
            type="dynamic"
            friction={1.5}
            restitution={0}
        />
        <PreparedStaticModel
            modelUrl="Models.glb"
            nodeName="Fass002"
            position={[0, -20, 0]}
            // Schatten/Material-Regeln
            castShadow
            // Physik
            colliders="hull"
            type="dynamic"
            friction={1.5}
            restitution={0}
        />
        <PreparedStaticModel
            modelUrl="Models.glb"
            nodeName="Fass003"
            position={[0, -20, 0]}
            // Schatten/Material-Regeln
            castShadow
            // Physik
            colliders="hull"
            type="dynamic"
            friction={1.5}
            restitution={0}
        />
    </>
}