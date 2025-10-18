// app/constants/stations.js

export const StationId = Object.freeze({
    MARKET: 'market',
    WORKSHOP: 'workshop',
    // weitere Stationen hier ergänzen …
})

const ZONES = {
    [StationId.WORKSHOP]:   {
        position: [-67, 0.5, 25.5],
        radius: 2.0,
        height: 0.5,
        depth: 3.5,
    },
    [StationId.MARKET]: {
        position: [-71.5, 0.5, 25.5],
        radius: 1.5,
        height: 0.5,
        depth: 3.5,
    },
}


const FOCUS_POSES = {
    [StationId.WORKSHOP]:   { position: [-72, 7, 25.5], target: [  -65, -0,   25.5] },
    [StationId.MARKET]: { position: [-67, 4, 23.5], target: [  -73.5, -0,   23.85] },
}


export function getZone(id) {
    return ZONES[id] ?? null
}

export function getFocusPose(id) {
    return FOCUS_POSES[id] ?? null
}


export function getStationData(id) {
    const zone = getZone(id)
    const focusPose = getFocusPose(id)
    if (!zone || !focusPose) {
        console.error("Could not find zone id")
    }
    return { id, zone, focusPose }
}
