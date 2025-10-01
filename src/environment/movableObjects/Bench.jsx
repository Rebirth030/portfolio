import PreparedStaticModel from "../../app/PrepareStaticModel.jsx";

export default function Bench() {
    return<>
        <PreparedStaticModel
            modelUrl="Models.glb"
            nodeName="Bench"
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