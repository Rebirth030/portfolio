import {create} from "zustand";

export default create(() => {
    return {
        phase: 'ready',

        start: () => {
            if (state.phase === 'ready')
                this.setState({phase: 'running'})
        },
        reload: () => {
            if (state.phase === 'running' || state.phase === 'ended')
                this.setState({phase: 'ready'})
        },
        final : () => {
            if (state.phase === 'running')
                this.setState({phase: 'ended'})
        }
    }
})