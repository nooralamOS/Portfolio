import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Stepper } from "pasito";
import "pasito/styles.css";
import BrandDistortion from "./components/BrandDistortion.jsx";

/* Frame 1's own bounding-box top-left in its 486-wide viewBox, scaled to the
   40px render width — the point that tracks the mouse. Frames 2-6's
   width/left/top (index.css) each offset from this same on-screen point. */
const CURSOR_HOTSPOT = { x: 7.918, y: 7.722 };
const CURSOR_FRAME_COUNT = 6;
const CURSOR_STEP_MS = 35;

function CustomCursor() {
  const wrapRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // min-width mirrors the site's mobile breakpoint so resizing the
    // window (no reload needed) also toggles this, not just real
    // touch/mouse capability — mobile must never show the DOM cursor.
    const query = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 769px)");
    const update = () => setEnabled(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add("custom-cursor-active");
    const el = wrapRef.current;
    const frameEls = el.querySelectorAll(".cursor__img");
    const pos = { x: -100, y: -100 };

    const isClickable = (node) => {
      if (!(node instanceof Element)) return false;
      const target = node.closest("a, button");
      return (
        target !== null &&
        !target.disabled &&
        target.getAttribute("aria-disabled") !== "true"
      );
    };

    // Steps through the 6 frames toward `target` instead of jumping straight
    // there, so entering/leaving pointer mode plays as a short morph.
    let step = 0;
    let target = 0;
    let stepTimer = null;
    let hoverState = false;
    let debounceTimer = null;

    const applyStep = (s) => {
      frameEls.forEach((frame, i) => {
        frame.style.opacity = i === s ? "1" : "0";
      });
      el.classList.toggle("is-hovering", s === CURSOR_FRAME_COUNT - 1);
    };
    applyStep(0);

    const tick = () => {
      step += step < target ? 1 : -1;
      applyStep(step);
      stepTimer = step === target ? null : setTimeout(tick, CURSOR_STEP_MS);
    };

    // Debounced so a fast mouse merely passing over another link/button on
    // its way elsewhere doesn't reverse the in-flight step sequence — that
    // instant-flip was what made the morph look like it was jiggling.
    const setTarget = (hovering) => {
      if (hovering === hoverState) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
        return;
      }
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        hoverState = hovering;
        target = hovering ? CURSOR_FRAME_COUNT - 1 : 0;
        if (!stepTimer) tick();
      }, 40);
    };

    // Re-checks what's under the pointer so the cursor reverts even when the
    // page changes beneath a stationary mouse (slides moving, buttons disabling)
    const refresh = () => {
      setTarget(isClickable(document.elementFromPoint(pos.x, pos.y)));
    };

    const onMove = (e) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      el.style.transform = `translate3d(${e.clientX - CURSOR_HOTSPOT.x}px, ${e.clientY - CURSOR_HOTSPOT.y}px, 0)`;
      el.classList.add("is-visible");
      refresh();
    };
    const onLeave = () => el.classList.remove("is-visible");

    const interval = setInterval(refresh, 120);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", refresh, { passive: true, capture: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      document.documentElement.classList.remove("custom-cursor-active");
      clearInterval(interval);
      if (stepTimer) clearTimeout(stepTimer);
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", refresh, { capture: true });
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="cursor" ref={wrapRef} aria-hidden="true">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <img
          key={n}
          className={`cursor__img cursor__img--f${n}`}
          src={`/icons/cursor-animation/${n}.svg`}
          alt=""
        />
      ))}
    </div>
  );
}

const VIDEO_BASE = "https://pub-ce8ca5d40e7f481f8b660ef1340d7170.r2.dev";
const r2Src = (filename) => `${VIDEO_BASE}/${encodeURIComponent(filename)}`;

const WORK_ITEMS = [
  { id: "hlm", title: "Humanity’s Last Machine", video: r2Src("HLM-compressed.mp4"), ratio: "3416 / 1712", link: "https://humanityslastmachine.com", zoom: true },
  { id: "wmzt", title: "World Model Deep-Dive", video: r2Src("wmzt-compressed.mp4"), ratio: "3360 / 1790", link: "mailto:noorunalam@gmail.com", requestAccess: true },
  { id: "mtc", title: "MTC", video: r2Src("MTC-compressed.mp4"), ratio: "1920 / 1080", link: "https://mtc.so" },
  { id: "pace", title: "Pace V3 Launch Video", video: r2Src("PACE-cpmpressed.mp4"), ratio: "3840 / 2160", link: "https://withpace.com/", zoom: true, sound: true },
  { id: "ziptero", title: "Ziptero (launching soon)", video: r2Src("Ziptero-compressed.mp4"), ratio: "3416 / 1682", pixelate: true, comingSoon: true },
];

const BRAND_SLIDES = [
  { id: "sim", type: "video", src: "/brand-identity/sim-changelog.mp4", label: "Sim changelog interface", ratio: "3420 / 1922" },
  { id: "hex", type: "image", src: "/brand-identity/hex-merch.png", label: "Hex Security type exploration", ratio: "2511 / 1866" },
  { id: "robo", type: "image", src: "/brand-identity/robostrategy.png", label: "RoboStrategy brand identity", ratio: "3274 / 1866" },
  { id: "mtc", type: "image", src: "/brand-identity/mtc-footer.png", label: "Muslim Tech Collaborative pattern", ratio: "3216 / 1859" },
  { id: "logo", type: "image", src: "/brand-identity/my-logo-variants.png", label: "noorslens logo color variants", ratio: "2210 / 1860" },
];

