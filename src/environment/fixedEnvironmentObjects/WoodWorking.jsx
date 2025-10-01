import PreparedStaticModel from "../../app/PrepareStaticModel.jsx";

export default function WoodWorking() {
    return<>
        <PreparedStaticModel
            modelUrl="Models.glb"
            nodeName="WoodWorking"
            position={[0, -20, 0]}
            // Schatten/Material-Regeln
            castShadow
            receiveShadow
            // Physik
            colliders="cuboid"
            type="fixed"
            friction={1.5}
            restitution={0}
        />
    </>
}