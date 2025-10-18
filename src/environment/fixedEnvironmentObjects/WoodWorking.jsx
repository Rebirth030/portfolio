import PreparedStaticModel from "../../app/PrepareStaticModel.jsx";
import Zone from "../../app/Zone.jsx";
import {StationId} from "../../app/constants/stations.js";

export default function WoodWorking() {
    const id = StationId.WORKSHOP

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
        <Zone id={id}/>
    </>
}