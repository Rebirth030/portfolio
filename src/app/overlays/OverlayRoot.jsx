// app/ui/OverlayRoot.jsx
import React, { Suspense, lazy, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {useGameStore} from "../../hooks/useGame.js";
import {StationId} from "../constants/stations.js";


const overlayRegistry = {
    [StationId.MARKET]:   lazy(() => import('./MarketOverlay.jsx')),
    [StationId.WORKSHOP]: lazy(() => import('./WorkshopOverlay.jsx')),
}

function FallbackOverlay({ id, onClose }) {
    return (
        <div className="ov-modal">
            <header className="ov-header">
                <h2 className="ov-title">Station: {id}</h2>
                <button className="ov-close" onClick={onClose} aria-label="Overlay schließen">×</button>
            </header>
            <div className="ov-body">
                <p>Kein spezifisches Overlay registriert. Bitte implementieren.</p>
            </div>
        </div>
    )
}

function OverlayRootImpl() {
    // stabile Selectors (keine Objektliterale zurückgeben)
    const overlayStationId = useGameStore((s) => s.overlayStationId)
    const endInteraction   = useGameStore((s) => s.endInteraction)

    const isOpen = overlayStationId != null
    const Comp = useMemo(
        () => (overlayStationId ? overlayRegistry[overlayStationId] : null),
        [overlayStationId]
    )

    if (!isOpen) return null
    const onClose = () => endInteraction()

    const node = (
        <>
            <style>{`
        .ov-root { position: fixed; inset: 0; display: grid; place-items: center; pointer-events: none; z-index: 40; }
        .ov-modal {
          pointer-events: auto;
          width: min(900px, 92vw);
          max-height: min(80vh, 900px);
          overflow: auto;
          border-radius: 16px;
          background: rgba(18,18,20,0.82);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          box-shadow: 0 10px 40px rgba(0,0,0,0.35);
          color: #fff; border: 1px solid rgba(255,255,255,0.12);
          transform: scale(0.985); opacity: 0; animation: ov-in 160ms ease-out forwards;
        }
        @keyframes ov-in { to { opacity: 1; transform: scale(1); } }
        .ov-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.08); position: sticky; top: 0; background: inherit; backdrop-filter: inherit; z-index: 1; }
        .ov-title { margin: 0; font-size: 1.15rem; letter-spacing: 0.3px; }
        .ov-close { border: none; background: transparent; color: #fff; font-size: 1.6rem; line-height: 1; cursor: pointer; opacity: 0.8; }
        .ov-close:hover { opacity: 1; }
        .ov-body { padding: 16px 18px 20px; }
        .ov-actions { display: flex; gap: 10px; padding: 14px 18px 18px; border-top: 1px solid rgba(255,255,255,0.08);
          position: sticky; bottom: 0; background: inherit; backdrop-filter: inherit; }
        .ov-btn { appearance: none; border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.06);
          color: #fff; padding: 10px 14px; border-radius: 12px; cursor: pointer; }
        .ov-btn:hover { background: rgba(255,255,255,0.1); }
        @media (prefers-reduced-motion: reduce) { .ov-modal { animation: none; opacity: 1; transform: none; } }
      `}</style>

            <div className="ov-root" role="dialog" aria-modal="true">
                <Suspense fallback={
                    <div className="ov-modal" aria-busy="true">
                        <header className="ov-header">
                            <h2 className="ov-title">Lade …</h2>
                            <button className="ov-close" onClick={onClose} aria-label="Overlay schließen">×</button>
                        </header>
                        <div className="ov-body"><p>Bitte einen Augenblick.</p></div>
                    </div>
                }>
                    {Comp
                        ? <Comp onClose={onClose} />
                        : <FallbackOverlay id={overlayStationId} onClose={onClose} />
                    }
                </Suspense>
            </div>
        </>
    )

    return createPortal(node, document.body)
}

const OverlayRoot = React.memo(OverlayRootImpl)
export default OverlayRoot
