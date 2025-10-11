// environment/fixedEnvironmentObjects/MarketStall.jsx
import Zone from '../../app/Zone.jsx'
import PreparedStaticModel from "../../app/PrepareStaticModel.jsx";


// ✅ Stabile Konstanten (keine neuen Referenzen pro Render)
const MARKET_ZONE = {
    type: 'cylinder',
    position: [-67, 0.5, 25.5],
    radius: 2.0,
    height: 0.5,
    depth: 3.5,
}

const MARKET_FOCUS = {
    position: [-4, -14, -5],
    target:   [0,  -17.5, 0],
}

export default function MarketStall() {
    const id = 'market'

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

            <Zone id={id} zone={MARKET_ZONE} focusPose={MARKET_FOCUS} />
        </>
    )
}
