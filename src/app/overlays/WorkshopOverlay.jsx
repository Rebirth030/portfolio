// app/ui/overlays/WorkshopOverlay.jsx
import React from 'react'
import { useGameStore } from '../../hooks/useGame.js'
import {StationId} from "../constants/stations.js";

export default function WorkshopOverlay({ onClose }) {
    const stationId = StationId.WORKSHOP
    const endInteraction = useGameStore((s) => s.endInteraction)

    return (
        <div className="ov-modal" data-station={stationId}>
            <header className="ov-header">
                <h2 className="ov-title">Werkstatt – Aufgaben & Fortschritt</h2>
                <button className="ov-close" onClick={onClose} aria-label="Overlay schließen">×</button>
            </header>

            <div className="ov-body">
                <p>
                    Hier könnten Sie z. B. Bauaufträge, Fortschrittsbalken, Checklisten oder Videos einbinden.
                </p>

                <ul style={{ margin: 0, paddingLeft: 18 }}>
                    <li>Projekt A – 75 % abgeschlossen</li>
                    <li>Projekt B – wartet auf Material</li>
                    <li>Projekt C – QC erforderlich</li>
                </ul>
            </div>

            <div className="ov-actions">
                <button className="ov-btn" onClick={() => endInteraction()}>Zurück</button>
            </div>
        </div>
    )
}
