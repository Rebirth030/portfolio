import {InstancedFromRefs} from "../../app/InstancedFromRefs.jsx";

export default function Stones() {
    return<>
        <InstancedFromRefs
            modelUrl="/Models.glb"
            modelFilter={(o) => o.name.startsWith('Stone_1')}
            refsUrl="/Instances.glb"
            filter={(o) => o.isMesh && o.name.startsWith('Stone1Instance')}
            receiveShadow
            position={[0, -20, 0]}
            physics
        />
        <InstancedFromRefs
            modelUrl="/Models.glb"
            modelFilter={(o) => o.name.startsWith('Stone_2')}
            refsUrl="/Instances.glb"
            filter={(o) => o.isMesh && o.name.startsWith('Stone2Instance')}
            receiveShadow
            position={[0, -20, 0]}
            physics
        />
    </>
}