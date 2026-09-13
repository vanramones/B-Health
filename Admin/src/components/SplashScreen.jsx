import React, { useEffect, useState, useRef, useCallback } from 'react';
import { HeartPulse, Plus, ClipboardList, CalendarCheck, Bell, ArrowRight } from 'lucide-react';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  /* ── Root overlay ── */
  .sp-root {
    position: fixed; inset: 0; z-index: 9999;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    overflow: hidden;
    transition: opacity 0.55s ease, transform 0.55s ease;
    user-select: none; -webkit-user-select: none;
    touch-action: pan-y;
  }
  .sp-root.sp-hide {
    opacity: 0; transform: scale(1.04); pointer-events: none;
  }

  /* ── Slide track ── */
  .sp-track {
    display: flex;
    width: 200%;
    height: 100%;
    transition: transform 0.42s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: transform;
  }
  .sp-track.sp-no-transition { transition: none; }

  /* ── Each slide ── */
  .sp-slide {
    width: 50%;
    height: 100%;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    position: relative; overflow: hidden;
  }

  /* Slide 1 – deep green */
  .sp-slide-1 {
    background: linear-gradient(160deg, #1e3a8a 0%, #1e40af 30%, #1d4ed8 65%, #2563eb 100%);
  }
  /* Slide 2 – emerald teal */
  .sp-slide-2 {
    background: linear-gradient(160deg, #1e40af 0%, #1d4ed8 50%, #2563eb 100%);
  }

  /* ── Decorative orbs (shared) ── */
  .sp-orb {
    position: absolute; border-radius: 50%; pointer-events: none;
  }
  .sp-orb-a {
    top: -130px; right: -130px; width: 380px; height: 380px;
    background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 65%);
    animation: sp-drift1 9s ease-in-out infinite;
  }
  .sp-orb-b {
    bottom: -90px; left: -90px; width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 65%);
    animation: sp-drift2 11s ease-in-out infinite;
  }
  .sp-orb-c {
    top: 40%; left: -50px; width: 180px; height: 180px;
    background: radial-gradient(circle, rgba(96,165,250,0.08) 0%, transparent 65%);
    animation: sp-drift1 14s ease-in-out infinite reverse;
  }

  @keyframes sp-drift1 {
    0%,100% { transform: translate(0,0) scale(1); }
    50%     { transform: translate(18px,-18px) scale(1.06); }
  }
  @keyframes sp-drift2 {
    0%,100% { transform: translate(0,0) scale(1); }
    50%     { transform: translate(-16px,14px) scale(1.08); }
  }

  /* ── Slide 1: Logo ── */
  .sp-icon-wrap {
    position: relative; z-index: 1;
    width: 110px; height: 110px; border-radius: 30px;
    background: rgba(255,255,255,0.15);
    border: 2px solid rgba(255,255,255,0.26);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(20px);
    box-shadow: 0 16px 48px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.2);
    animation: sp-pop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.15s both;
  }
  @keyframes sp-pop {
    from { opacity:0; transform: scale(0.5) rotate(-8deg); }
    to   { opacity:1; transform: scale(1) rotate(0deg); }
  }
  .sp-pulse-ring {
    position: absolute; border-radius: 36px;
    border: 2px solid rgba(255,255,255,0.18);
    animation: sp-pulse-anim 2.4s ease-out 0.9s infinite;
  }
  .sp-pulse-ring.r1 { inset: -10px; }
  .sp-pulse-ring.r2 { inset: -22px; border-radius: 42px; border-width: 1.5px; border-color: rgba(255,255,255,0.1); animation-delay: 1.3s; }
  @keyframes sp-pulse-anim {
    0%   { opacity: 0.7; transform: scale(1); }
    100% { opacity: 0;   transform: scale(1.2); }
  }
  .sp-badge {
    position: absolute; bottom: -9px; right: -9px;
    width: 30px; height: 30px; border-radius: 50%;
    background: #ef4444; border: 3px solid #1d4ed8;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(239,68,68,0.45);
    animation: sp-badge-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) 0.55s both;
    z-index: 2;
  }
  @keyframes sp-badge-pop {
    from { opacity:0; transform: scale(0) rotate(-45deg); }
    to   { opacity:1; transform: scale(1) rotate(0); }
  }

  .sp-s1-brand {
    margin-top: 30px; text-align: center; z-index: 1;
    animation: sp-rise 0.6s ease 0.45s both;
  }
  .sp-s1-name {
    font-size: 40px; font-weight: 900; color: #fff;
    letter-spacing: -0.05em; line-height: 1;
    text-shadow: 0 2px 20px rgba(0,0,0,0.15);
  }
  .sp-s1-sub {
    font-size: 12px; font-weight: 500; color: rgba(147,197,253,0.85);
    letter-spacing: 0.1em; text-transform: uppercase; margin-top: 8px;
    padding: 0 16px;
  }

  /* Bouncing dots (slide 1 only) */
  .sp-bounce-dots {
    display: flex; gap: 8px; align-items: center; margin-top: 40px; z-index: 1;
    animation: sp-rise 0.5s ease 1s both;
  }
  .sp-bdot {
    width: 7px; height: 7px; border-radius: 50%;
    background: rgba(255,255,255,0.4);
    animation: sp-bdot-anim 1.3s ease-in-out infinite;
  }
  .sp-bdot:nth-child(1){ animation-delay: 0s; }
  .sp-bdot:nth-child(2){ animation-delay: 0.18s; }
  .sp-bdot:nth-child(3){ animation-delay: 0.36s; }
  @keyframes sp-bdot-anim {
    0%,80%,100% { transform: translateY(0);   background: rgba(255,255,255,0.35); }
    40%         { transform: translateY(-9px); background: rgba(255,255,255,0.9);  }
  }

  /* ── Slide 2: Features ── */
  .sp-s2-content {
    display: flex; flex-direction: column; align-items: center;
    text-align: center; padding: 0 28px; z-index: 1; width: 100%; max-width: 360px;
    animation: sp-rise 0.5s ease 0.1s both;
  }
  .sp-s2-icon-big {
    width: 90px; height: 90px; border-radius: 24px;
    background: rgba(255,255,255,0.18);
    border: 2px solid rgba(255,255,255,0.28);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(16px);
    box-shadow: 0 12px 36px rgba(0,0,0,0.18);
    margin-bottom: 24px;
    animation: sp-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both;
  }
  .sp-s2-title {
    font-size: 26px; font-weight: 900; color: #fff;
    letter-spacing: -0.04em; line-height: 1.2; margin-bottom: 12px;
  }
  .sp-s2-title em { font-style: normal; color: #93c5fd; }
  .sp-s2-desc {
    font-size: 14px; color: rgba(147,197,253,0.82);
    line-height: 1.7; margin-bottom: 32px;
  }

  .sp-features {
    display: flex; gap: 12px; justify-content: center;
    flex-wrap: wrap; margin-bottom: 36px; width: 100%;
  }
  .sp-feat {
    display: flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 10px; padding: 10px 14px;
    flex: 1; min-width: 90px;
  }
  .sp-feat span {
    font-size: 12px; font-weight: 600; color: #fff; white-space: nowrap;
  }

  .sp-get-started {
    width: 100%; padding: 15px 24px;
    border: none; border-radius: 14px; cursor: pointer;
    font-family: inherit; font-size: 16px; font-weight: 700;
    color: #1d4ed8; background: #fff;
    box-shadow: 0 6px 20px rgba(0,0,0,0.18);
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: transform 0.15s, box-shadow 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .sp-get-started:hover  { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(0,0,0,0.24); }
  .sp-get-started:active { transform: translateY(0); }

  /* ── Bottom dot indicators ── */
  .sp-indicators {
    position: absolute;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 28px);
    left: 0; right: 0;
    display: flex; justify-content: center; gap: 8px; z-index: 10;
  }
  .sp-ind {
    height: 7px; border-radius: 4px;
    background: rgba(255,255,255,0.35);
    transition: width 0.35s ease, background 0.35s ease;
  }
  .sp-ind.active { width: 22px; background: #fff; }
  .sp-ind.inactive { width: 7px; }

  /* ── Shared animation ── */
  @keyframes sp-rise {
    from { opacity:0; transform: translateY(20px); }
    to   { opacity:1; transform: translateY(0); }
  }
`;

const TOTAL = 2;

const SplashScreen = ({ onFinish }) => {
  const [slide, setSlide]       = useState(0);
  const [hiding, setHiding]     = useState(false);
  const [noTrans, setNoTrans]   = useState(false);
  const touchStartX             = useRef(null);
  const dragX                   = useRef(0);
  const autoTimer               = useRef(null);

  const goTo = useCallback((idx) => {
    setSlide(Math.max(0, Math.min(TOTAL - 1, idx)));
  }, []);

  const finish = useCallback(() => {
    setHiding(true);
    setTimeout(onFinish, 560);
  }, [onFinish]);

  /* Auto-advance slide 1 → 2 after 2.8 s if user hasn't swiped */
  useEffect(() => {
    if (slide === 0) {
      autoTimer.current = setTimeout(() => goTo(1), 2800);
    }
    return () => clearTimeout(autoTimer.current);
  }, [slide, goTo]);

  /* Touch / mouse swipe handlers */
  const onTouchStart = (e) => {
    touchStartX.current = e.touches ? e.touches[0].clientX : e.clientX;
    clearTimeout(autoTimer.current);
  };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    dragX.current = endX - touchStartX.current;
    touchStartX.current = null;
    if (dragX.current < -40 && slide < TOTAL - 1) goTo(slide + 1);
    else if (dragX.current > 40 && slide > 0)     goTo(slide - 1);
  };

  const translateX = `translateX(-${slide * 50}%)`;

  return (
    <>
      <style>{styles}</style>
      <div
        className={`sp-root${hiding ? ' sp-hide' : ''}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onTouchStart}
        onMouseUp={onTouchEnd}
      >
        {/* Slide track */}
        <div
          className={`sp-track${noTrans ? ' sp-no-transition' : ''}`}
          style={{ transform: translateX }}
        >

          {/* ══ Slide 1: Branding ══ */}
          <div className="sp-slide sp-slide-1">
            <div className="sp-orb sp-orb-a" />
            <div className="sp-orb sp-orb-b" />
            <div className="sp-orb sp-orb-c" />

            <div className="sp-icon-wrap">
              <div className="sp-pulse-ring r1" />
              <div className="sp-pulse-ring r2" />
              <HeartPulse size={54} color="#fff" strokeWidth={1.6} />
              <div className="sp-badge">
                <Plus size={14} color="#fff" strokeWidth={3} />
              </div>
            </div>

            <div className="sp-s1-brand">
              <div className="sp-s1-name">B-Health</div>
              <div className="sp-s1-sub">Barangay Health Center Digital System</div>
            </div>

            <div className="sp-bounce-dots">
              <div className="sp-bdot" />
              <div className="sp-bdot" />
              <div className="sp-bdot" />
            </div>
          </div>

          {/* ══ Slide 2: Features ══ */}
          <div className="sp-slide sp-slide-2">
            <div className="sp-orb sp-orb-a" style={{ top: -100, right: -100 }} />
            <div className="sp-orb sp-orb-b" />

            <div className="sp-s2-content">
              <div className="sp-s2-icon-big">
                <HeartPulse size={44} color="#fff" strokeWidth={1.6} />
              </div>

              <div className="sp-s2-title">
                Your Health,<br />Our <em>Priority</em>.
              </div>
              <div className="sp-s2-desc">
                Access your health records, book appointments, and stay updated
                with community health services — anytime, anywhere.
              </div>

              <div className="sp-features">
                <div className="sp-feat">
                  <ClipboardList size={16} color="#93c5fd" />
                  <span>Records</span>
                </div>
                <div className="sp-feat">
                  <CalendarCheck size={16} color="#93c5fd" />
                  <span>Appointments</span>
                </div>
                <div className="sp-feat">
                  <Bell size={16} color="#93c5fd" />
                  <span>Alerts</span>
                </div>
              </div>

              <button className="sp-get-started" onClick={finish}>
                Get Started <ArrowRight size={18} />
              </button>
            </div>
          </div>

        </div>{/* end track */}

        {/* Dot indicators */}
        <div className="sp-indicators">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div
              key={i}
              className={`sp-ind ${i === slide ? 'active' : 'inactive'}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

      </div>
    </>
  );
};

export default SplashScreen;
