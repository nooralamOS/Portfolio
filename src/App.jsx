import { useEffect, useRef, useState } from "react";
import { Stepper } from "pasito";
import "pasito/styles.css";
import BrandDistortion from "./components/BrandDistortion.jsx";

const CURSOR_HOTSPOT = { x: 2.5, y: 1.25 };

function CustomCursor() {
  const wrapRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    setEnabled(true);
    document.documentElement.classList.add("custom-cursor-active");
    return () => document.documentElement.classList.remove("custom-cursor-active");
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const el = wrapRef.current;

    const onMove = (e) => {
      el.style.transform = `translate3d(${e.clientX - CURSOR_HOTSPOT.x}px, ${e.clientY - CURSOR_HOTSPOT.y}px, 0)`;
      el.classList.add("is-visible");
      const overClickable =
        e.target instanceof Element && e.target.closest("a, button") !== null;
      el.classList.toggle("is-hovering", overClickable);
    };
    const onLeave = () => el.classList.remove("is-visible");

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="cursor" ref={wrapRef} aria-hidden="true">
      <img className="cursor__img cursor__img--base" src="/icons/orange-cursor.svg" alt="" />
      <img className="cursor__img cursor__img--select" src="/icons/select-cursor.svg" alt="" />
    </div>
  );
}

const WORK_ITEMS = [
  { id: "hlm", title: "Humanity’s Last Machine", video: "/videos/HLM.mp4", ratio: "3416 / 1712" },
  { id: "wmzt", title: "World Model Deep-Dive", video: "/videos/wmzt.mp4", ratio: "3360 / 1790" },
  { id: "mtc", title: "MTC", video: "/videos/MTC.mp4", ratio: "1920 / 1080" },
  { id: "pace", title: "Pace V3 Launch Video", video: "/videos/PACE.mp4", ratio: "3840 / 2160", zoom: true },
  { id: "ziptero", title: "Ziptero (coming soon)", video: "/videos/Ziptero.mp4", ratio: "3416 / 1682", pixelate: true },
];

const BRAND_SLIDES = [
  { id: "sim", type: "video", src: "/brand-identity/sim-changelog.mp4", label: "Sim changelog interface", ratio: "3420 / 1922" },
  { id: "hex", type: "image", src: "/brand-identity/hex-merch.png", label: "Hex Security type exploration", ratio: "2511 / 1866" },
  { id: "robo", type: "image", src: "/brand-identity/robostrategy.png", label: "RoboStrategy brand identity", ratio: "3274 / 1866" },
  { id: "mtc", type: "image", src: "/brand-identity/mtc-footer.png", label: "Muslim Tech Collaborative pattern", ratio: "3216 / 1859" },
  { id: "logo", type: "image", src: "/brand-identity/my-logo-variants.png", label: "noorslens logo color variants", ratio: "2210 / 1860" },
];
const VIDEO_SLIDES = ["v1", "v2", "v3", "v4", "v5"];
const VIDEO_COUNT = VIDEO_SLIDES.length;
const VIDEO_CLONE_SETS = 3;
const VIDEO_SLIDE_CELLS = Array.from({ length: VIDEO_COUNT * VIDEO_CLONE_SETS }, (_, i) => i);
const DRAG_THRESHOLD_RATIO = 0.18;

function Header() {
  return (
    <header className="header">
      <a href="#top" aria-label="noorslens home">
        <img className="header__logo" src="/icons/orange-logo.png" alt="noorslens logo" />
      </a>
      <nav className="nav" aria-label="Primary">
        <a className="nav__link" href="#work">
          WORK
        </a>
        <a className="nav__link nav__link--muted" href="#fun" aria-disabled="true">
          FUN
        </a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero">
      <h1 className="hero__line">
        I’m <span className="hero__accent">Noor</span>, a designer/engineer based in SF/NJ
      </h1>
    </section>
  );
}

/* Columns of pixel blocks across the card — lower = chunkier */
const PIXELATE_COLUMNS = 120;

function PixelatedVideo({ src, label }) {
  const videoRef = useRef(null);
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
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
      <canvas ref={canvasRef} className="work-card__video work-card__video--pixelated" aria-label={label} />
    </>
  );
}

const WORK_COLUMNS = [
  WORK_ITEMS.filter((_, i) => i % 2 === 0),
  WORK_ITEMS.filter((_, i) => i % 2 === 1),
];

