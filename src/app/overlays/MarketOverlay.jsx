// app/ui/overlays/MarketOverlay.jsx
import React from 'react'
import { useGameStore } from '../../hooks/useGame.js'
import {StationId} from "../constants/stations.js";

export default function MarketOverlay({ onClose }) {
    const stationId = StationId.MARKET
    const endInteraction = useGameStore((s) => s.endInteraction)

    return (
        <div className="ov-modal" data-station={stationId}>
            <header className="ov-header">
                <h2 className="ov-title">Markt – Übersicht</h2>
                <button className="ov-close" onClick={onClose} aria-label="Overlay schließen">×</button>
            </header>

            <div className="ov-body">
                <p>
                    Willkommen am Marktstand. Hier könnten Sie Produktkarten, Preislisten oder
                    ein Mini-CMS rendern – vollständig in React (HTML/JSX).
                </p>

                <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <article key={i} style={{
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 12,
                            padding: 12,
                            background: 'rgba(255,255,255,0.04)'
                        }}>
                            <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem' }}>Artikel {i + 1}</h3>
                            <p style={{ margin: 0, opacity: 0.9 }}>Kurze Beschreibung des Artikels.</p>
                            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                                <button className="ov-btn">Details</button>
                                <button className="ov-btn">In den Korb</button>
                            </div>
                        </article>
                    ))}
                </section>
            </div>

            <div className="ov-actions">
                <button className="ov-btn" onClick={() => endInteraction()}>Schließen (ESC)</button>
                <button className="ov-btn" onClick={() => alert('Weiterführende Aktion')}>Aktion</button>
            </div>
        </div>
    )
}