const VIDEO_SLIDES = [
  {
    id: "draft3",
    src: r2Src("Draft 3 - 5.5mb.mp4"),
    link: "https://x.com/noorslens/status/2054597910138925188",
    title: "neet",
    ratio: "1280 / 960",
  },
  {
    id: "fear",
    src: r2Src("Please Don t Live in Fear_1080p.mp4"),
    link: "https://youtu.be/DwyD5Y0ZJ7k",
    title: "Please Don't Live in Fear",
    ratio: "1440 / 1080",
  },
  {
    id: "tennis",
    src: r2Src("Dhun - Tennis Shoes (Official Music Video)_1080p.mp4"),
    link: "https://youtu.be/ylQ5CVsdxKQ",
    title: "Dhun - Tennis Shoes",
    ratio: "1920 / 1080",
  },
  {
    id: "video2",
    src: r2Src("video 2.mp4"),
    link: "https://www.instagram.com/fatcat_eater/reel/DSDVpllEcaO/",
    title: "The Fat Cat Challenge",
    ratio: "2160 / 3840",
  },
  {
    id: "smoking",
    src: r2Src("Smoking Kills.mp4"),
    link: "https://www.instagram.com/reel/DcwyoBnBcLJ/?stkn=dzJtZG9vemZybHU5",
    title: "SMOKING KILLS",
    ratio: "2989 / 1674",
    startAt: 2,
  },
];
const VIDEO_COUNT = VIDEO_SLIDES.length;
const VIDEO_CLONE_SETS = 3;
const VIDEO_SLIDE_CELLS = Array.from({ length: VIDEO_COUNT * VIDEO_CLONE_SETS }, (_, i) => i);
// The first/last items sit at the seam between clone segments — stepping past
// either one snaps `active` to the equivalent slide in the canonical segment,
// which swaps which cloned DOM cell is "the neighbor" instantly. If that cell
// wasn't preloaded, its video flashes blank for a moment. Keeping every clone
// copy of just these two boundary items preloaded (not just the ones nearest
// `active`) means whichever copy the snap reveals is already buffered.
const VIDEO_WRAP_ITEMS = new Set([0, VIDEO_COUNT - 1]);
const DRAG_THRESHOLD_RATIO = 0.18;

const SHOW_WORK_LINK = true;
const SHOW_PLAY_LINK = true;
// true = blue arrow/pill theme, false = old grey/orange look
const STEPPER_BLUE_THEME = false;

function Header() {
  const funRef = useRef(null);

  return (
    <header className="header">
      <a href="#top" aria-label="noorslens home">
        <img className="header__logo" src="/icons/orange-logo.png" alt="noorslens logo" />
      </a>
      <nav className="nav" aria-label="Primary">
        {SHOW_WORK_LINK && (
          <a className="nav__link" href="#work">
            WORK
          </a>
        )}
        {SHOW_PLAY_LINK && (
          <a ref={funRef} className="nav__link nav__link--muted" href="#play" aria-disabled="true">
            FUN
            <TapPopup
              hoverRef={funRef}
              src="/icons/coming-soon:D.svg"
              alt="coming soon"
              ariaHidden={false}
              className="nav__tooltip"
            />
          </a>
        )}
      </nav>
    </header>
  );
}

function MorphingRole() {
  const wrapRef = useRef(null);
  const hoveredRef = useRef(false);
  const [hitboxWidth, setHitboxWidth] = useState(null);
  const [hovered, setHoveredState] = useState(false);

  const setHovered = (value) => {
    hoveredRef.current = value;
    setHoveredState(value);
  };

  // Touch has no hover to leave, so a tap only ever gets the onFocus side of
  // this — tapping again keeps the element already focused, no blur fires,
  // and it's stuck until something else steals focus. On coarse pointers,
  // hand control to a plain click-toggle instead: focus/blur are ignored
  // there (focus fires *before* click on the same tap, so leaving them live
  // would toggle true then immediately back to false on the first tap).
  const isCoarsePointer = () => window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const onFocus = () => {
    if (!isCoarsePointer()) setHovered(true);
  };
  const onBlur = () => {
    if (!isCoarsePointer()) setHovered(false);
  };
  const onClick = () => {
    if (isCoarsePointer()) setHovered(!hoveredRef.current);
  };

  // On coarse pointers a tap toggles it open; let a tap anywhere else on
  // the page close it again instead of requiring a second tap on itself.
  useEffect(() => {
    if (!hovered || !isCoarsePointer()) return;
    const onOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setHovered(false);
    };
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [hovered]);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    // The hitbox is pinned to the rest-state width so the hover boundary
    // never moves — the visible text is still free to collapse and let
    // "based in SF/NJ" slide in behind it, but a cursor sitting right at the
    // original edge can't fall outside a shrinking box and bounce.
    const measure = () => {
      if (!hoveredRef.current) setHitboxWidth(el.getBoundingClientRect().width);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <span
      className={`morph${hovered ? " is-hovered" : ""}`}
      tabIndex={0}
      ref={wrapRef}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={onClick}
    >
      <span
        className="morph__hitbox"
        aria-hidden="true"
        style={hitboxWidth ? { width: hitboxWidth } : undefined}
        onMouseEnter={onFocus}
        onMouseLeave={onBlur}
      />
      <span>design</span>
      <span className="morph__in">
        <span className="morph__in-inner">er/</span>
      </span>
      <span className="morph__out">
        <span className="morph__out-inner"> </span>
      </span>
      <span>engineer</span>
    </span>
  );
}