function WorkSection() {
  return (
    <section className="work" id="work" aria-label="Selected work">
      <div className="work__grid">
        {WORK_COLUMNS.map((column, c) => (
          <div className="work__col" key={c}>
            {column.map((item) => (
              <article
                className="work-card"
                key={item.id}
                style={{ "--i": WORK_ITEMS.indexOf(item) }}
              >
                <div className="work-card__media" style={{ aspectRatio: item.ratio }}>
                  {item.pixelate ? (
                    <PixelatedVideo src={item.video} label={item.title} />
                  ) : (
                    <video
                      className={item.zoom ? "work-card__video work-card__video--zoom" : "work-card__video"}
                      src={item.video}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      aria-label={item.title}
                    />
                  )}
                </div>
                <h2 className="work-card__title">{item.title}</h2>
              </article>
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
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VideoSection() {
  const [active, setActive] = useState(VIDEO_COUNT + 1);
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const dragRef = useRef({ dragging: false, startX: 0, offset: 0, moved: false });
  /* only one slide-move may be in flight at a time — the clone segments only
     buffer one step past the real range, so stacking multiple in-flight
     moves (e.g. rapid arrow clicks) would push --active past what's
     rendered and the track would translate into empty space */
  const animatingRef = useRef(false);

  const realActive = ((active % VIDEO_COUNT) + VIDEO_COUNT) % VIDEO_COUNT;

  const step = (dir) => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    setActive((a) => a + dir);
  };
  const goTo = (i) => {
    if (animatingRef.current || i === active) return;
    animatingRef.current = true;
    setActive(i);
  };

  /* after animating onto a clone segment, snap invisibly back to the
     equivalent slide in the middle (canonical) segment */
  useEffect(() => {
    const track = trackRef.current;
    const onEnd = (e) => {
      if (e.target !== track || e.propertyName !== "transform") return;
      animatingRef.current = false;
      if (active >= VIDEO_COUNT && active < VIDEO_COUNT * 2) return;
      const wrapped = ((active % VIDEO_COUNT) + VIDEO_COUNT) % VIDEO_COUNT + VIDEO_COUNT;
      track.style.transition = "none";
      setActive(wrapped);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          track.style.transition = "";
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
      const first = track.querySelector(".videos__slide");
      if (!first) return 0;
      const w = first.getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || "0");
      return w + gap;
    };

    const onDown = (e) => {
      if (animatingRef.current) return;
      d.dragging = true;
      d.moved = false;
      d.startX = e.clientX;
      d.offset = 0;
      track.classList.add("is-dragging");
      viewport.setPointerCapture(e.pointerId);
    };
    const onMove = (e) => {
      if (!d.dragging) return;
      d.offset = e.clientX - d.startX;
      if (Math.abs(d.offset) > 4) d.moved = true;
      track.style.setProperty("--drag-offset", `${d.offset}px`);
    };
    const onUp = (e) => {
      if (!d.dragging) return;
      d.dragging = false;
      track.classList.remove("is-dragging");
      if (viewport.hasPointerCapture(e.pointerId)) viewport.releasePointerCapture(e.pointerId);
      track.style.setProperty("--drag-offset", "0px");
      const distance = slideStep();
      if (distance > 0 && Math.abs(d.offset) > distance * DRAG_THRESHOLD_RATIO) {
        step(d.offset < 0 ? 1 : -1);
      }
      if (d.moved) {
        setTimeout(() => {
          d.moved = false;
        }, 0);
      }
    };

    viewport.addEventListener("pointerdown", onDown);
    viewport.addEventListener("pointermove", onMove);
    viewport.addEventListener("pointerup", onUp);
    viewport.addEventListener("pointercancel", onUp);
    return () => {
      viewport.removeEventListener("pointerdown", onDown);
      viewport.removeEventListener("pointermove", onMove);
      viewport.removeEventListener("pointerup", onUp);
      viewport.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <section className="section videos" aria-label="Videos, growth, and content">
      <h2 className="section__heading">videos/growth/content</h2>
      <div className="videos__stage">
        <div className="videos__viewport" ref={viewportRef}>
          <div className="videos__track" ref={trackRef} style={{ "--active": active }}>
            {VIDEO_SLIDE_CELLS.map((i) => (
              <button
                type="button"
                className="videos__slide placeholder"
                key={i}
                aria-current={i === active}
                aria-label={`Show video ${(i % VIDEO_COUNT) + 1}`}
                onClick={(e) => {
                  if (dragRef.current.moved) {
                    e.preventDefault();
                    return;
                  }
                  goTo(i);
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="videos__stepper-row">
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

export default function App() {
  return (
    <div className="page" id="top">
      <CustomCursor />
      <Header />
      <Hero />
      <WorkSection />
      <BrandSection />
      <VideoSection />
    </div>
  );
}
