// environment/fixedEnvironmentObjects/MarketStall.jsx
import Zone from '../../app/Zone.jsx'
import PreparedStaticModel from "../../app/PrepareStaticModel.jsx";
import {StationId} from "../../app/constants/stations.js";

export default function MarketStall() {
    const id = StationId.MARKET

    return (
        <>
            <PreparedStaticModel
                modelUrl="Models.glb"
                nodeName="MarketStall"
                position={[0, -20, 0]}
                castShadow
                receiveShadow
                colliders="cuboid"
                type="fixed"
                friction={1.5}
                restitution={0}
            />

            <Zone id={id}/>
        </>
    )
}
