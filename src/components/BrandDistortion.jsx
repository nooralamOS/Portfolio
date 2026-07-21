import { useEffect, useRef } from "react";

const SEGMENTS = 64;
const EDGE_ZONE = 0.06;
const EDGE_POW = 2.6;
const FAN = 0.28;
const CHROMA = 0.02;
// Seam thresholds: GL crossfades in over a wide band of the edge ramp (not a
// hard step) so any GL-vs-DOM rendering difference blends invisibly. The warp
// is gated by the same curve, so geometry stays aligned with the DOM through
// the fade.
const SEAM_LO = "0.0";
const SEAM_HI = "0.05";
const FX_HI = "0.3";

const VERT = `
  attribute vec2 aPos;
  uniform vec2 uResolution;
  uniform vec4 uRect;
  uniform float uBandCenter;
  uniform float uFan;
  uniform float uEdgeZone;
  uniform float uEdgePow;
  varying vec2 vUv;
  varying float vEdge;

  void main() {
    vUv = aPos;
    vec2 screen = uRect.xy + aPos * uRect.zw;
    float sx = screen.x / uResolution.x;
    float dist = min(sx, 1.0 - sx);
    float edge = pow(smoothstep(uEdgeZone, 0.0, dist), uEdgePow);
    float blend = smoothstep(${SEAM_LO}, ${SEAM_HI}, edge);
    float y = uBandCenter + (screen.y - uBandCenter) * (1.0 + uFan * edge * blend);
    gl_Position = vec4(sx * 2.0 - 1.0, 1.0 - y / uResolution.y * 2.0, 0.0, 1.0);
    vEdge = edge;
  }
`;

const FRAG = `
  precision highp float;
  uniform sampler2D tMap;
  uniform float uChroma;
  uniform vec2 uUvScale;
  uniform vec2 uUvOffset;
  varying vec2 vUv;
  varying float vEdge;

  void main() {
    vec2 uv = uUvOffset + vUv * uUvScale;
    vec4 base = texture2D(tMap, uv);
    float seam = smoothstep(${SEAM_LO}, ${SEAM_HI}, vEdge);
    float fx = smoothstep(${SEAM_HI}, ${FX_HI}, vEdge);
    float ca = uChroma * fx * (0.4 + vEdge);
    float r = texture2D(tMap, uv + vec2(0.0, ca)).r;
    float b = texture2D(tMap, uv - vec2(0.0, ca)).b;
    vec3 rgb = mix(base.rgb, vec3(r, base.g, b), fx);
    gl_FragColor = vec4(rgb, 1.0) * seam;
  }
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

export default function BrandDistortion({ trackRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const track = trackRef.current;
    if (!canvas || !track) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });
    if (!gl) return;

    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    gl.useProgram(program);

    const verts = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const x = i / SEGMENTS;
      verts.push(x, 0, x, 1);
    }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = {};
    for (const name of [
      "uResolution",
      "uRect",
      "uBandCenter",
      "uFan",
      "uEdgeZone",
      "uEdgePow",
      "uChroma",
      "uUvScale",
      "uUvOffset",
      "tMap",
    ]) {
      u[name] = gl.getUniformLocation(program, name);
    }
    gl.uniform1f(u.uFan, FAN);
    gl.uniform1f(u.uEdgeZone, EDGE_ZONE);
    gl.uniform1f(u.uEdgePow, EDGE_POW);
    gl.uniform1f(u.uChroma, CHROMA);
    gl.uniform1i(u.tMap, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cssW = 0;
    let cssH = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const texCache = new Map();
    const getTexture = (el) => {
      let t = texCache.get(el);
      if (!t) {
        t = {
          tex: gl.createTexture(),
          ready: false,
          isVideo: el.tagName === "VIDEO",
          w: 0,
          h: 0,
        };
        gl.bindTexture(gl.TEXTURE_2D, t.tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        texCache.set(el, t);
      }
      if (t.isVideo) {
        if (el.readyState >= 2 && el.videoWidth > 0) {
          gl.bindTexture(gl.TEXTURE_2D, t.tex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el);
          t.w = el.videoWidth;
          t.h = el.videoHeight;
          t.ready = true;
        }
      } else if (!t.ready && el.complete && el.naturalWidth > 0) {
        gl.bindTexture(gl.TEXTURE_2D, t.tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el);
        t.w = el.naturalWidth;
        t.h = el.naturalHeight;
        t.ready = true;
      }
      return t;
    };

    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (cssW === 0 || cssH === 0) return;
      gl.clear(gl.COLOR_BUFFER_BIT);

      const canvasRect = canvas.getBoundingClientRect();
      gl.uniform2f(u.uResolution, cssW, cssH);
      gl.uniform1f(u.uBandCenter, cssH / 2);

      for (const el of track.querySelectorAll(".brand__media")) {
        const rect = el.getBoundingClientRect();
        const x = rect.left - canvasRect.left;
        const y = rect.top - canvasRect.top;
        const l = x / cssW;
        const r = (x + rect.width) / cssW;
        if (r < 0 || l > 1) continue;
        // Tile fully inside the flat middle zone: nothing to draw.
        if (l > EDGE_ZONE && r < 1 - EDGE_ZONE) continue;

        const t = getTexture(el);
        if (!t.ready) continue;

        const mediaAspect = t.w / t.h;
        const rectAspect = rect.width / rect.height;
        let sx = 1;
        let sy = 1;
        if (mediaAspect > rectAspect) sx = rectAspect / mediaAspect;
        else sy = mediaAspect / rectAspect;

        gl.bindTexture(gl.TEXTURE_2D, t.tex);
        gl.uniform4f(u.uRect, x, y, rect.width, rect.height);
        gl.uniform2f(u.uUvScale, sx, sy);
        gl.uniform2f(u.uUvOffset, (1 - sx) / 2, (1 - sy) / 2);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, (SEGMENTS + 1) * 2);
      }
    };
    raf = requestAnimationFrame(frame);

    // No loseContext here: StrictMode remounts reuse the same canvas, and a
    // lost context can never be re-acquired via getContext.
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [trackRef]);

  return <canvas className="brand__gl" ref={canvasRef} aria-hidden="true" />;
}
