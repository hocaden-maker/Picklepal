import { useState, useRef, useEffect } from 'react';

export default function CropModal({ file, aspect = 1, circular = false, title = 'Crop Photo', onDone, onCancel }) {
  const [imgSrc, setImgSrc] = useState('');
  const [initScale, setInitScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [zoom, setZoom] = useState(1);

  const imgRef = useRef(null);
  const ptrs = useRef(new Map());
  const panStart = useRef(null);
  const pinchStart = useRef(null);

  const FRAME_W = aspect >= 2 ? 310 : 262;
  const FRAME_H = Math.round(FRAME_W / aspect);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    setTx(0); setTy(0); setZoom(1);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setInitScale(Math.max(FRAME_W / img.naturalWidth, FRAME_H / img.naturalHeight));
    setTx(0); setTy(0); setZoom(1);
  };

  const clamp = (ntx, nty, nzoom, sc) => {
    const img = imgRef.current;
    if (!img) return { tx: ntx, ty: nty };
    const s = sc * nzoom;
    const hw = Math.max(0, (img.naturalWidth * s - FRAME_W) / 2);
    const hh = Math.max(0, (img.naturalHeight * s - FRAME_H) / 2);
    return { tx: Math.max(-hw, Math.min(hw, ntx)), ty: Math.max(-hh, Math.min(hh, nty)) };
  };

  const onPD = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 1) {
      panStart.current = { tx, ty, x: e.clientX, y: e.clientY };
      pinchStart.current = null;
    } else if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom, tx, ty };
      panStart.current = null;
    }
  };

  const onPM = (e) => {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 1 && panStart.current) {
      const c = clamp(panStart.current.tx + e.clientX - panStart.current.x, panStart.current.ty + e.clientY - panStart.current.y, zoom, initScale);
      setTx(c.tx); setTy(c.ty);
    } else if (ptrs.current.size === 2 && pinchStart.current) {
      const [a, b] = [...ptrs.current.values()];
      const nz = Math.max(1, Math.min(4, pinchStart.current.zoom * Math.hypot(a.x - b.x, a.y - b.y) / pinchStart.current.dist));
      const c = clamp(pinchStart.current.tx, pinchStart.current.ty, nz, initScale);
      setZoom(nz); setTx(c.tx); setTy(c.ty);
    }
  };

  const onPU = (e) => {
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size === 0) { panStart.current = null; pinchStart.current = null; }
    else if (ptrs.current.size === 1) {
      pinchStart.current = null;
      const [p] = [...ptrs.current.values()];
      panStart.current = { tx, ty, x: p.x, y: p.y };
    }
  };

  const doCrop = () => {
    const img = imgRef.current;
    if (!img) return;
    const OW = aspect >= 2 ? 1200 : 400;
    const OH = Math.round(OW / aspect);
    const canvas = document.createElement('canvas');
    canvas.width = OW; canvas.height = OH;
    const ctx = canvas.getContext('2d');
    const s = initScale * zoom;
    const sx = img.naturalWidth / 2 - tx / s - FRAME_W / (2 * s);
    const sy = img.naturalHeight / 2 - ty / s - FRAME_H / (2 * s);
    const sw = FRAME_W / s;
    const sh = FRAME_H / s;
    if (circular) {
      ctx.beginPath();
      ctx.arc(OW / 2, OH / 2, OW / 2, 0, Math.PI * 2);
      ctx.clip();
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OW, OH);
    canvas.toBlob(blob => onDone(blob), 'image/jpeg', 0.92);
  };

  const totalScale = initScale * zoom;
  const strips = [
    { top: 0, left: 0, right: 0, bottom: `calc(50% + ${FRAME_H / 2}px)` },
    { bottom: 0, left: 0, right: 0, top: `calc(50% + ${FRAME_H / 2}px)` },
    { top: `calc(50% - ${FRAME_H / 2}px)`, left: 0, right: `calc(50% + ${FRAME_W / 2}px)`, height: FRAME_H },
    { top: `calc(50% - ${FRAME_H / 2}px)`, left: `calc(50% + ${FRAME_W / 2}px)`, right: 0, height: FRAME_H },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: '#000', display: 'flex', flexDirection: 'column', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', paddingTop: 'calc(14px + env(safe-area-inset-top))' }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 15, cursor: 'pointer', padding: 0 }}>Cancel</button>
        <span style={{ flex: 1, textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>{title}</span>
        <button onClick={doCrop} style={{ background: 'none', border: 'none', color: '#FF5C35', fontSize: 15, fontWeight: 700, cursor: 'pointer', padding: 0 }}>Done</button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{ position: 'relative', width: '100%', maxWidth: 430, height: FRAME_H + 100, overflow: 'hidden', cursor: 'grab', touchAction: 'none' }}
          onPointerDown={onPD}
          onPointerMove={onPM}
          onPointerUp={onPU}
          onPointerCancel={onPU}
        >
          {imgSrc && (
            <img
              ref={imgRef}
              src={imgSrc}
              onLoad={onLoad}
              draggable={false}
              style={{
                position: 'absolute', left: '50%', top: '50%',
                transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${totalScale})`,
                transformOrigin: 'center', maxWidth: 'none', pointerEvents: 'none',
              }}
            />
          )}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {strips.map((st, i) => (
              <div key={i} style={{ position: 'absolute', background: 'rgba(0,0,0,0.58)', ...st }} />
            ))}
            <div style={{
              position: 'absolute',
              top: `calc(50% - ${FRAME_H / 2}px)`,
              left: `calc(50% - ${FRAME_W / 2}px)`,
              width: FRAME_W, height: FRAME_H,
              border: '2px solid rgba(255,255,255,0.85)',
              borderRadius: circular ? '50%' : 10,
              boxSizing: 'border-box',
            }} />
          </div>
        </div>
      </div>

      <p style={{ margin: 0, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 12, paddingBottom: 'calc(28px + env(safe-area-inset-bottom))' }}>
        Drag to reposition · Pinch to zoom
      </p>
    </div>
  );
}
