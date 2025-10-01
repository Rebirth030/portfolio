import PreparedStaticModel from "../../app/PrepareStaticModel.jsx";

export default function RuneStones() {
    return<>
        <PreparedStaticModel
            modelUrl="Models.glb"
            nodeName="RuneStone_1"
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
            nodeName="RuneStone_2"
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
            nodeName="RuneStone_3"
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