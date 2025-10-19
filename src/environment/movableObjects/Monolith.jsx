import PreparedStaticModel from "../../app/PrepareStaticModel.jsx";

export default function Monolith() {
    return<>
        <PreparedStaticModel
            modelUrl="Models.glb"
            nodeName="Monolith"
            position={[0, -20, 0]}
            // Schatten/Material-Regeln
            castShadow
            // Physik
            colliders="cuboid"
            type="fixed"
            friction={1.5}
            restitution={0}
        />
    </>
}