/* Popup lags behind the cursor with spring-like inertia instead of
   tracking it 1:1 — feels alive rather than glued to the pointer. */
const NOOR_POPUP_EASE = 0.14;

// Keeps the popup's edges inside the viewport (minus a margin) instead of
// letting it clip off the top or sides on narrow screens.
const NOOR_POPUP_MARGIN = 16;
const NOOR_POPUP_OFFSET_Y = 24;

function NoorPopup() {
  const imgRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const stickyRef = useRef(false);
  const stickyTimerRef = useRef(null);
  const pos = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const rafRef = useRef(0);

  useEffect(() => {
    const tick = () => {
      const p = pos.current;
      p.x += (p.tx - p.x) * NOOR_POPUP_EASE;
      p.y += (p.ty - p.y) * NOOR_POPUP_EASE;
      if (imgRef.current) {
        imgRef.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -100%)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const clamp = (x, y) => {
    const img = imgRef.current;
    const w = img?.offsetWidth || 180;
    const h = img?.offsetHeight || 180;
    return {
      x: Math.min(Math.max(x, w / 2 + NOOR_POPUP_MARGIN), window.innerWidth - w / 2 - NOOR_POPUP_MARGIN),
      y: Math.min(Math.max(y, h + NOOR_POPUP_MARGIN), window.innerHeight - NOOR_POPUP_MARGIN),
    };
  };

  const setTarget = (clientX, clientY, snap) => {
    const { x, y } = clamp(clientX, clientY - NOOR_POPUP_OFFSET_Y);
    pos.current.tx = x;
    pos.current.ty = y;
    if (snap) {
      pos.current.x = x;
      pos.current.y = y;
    }
  };

  const hide = () => {
    visibleRef.current = false;
    stickyRef.current = false;
    clearTimeout(stickyTimerRef.current);
    setVisible(false);
  };

  useEffect(() => {
    const onMove = (e) => {
      if (stickyRef.current) return;
      setTarget(e.clientX, e.clientY, !visibleRef.current);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Touch has no hover/leave, so a tap sticks the popup open until the user
  // does anything else — scroll, tap elsewhere, click a link — at which
  // point it must vanish immediately rather than lingering.
  useEffect(() => {
    const dismiss = (e) => {
      if (!stickyRef.current) return;
      if (e.target?.closest?.(".hero__accent")) return;
      hide();
    };
    const onScroll = () => {
      if (stickyRef.current) hide();
    };
    document.addEventListener("touchstart", dismiss, true);
    document.addEventListener("pointerdown", dismiss, true);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener("touchstart", dismiss, true);
      document.removeEventListener("pointerdown", dismiss, true);
      window.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, []);

  const show = (e) => {
    setTarget(e.clientX, e.clientY, true);
    visibleRef.current = true;
    setVisible(true);
  };

  const onTouchStart = (e) => {
    const t = e.touches[0];
    if (!t) return;
    setTarget(t.clientX, t.clientY, true);
    visibleRef.current = true;
    stickyRef.current = true;
    clearTimeout(stickyTimerRef.current);
    stickyTimerRef.current = setTimeout(hide, TAP_POPUP_DURATION);
    setVisible(true);
  };

  return (
    <>
      <span
        className="hero__accent"
        onMouseEnter={show}
        onMouseLeave={hide}
        onTouchStart={onTouchStart}
      >
        Noor
      </span>
      <img
        ref={imgRef}
        className={`noor-popup${visible ? " is-visible" : ""}`}
        src="/icons/me.png"
        alt=""
        aria-hidden="true"
        draggable={false}
      />
    </>
  );
}

function Hero() {
  return (
    <section className="hero">
      <h1 className="hero__line">
        I’m <NoorPopup />, a <MorphingRole /><br className="hero__break" aria-hidden="true" /> based in SF/NJ
      </h1>
    </section>
  );
}

/* Columns of pixel blocks across the card — lower = chunkier */
const PIXELATE_COLUMNS = 120;

// Mobile browsers cap how many <video> elements can autoplay at once and
// silently fall back to a tap-to-play affordance past that limit — with 5+
// work-card videos all trying to autoplay on mount, some always lost. This
// loads normally (src set from mount, like any video) but only calls
// play()/pause() once a card is actually near the viewport, so only what's
// on screen is ever competing for that slot.
function useAutoplayInView(rootMargin = "200px") {
  const videoRef = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin, threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (inView) video.play().catch(() => {});
    else video.pause();
  }, [inView]);

  return videoRef;
}

function PixelatedVideo({ src, label }) {
  const videoRef = useAutoplayInView();
  const canvasRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf = 0;

    const draw = () => {
      if (video.videoWidth > 0) {
        if (canvas.width !== PIXELATE_COLUMNS) {
          canvas.width = PIXELATE_COLUMNS;
          canvas.height = Math.round((PIXELATE_COLUMNS * video.videoHeight) / video.videoWidth);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <video
        ref={videoRef}
        className="work-card__video work-card__video--source"
        src={src}
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />
      <canvas ref={canvasRef} className="work-card__video work-card__video--pixelated" aria-label={label} />
    </>
  );
}

function ZoomableVideo({ item }) {
  const videoRef = useAutoplayInView();
  const [muted, setMuted] = useState(true);

  const toggleMute = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMuted((m) => !m);
  };

  return (
    <>
      <video
        ref={videoRef}
        className="work-card__video"
        src={item.video}
        muted={item.sound ? muted : true}
        loop
        playsInline
        preload="auto"
        aria-label={item.title}
        style={{
          transform: "translate(0%, 0%) scale(1.01)",
          transformOrigin: "top",
        }}
      />
      {item.sound && (
        <button
          type="button"
          className="work-card__soundbtn sound-btn"
          aria-label={muted ? "Unmute video" : "Mute video"}
          onClick={toggleMute}
        >
          {muted ? <SoundOffIcon /> : <SoundOnIcon />}
        </button>
      )}
    </>
  );
}

function PlainWorkVideo({ item }) {
  const videoRef = useAutoplayInView();

  return (
    <video
      ref={videoRef}
      className="work-card__video"
      src={item.video}
      muted
      loop
      playsInline
      preload="auto"
      aria-label={item.title}
    />
  );
}

const WORK_COLUMNS = [
  WORK_ITEMS.filter((_, i) => i % 2 === 0),
  WORK_ITEMS.filter((_, i) => i % 2 === 1),
];

/* Same lagging-inertia follow as NoorPopup, but scoped to hover over a single
   element (the card link) instead of the whole viewport. */
const REQUEST_ACCESS_EASE = 0.2;
const REQUEST_ACCESS_OFFSET = { x: 22, y: 22 };

// Devices without a real pointer get TapPopup below instead — mouse events
// are unreliable there, and dragging a cursor-follow image around under a
// touch doesn't make sense anyway.
const HOVER_CAPABLE_QUERY = "(hover: hover) and (pointer: fine) and (min-width: 769px)";

// How long a tap-revealed popup stays up before auto-hiding.
const TAP_POPUP_DURATION = 1500;

// Touch fallback for hover-only popups (nav tooltip, request-access,
// coming-soon): shows on tap and auto-hides after TAP_POPUP_DURATION,
// instead of relying on the browser's "tap simulates :hover until you tap
// elsewhere" quirk, which leaves it stuck open indefinitely.
function TapPopup({ hoverRef, src, alt = "", ariaHidden = true, className }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const el = hoverRef.current;
    if (!el) return;

    const show = () => {
      setVisible(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), TAP_POPUP_DURATION);
    };

    el.addEventListener("touchstart", show, { passive: true });
    return () => {
      el.removeEventListener("touchstart", show);
      clearTimeout(timerRef.current);
    };
  }, [hoverRef]);

  return (
    <img
      className={`${className}${visible ? " is-visible" : ""}`}
      src={src}
      alt={alt}
      aria-hidden={ariaHidden ? "true" : undefined}
      draggable={false}
    />
  );
}

function CursorFollowPopup({ hoverRef, src, enabled = true }) {
  const imgRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(true);
  // Tracks real pointer-over-element state, independent of `enabled` — kept
  // running continuously so a click that flips `enabled` true mid-hover (e.g.
  // recentering a carousel slide under a stationary cursor) can show the
  // popup immediately instead of waiting for a mouseenter that will never
  // fire again for a pointer that never left.
  const hoveringRef = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const pos = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const rafRef = useRef(0);

  useEffect(() => {
    const query = window.matchMedia(HOVER_CAPABLE_QUERY);
    const update = () => setHoverCapable(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const tick = () => {
      const p = pos.current;
      p.x += (p.tx - p.x) * REQUEST_ACCESS_EASE;
      p.y += (p.ty - p.y) * REQUEST_ACCESS_EASE;
      if (imgRef.current) {
        imgRef.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    const el = hoverRef.current;
    if (!el || !hoverCapable) return;

    const setTarget = (clientX, clientY, snap) => {
      const x = clientX + REQUEST_ACCESS_OFFSET.x;
      const y = clientY + REQUEST_ACCESS_OFFSET.y;
      pos.current.tx = x;
      pos.current.ty = y;
      if (snap) {
        pos.current.x = x;
        pos.current.y = y;
      }
    };

    const onMove = (e) => setTarget(e.clientX, e.clientY, !hoveringRef.current);
    const onEnter = (e) => {
      setTarget(e.clientX, e.clientY, true);
      hoveringRef.current = true;
      setVisible(enabledRef.current);
    };
    const onLeave = () => {
      hoveringRef.current = false;
      setVisible(false);
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [hoverRef, hoverCapable]);

  // Re-evaluate visibility whenever `enabled` changes, in case the pointer
  // is already over the element (see hoveringRef comment above).
  useEffect(() => {
    setVisible(enabled && hoveringRef.current);
  }, [enabled]);

  // Mobile/touch gets the plain CSS-hover .mobile-popup instead (rendered
  // by the caller) — skip mounting this cursor-follow version entirely.
  if (!hoverCapable) return null;

  // Portaled to <body> — position: fixed is otherwise contained by any
  // transformed ancestor (the carousel track/slide both use transform),
  // which would make it track relative to that box instead of the viewport.
  return createPortal(
    <img
      ref={imgRef}
      className={`request-access-popup${visible ? " is-visible" : ""}`}
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
    />,
    document.body
  );
}

function WorkCard({ item, index }) {
  const linkRef = useRef(null);

  const media = (
    <div className="work-card__media" style={{ aspectRatio: item.ratio }}>
      {item.image ? (
        <img
          className="work-card__image"
          src={item.image}
          alt={item.title}
          loading="lazy"
          draggable={false}
        />
      ) : item.pixelate ? (
        <PixelatedVideo src={item.video} label={item.title} />
      ) : item.zoom ? (
        <ZoomableVideo item={item} />
      ) : (
        <PlainWorkVideo item={item} />
      )}
      {(item.link || item.comingSoon) && (
        <span
          className="work-card__overlay"
          aria-hidden="true"
          style={
            item.id === "hlm"
              ? { "--overlay-color": "rgba(255, 255, 255, 0.40)" }
              : item.id === "pace"
              ? { "--overlay-color": "rgba(255, 255, 255, 0.5)" }
              : undefined
          }
        />
      )}
      {item.requestAccess && (
        <TapPopup hoverRef={linkRef} src="/icons/request-access.svg" className="mobile-popup" />
      )}
      {item.comingSoon && (
        <TapPopup hoverRef={linkRef} src="/icons/coming-soon.svg" className="mobile-popup" />
      )}
    </div>
  );

  return (
    <article className="work-card" style={{ "--i": index }}>
      {item.link ? (
        <>
          <a
            ref={linkRef}
            href={item.link}
            {...(item.requestAccess ? {} : { target: "_blank", rel: "noopener noreferrer" })}
            className="work-card__link"
            aria-label={item.requestAccess ? `Request access to ${item.title}` : `${item.title} - opens in new tab`}
          >
            {media}
            <h2 className="work-card__title">{item.title}</h2>
          </a>
          {item.requestAccess && <CursorFollowPopup hoverRef={linkRef} src="/icons/request-access.svg" />}
        </>
      ) : item.comingSoon ? (
        <>
          <div ref={linkRef} className="work-card__link">
            {media}
            <h2 className="work-card__title">{item.title}</h2>
          </div>
          <CursorFollowPopup hoverRef={linkRef} src="/icons/coming-soon.svg" />
        </>
      ) : (
        <>
          {media}
          <h2 className="work-card__title">{item.title}</h2>
        </>
      )}
    </article>
  );
}

function WorkSection() {
  return (
    <section className="work" id="work" aria-label="Selected work">
      <div className="work__grid">
        {WORK_COLUMNS.map((column, c) => (
          <div className="work__col" key={c}>
            {column.map((item) => (
              <WorkCard item={item} index={WORK_ITEMS.indexOf(item)} key={item.id} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

const MARQUEE_LOOP_SECONDS = 55;

function BrandSection() {
  const marqueeRef = useRef(null);
  const trackRef = useRef(null);
  const setRef = useRef(null);

  useEffect(() => {
    const marquee = marqueeRef.current;
    const track = trackRef.current;
    const firstSet = setRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const s = { offset: 0, setW: 0, dragging: false, hovering: false, lastX: 0, lastT: 0, raf: 0 };

    const measure = () => {
      s.setW = firstSet.getBoundingClientRect().width;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(firstSet);

    const apply = () => {
      if (s.setW > 0) s.offset = ((s.offset % s.setW) + s.setW) % s.setW;
      track.style.transform = `translate3d(${-s.offset}px, 0, 0)`;
    };

    const tick = (t) => {
      const dt = s.lastT ? (t - s.lastT) / 1000 : 0;
      s.lastT = t;
      if (!reduced && !s.dragging && !s.hovering && s.setW > 0) {
        s.offset += (s.setW / MARQUEE_LOOP_SECONDS) * dt;
        apply();
      }
      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);

    const onDown = (e) => {
      s.dragging = true;
      s.lastX = e.clientX;
      marquee.setPointerCapture(e.pointerId);
    };
    const onMove = (e) => {
      if (!s.dragging) return;
      s.offset -= e.clientX - s.lastX;
      s.lastX = e.clientX;
      apply();
    };
    const onUp = (e) => {
      s.dragging = false;
      if (marquee.hasPointerCapture(e.pointerId)) marquee.releasePointerCapture(e.pointerId);
    };
    const onEnter = () => {
      s.hovering = true;
    };
    const onLeave = () => {
      s.hovering = false;
    };
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        s.offset += e.deltaX;
        apply();
      }
    };

    marquee.addEventListener("pointerdown", onDown);
    marquee.addEventListener("pointermove", onMove);
    marquee.addEventListener("pointerup", onUp);
    marquee.addEventListener("pointercancel", onUp);
    marquee.addEventListener("mouseenter", onEnter);
    marquee.addEventListener("mouseleave", onLeave);
    marquee.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(s.raf);
      ro.disconnect();
      marquee.removeEventListener("pointerdown", onDown);
      marquee.removeEventListener("pointermove", onMove);
      marquee.removeEventListener("pointerup", onUp);
      marquee.removeEventListener("pointercancel", onUp);
      marquee.removeEventListener("mouseenter", onEnter);
      marquee.removeEventListener("mouseleave", onLeave);
      marquee.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <section className="section brand" aria-label="Brand identity and explorations">
      <h2 className="section__heading">brand identity and explorations</h2>
      <div className="brand__stage">
        <div className="brand__marquee" ref={marqueeRef}>
        <div className="brand__track" ref={trackRef}>
          {[0, 1].map((copy) => (
            <div className="brand__set" key={copy} ref={copy === 0 ? setRef : undefined} aria-hidden={copy === 1}>
              {BRAND_SLIDES.map((slide) => (
                <div className="brand__slide" style={{ aspectRatio: slide.ratio }} key={slide.id}>
                  {slide.type === "video" ? (
                    <video
                      className="brand__media"
                      src={slide.src}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      aria-label={copy === 0 ? slide.label : undefined}
                    />
                  ) : (
                    <img
                      className="brand__media"
                      src={slide.src}
                      alt={copy === 0 ? slide.label : ""}
                      loading="lazy"
                      draggable={false}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
          </div>
        </div>
        <BrandDistortion trackRef={trackRef} />
      </div>
    </section>
  );
}

function ArrowIcon({ direction }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={direction === "prev" ? { transform: "scaleX(-1)" } : undefined}
    >
      <path
        d="M9 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
    </svg>
  );
}

function SoundOnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      <path
        d="M16.5 8.5a5 5 0 0 1 0 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SoundOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      <path
        d="M15.5 9.5l4 4m0-4l-4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function VideoCard({ item, onHitClick, isActive, isNear, shouldLoad }) {
  const videoRef = useRef(null);
  const scrubRef = useRef(null);
  const scrubbingRef = useRef(false);
  const hitRef = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);

  const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(item.src);

  useEffect(() => {
    if (isImage) return;
    const video = videoRef.current;
    const onTime = () => {
      if (!scrubbingRef.current && video.duration) {
        setProgress(video.currentTime / video.duration);
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [isImage]);

  useEffect(() => {
    if (!isActive) setMuted(true);
  }, [isActive]);

  useEffect(() => {
    if (isImage || !item.startAt) return;
    const video = videoRef.current;
    const seekToStart = () => {
      video.currentTime = item.startAt;
    };
    const onEnded = () => {
      video.currentTime = item.startAt;
      video.play().catch(() => {});
    };
    video.addEventListener("loadedmetadata", seekToStart);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("loadedmetadata", seekToStart);
      video.removeEventListener("ended", onEnded);
    };
  }, [isImage, item.startAt]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isNear) {
      // A slide that was already preloaded as a neighbor is paused with no
      // pending load, so adding the autoplay attribute alone won't play it —
      // that only fires during the initial resource-load step.
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isNear]);

  // Dropping src (going >1 slide away) doesn't cancel an in-flight fetch on
  // its own — load() forces the element to abandon it and release the buffer.
  useEffect(() => {
    if (!shouldLoad && !isImage) videoRef.current?.load();
  }, [shouldLoad, isImage]);

  const togglePlay = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (video.paused) video.play();
    else video.pause();
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    setMuted((m) => !m);
  };

  const seekFromEvent = (e) => {
    const rect = scrubRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setProgress(ratio);
    const video = videoRef.current;
    if (video.duration) video.currentTime = ratio * video.duration;
  };

  const onScrubDown = (e) => {
    e.stopPropagation();
    scrubbingRef.current = true;
    seekFromEvent(e);
    scrubRef.current.setPointerCapture(e.pointerId);
  };
  const onScrubMove = (e) => {
    if (!scrubbingRef.current) return;
    seekFromEvent(e);
  };
  const onScrubUp = (e) => {
    scrubbingRef.current = false;
    if (scrubRef.current.hasPointerCapture(e.pointerId)) {
      scrubRef.current.releasePointerCapture(e.pointerId);
    }
  };

  if (isImage) {
    return (
      <>
        <a
          ref={hitRef}
          className="videos__slide-hit"
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.title}
          onClick={onHitClick}
        >
          <img className="videos__media" src={item.src} alt={item.title} draggable={false} style={{ objectFit: "contain", width: "100%", height: "100%" }} />
        </a>
        <div className="videos__controls videos__controls--dummy" aria-hidden="true">
          <div className="videos__playbtn">
            <PlayIcon />
          </div>
          <div className="videos__scrubber">
            <div className="videos__scrubber-fill" style={{ width: "0%" }} />
          </div>
          <div className="videos__soundbtn sound-btn">
            <SoundOffIcon />
          </div>
        </div>
        <CursorFollowPopup hoverRef={hitRef} src="/icons/coming-soon.svg" enabled={isActive} />
        {isActive && <TapPopup hoverRef={hitRef} src="/icons/coming-soon.svg" className="mobile-popup" />}
      </>
    );
  }

  return (
    <>
      <a
        className="videos__slide-hit"
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={item.title}
        onClick={onHitClick}
      >
        <video
          ref={videoRef}
          className="videos__media"
          src={shouldLoad ? item.src : undefined}
          autoPlay={isNear}
          muted={muted}
          loop={!item.startAt}
          playsInline
          preload={shouldLoad ? "auto" : "none"}
        />
      </a>
      <div className="videos__controls">
        <button
          type="button"
          className="videos__playbtn"
          aria-label={playing ? "Pause preview" : "Play preview"}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={togglePlay}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div
          className="videos__scrubber"
          ref={scrubRef}
          onPointerDown={onScrubDown}
          onPointerMove={onScrubMove}
          onPointerUp={onScrubUp}
          onPointerCancel={onScrubUp}
        >
          <div className="videos__scrubber-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <button
          type="button"
          className="videos__soundbtn sound-btn"
          aria-label={muted ? "Unmute preview" : "Mute preview"}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={toggleMute}
        >
          {muted ? <SoundOffIcon /> : <SoundOnIcon />}
        </button>
      </div>
    </>
  );
}

function VideoSection() {
  const [active, setActive] = useState(VIDEO_COUNT + 1);
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    offset: 0,
    moved: false,
    pointerId: null,
    wheeling: false,
    wheelAccum: 0,
    wheelTimer: null,
  });
  /* only one slide-move may be in flight at a time — the clone segments only
     buffer one step past the real range, so stacking multiple in-flight
     moves (e.g. rapid arrow clicks) would push --active past what's
     rendered and the track would translate into empty space. Extra moves
     requested while one is in flight are queued instead of dropped, so
     rapid clicking still keeps up rather than being ignored. */
  const animatingRef = useRef(false);
  const queueRef = useRef([]);
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  });

  const realActive = ((active % VIDEO_COUNT) + VIDEO_COUNT) % VIDEO_COUNT;

  const processQueue = () => {
    if (animatingRef.current) return;
    let next = queueRef.current.shift();
    while (next && next.type === "goto" && next.index === activeRef.current) {
      next = queueRef.current.shift();
    }
    if (!next) return;
    animatingRef.current = true;
    if (next.type === "step") setActive((a) => a + next.dir);
    else setActive(next.index);
  };
  const step = (dir) => {
    if (queueRef.current.length < 8) queueRef.current.push({ type: "step", dir });
    processQueue();
  };
  const goTo = (i) => {
    if (queueRef.current.length < 8) queueRef.current.push({ type: "goto", index: i });
    processQueue();
  };

  /* slides keep their original aspect ratio, so widths vary — center the
     active slide by measuring its actual layout position rather than
     assuming a fixed slide width in a CSS calc() */
  useLayoutEffect(() => {
    const track = trackRef.current;
    const viewport = viewportRef.current;
    const update = () => {
      const activeEl = track.children[active];
      if (!activeEl) return;
      const slideCenter = activeEl.offsetLeft + activeEl.offsetWidth / 2;
      track.style.setProperty("--base-x", `${viewport.clientWidth / 2 - slideCenter}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [active]);

  /* after animating onto a clone segment, snap invisibly back to the
     equivalent slide in the middle (canonical) segment */
  useEffect(() => {
    const track = trackRef.current;
    const onEnd = (e) => {
      if (e.target !== track || e.propertyName !== "transform") return;
      animatingRef.current = false;
      if (active >= VIDEO_COUNT && active < VIDEO_COUNT * 2) {
        processQueue();
        return;
      }
      const wrapped = ((active % VIDEO_COUNT) + VIDEO_COUNT) % VIDEO_COUNT + VIDEO_COUNT;
      track.style.transition = "none";
      track.classList.add("is-snapping");
      setActive(wrapped);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          track.style.transition = "";
          track.classList.remove("is-snapping");
          processQueue();
        });
      });
    };
    track.addEventListener("transitionend", onEnd);
    return () => track.removeEventListener("transitionend", onEnd);
  }, [active]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const d = dragRef.current;

    const slideStep = () => {
      const current =
        track.querySelector('.videos__slide[aria-current="true"]') ||
        track.querySelector(".videos__slide");
      if (!current) return 0;
      const w = current.getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || "0");
      return w + gap;
    };

    const onDown = (e) => {
      if (animatingRef.current) return;
      // Native listener on an ancestor fires before React's synthetic
      // handlers, so the scrubber's own stopPropagation() can't stop this —
      // bail explicitly for anything inside the controls bar instead.
      if (e.target.closest(".videos__controls")) return;
      d.dragging = true;
      d.moved = false;
      d.startX = e.clientX;
      d.offset = 0;
      d.pointerId = e.pointerId;
      /* don't capture the pointer yet — capturing on down retargets the
         eventual "click" to the viewport in Chromium, breaking clicks on
         the slide/link underneath. Only capture once real drag movement
         is confirmed, so plain clicks pass through untouched. */
    };
    const onMove = (e) => {
      if (!d.dragging) return;
      d.offset = e.clientX - d.startX;
      if (!d.moved && Math.abs(d.offset) > 4) {
        d.moved = true;
        track.classList.add("is-dragging");
        viewport.setPointerCapture(d.pointerId);
      }
      if (d.moved) track.style.setProperty("--drag-offset", `${d.offset}px`);
    };
    const onUp = (e) => {
      if (!d.dragging) return;
      d.dragging = false;
      if (!d.moved) return;
      track.classList.remove("is-dragging");
      if (viewport.hasPointerCapture(e.pointerId)) viewport.releasePointerCapture(e.pointerId);
      track.style.setProperty("--drag-offset", "0px");
      const distance = slideStep();
      if (distance > 0 && Math.abs(d.offset) > distance * DRAG_THRESHOLD_RATIO) {
        step(d.offset < 0 ? 1 : -1);
      }
      setTimeout(() => {
        d.moved = false;
      }, 0);
    };

    /* trackpad/mouse-wheel horizontal scrubbing — accumulates deltaX,
       previews it live through the same --drag-offset used by pointer
       drag, and commits a step once past the drag threshold */
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || d.dragging) return;
      e.preventDefault();
      /* bail before touching is-dragging/timers — a stray trailing wheel
         event from the same gesture must not re-disable the transition
         while a committed step is mid-animation, or transitionend never
         fires and animatingRef gets stuck true forever */
      if (animatingRef.current) return;

      if (!d.wheeling) {
        d.wheeling = true;
        track.classList.add("is-dragging");
      }
      clearTimeout(d.wheelTimer);
      d.wheelTimer = setTimeout(() => {
        d.wheeling = false;
        d.wheelAccum = 0;
        track.classList.remove("is-dragging");
        track.style.setProperty("--drag-offset", "0px");
      }, 160);

      d.wheelAccum += e.deltaX;
      const distance = slideStep();
      if (distance > 0 && Math.abs(d.wheelAccum) > distance * DRAG_THRESHOLD_RATIO) {
        const dir = d.wheelAccum > 0 ? 1 : -1;
        d.wheelAccum = 0;
        d.wheeling = false;
        clearTimeout(d.wheelTimer);
        track.classList.remove("is-dragging");
        track.style.setProperty("--drag-offset", "0px");
        step(dir);
        return;
      }
      track.style.setProperty("--drag-offset", `${-d.wheelAccum}px`);
    };

    viewport.addEventListener("pointerdown", onDown);
    viewport.addEventListener("pointermove", onMove);
    viewport.addEventListener("pointerup", onUp);
    viewport.addEventListener("pointercancel", onUp);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      viewport.removeEventListener("pointerdown", onDown);
      viewport.removeEventListener("pointermove", onMove);
      viewport.removeEventListener("pointerup", onUp);
      viewport.removeEventListener("pointercancel", onUp);
      viewport.removeEventListener("wheel", onWheel);
      clearTimeout(d.wheelTimer);
    };
  }, []);

  return (
    <section className="section videos" aria-label="Videos, movies, growth, and content">
      <h2 className="section__heading">
        videos/<wbr />movies/<wbr />growth
      </h2>
      <div className="videos__stage">
        <div className="videos__viewport" ref={viewportRef}>
          <div className="videos__track" ref={trackRef}>
            {VIDEO_SLIDE_CELLS.map((i) => {
              const item = VIDEO_SLIDES[i % VIDEO_COUNT];
              const isNear = Math.abs(i - active) <= 1;
              // Preload one step further than autoplay/play range so a slide
              // has been buffering for a while by the time you scrub to it,
              // without also pushing more videos into the autoplay race
              // (mobile browsers cap concurrent autoplaying <video>s).
              const shouldLoad = Math.abs(i - active) <= 2 || VIDEO_WRAP_ITEMS.has(i % VIDEO_COUNT);
              return (
                <div className="videos__slide" key={i} aria-current={i === active}>
                  <div className="videos__media-frame" style={{ aspectRatio: item.ratio }}>
                    <VideoCard
                      item={item}
                      isActive={i === active}
                      isNear={isNear}
                      shouldLoad={shouldLoad}
                      onHitClick={(e) => {
                        if (dragRef.current.moved) {
                          e.preventDefault();
                          return;
                        }
                        if (i !== active) {
                          e.preventDefault();
                          goTo(i);
                        }
                      }}
                    />
                  </div>
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="videos__slide-title-link"
                      aria-label={`${item.title} - opens in new tab`}
                    >
                      {item.title}
                    </a>
                  ) : (
                    <h2 className="videos__slide-title">{item.title}</h2>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className={`videos__stepper-row${STEPPER_BLUE_THEME ? " videos__stepper-row--blue" : ""}`}>
        <button
          type="button"
          className="videos__arrow videos__arrow--prev"
          aria-label="Previous video"
          onClick={() => step(-1)}
        >
          <ArrowIcon direction="prev" />
        </button>
        <Stepper
          className="video-stepper"
          count={VIDEO_COUNT}
          active={realActive}
          onStepClick={(i) => goTo(VIDEO_COUNT + i)}
        />
        <button
          type="button"
          className="videos__arrow videos__arrow--next"
          aria-label="Next video"
          onClick={() => step(1)}
        >
          <ArrowIcon direction="next" />
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <a className="footer__link" href="https://x.com/noorslens" target="_blank" rel="noreferrer">
        X
      </a>
      <a className="footer__link" href="mailto:noorunalam@gmail.com">
        EMAIL
      </a>
      <a
        className="footer__link"
        href="https://www.linkedin.com/in/noor--alam/"
        target="_blank"
        rel="noreferrer"
      >
        LINKEDIN
      </a>
    </footer>
  );
}

export default function App() {
  return (
    <div className="page" id="top">
      <CustomCursor />
      <Header />
      <Hero />
      <WorkSection />
      <BrandSection />
      <VideoSection />
      <Footer />
    </div>
  );
}
