import {InstancedFromRefs} from "../../app/InstancedFromRefs.jsx";

export default function Sticks() {
    return<>
            <InstancedFromRefs
            modelUrl="/Models.glb"
            modelFilter={(o) => o.name.startsWith('Branch_1')}
            refsUrl="/Instances.glb"
            filter={(o) => o.isMesh && o.name.startsWith('Branch1Instance')}
            position={[0, -20, 0]}
            physics
            type={"dynamic"}
            colliders={"hull"}
            />
        <InstancedFromRefs
            modelUrl="/Models.glb"
            modelFilter={(o) => o.name.startsWith('Branch_2')}
            refsUrl="/Instances.glb"
            filter={(o) => o.isMesh && o.name.startsWith('Branch2Instance')}
            position={[0, -20, 0]}
            physics
            type={"dynamic"}
            colliders={"hull"}
            />
        </>
}