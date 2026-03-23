"use client";

import { useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChartOutlined,
  InboxOutlined,
  ToolOutlined,
  TeamOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  RocketOutlined,
  SettingOutlined,
  CarOutlined,
  ShoppingOutlined,
  FileDoneOutlined,
} from "@ant-design/icons";
import gsap from "gsap";

// ─── Tool centers (spirals will be seeded here, then become tools) ─
const TOOLS = {
  gearLarge: { cx: 555, cy: 322 },
  gearSmall: { cx: 622, cy: 259 },
  wrench:    { cx: 138, cy: 292 },
  nut1:      { cx: 185, cy: 155 },
  nut2:      { cx: 178, cy: 468 },
  bolt:      { cx: 668, cy: 490 },
} as const;

const GL = { ...TOOLS.gearLarge, outerR: 68, innerR: 51, teeth: 12 } as const;
const GS = { ...TOOLS.gearSmall, outerR: 34, innerR: 26, teeth: 8  } as const;

// ─── SVG geometry helpers ─────────────────────────────────────────
function buildGearPath(cx: number, cy: number, outerR: number, innerR: number, teeth: number) {
  const step = (Math.PI * 2) / teeth;
  let d = "";
  for (let i = 0; i < teeth; i++) {
    const a0 = i * step - step * 0.28;
    const a1 = i * step + step * 0.28;
    const a2 = i * step + step * 0.44;
    const a3 = (i + 1) * step - step * 0.44;
    const p = (a: number, r: number) =>
      `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
    d += (i === 0 ? "M" : " L") + p(a0, outerR);
    d += " L" + p(a1, outerR) + " L" + p(a2, innerR) + " L" + p(a3, innerR);
  }
  return d + " Z";
}

function buildHexPath(cx: number, cy: number, r: number, rotDeg = 0) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = ((i * 60 + rotDeg) * Math.PI) / 180;
    return `${i === 0 ? "M" : " L"}${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join("") + " Z";
}

function buildSpiralPath(cx: number, cy: number, r: number, turns: number) {
  let d = `M${(cx + r).toFixed(1)},${cy.toFixed(1)}`;
  for (let deg = 5; deg <= turns * 360; deg += 5) {
    const rad = (deg * Math.PI) / 180;
    const cr = r * (1 - deg / (turns * 360));
    d += ` L${(cx + cr * Math.cos(rad)).toFixed(1)},${(cy + cr * Math.sin(rad)).toFixed(1)}`;
  }
  return d;
}

// ─── Component ────────────────────────────────────────────────────
export default function EnhancedBackgroundPaths({
  title = "Neural Dynamics",
  subtitle,
  primaryCta,
}: {
  title?: string;
  subtitle?: string;
  primaryCta?: { label: string; href: string };
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const words = title.split(" ");

  // 8 spirals — 6 seeded at tool positions, 2 decorative
  const spirals = useMemo(() => [
    // Seeded at tool positions (same center as their tool)
    { id: "sp-gearL", cx: TOOLS.gearLarge.cx, cy: TOOLS.gearLarge.cy, r: 58, turns: 3.8, tool: "gearLarge" },
    { id: "sp-gearS", cx: TOOLS.gearSmall.cx, cy: TOOLS.gearSmall.cy, r: 30, turns: 3.0, tool: "gearSmall" },
    { id: "sp-wrench", cx: TOOLS.wrench.cx,   cy: TOOLS.wrench.cy,   r: 40, turns: 3.2, tool: "wrench"    },
    { id: "sp-nut1",  cx: TOOLS.nut1.cx,      cy: TOOLS.nut1.cy,     r: 25, turns: 2.8, tool: "nut1"      },
    { id: "sp-nut2",  cx: TOOLS.nut2.cx,      cy: TOOLS.nut2.cy,     r: 20, turns: 2.6, tool: "nut2"      },
    { id: "sp-bolt",  cx: TOOLS.bolt.cx,       cy: TOOLS.bolt.cy,     r: 24, turns: 2.9, tool: "bolt"      },
    // Decorative (top-center & bottom-center)
    { id: "sp-deco1", cx: 360, cy: 85,  r: 34, turns: 3.0, tool: null },
    { id: "sp-deco2", cx: 400, cy: 510, r: 28, turns: 2.8, tool: null },
  ].map((s) => ({ ...s, d: buildSpiralPath(s.cx, s.cy, s.r, s.turns) })), []);

  const toolPaths = useMemo(() => ({
    gearLarge: buildGearPath(GL.cx, GL.cy, GL.outerR, GL.innerR, GL.teeth),
    gearSmall: buildGearPath(GS.cx, GS.cy, GS.outerR, GS.innerR, GS.teeth),
    nut1:      buildHexPath(TOOLS.nut1.cx, TOOLS.nut1.cy, 28, 30),
    nut2:      buildHexPath(TOOLS.nut2.cx, TOOLS.nut2.cy, 21, 0),
    boltHex:   buildHexPath(TOOLS.bolt.cx, TOOLS.bolt.cy - 30, 23, 0),
  }), []);

  // ── GSAP Animation ──────────────────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const sprEls  = Array.from(svg.querySelectorAll<SVGGeometryElement>(".s-spiral"));
    const toolEls = Array.from(svg.querySelectorAll<SVGGeometryElement>(".s-tool"));

    // Init stroke-dash (draw-in effect)
    const initDash = (els: SVGGeometryElement[]) => {
      els.forEach((el) => {
        let len = 600;
        try { len = el.getTotalLength(); } catch { /* noop */ }
        gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
      });
    };

    initDash(sprEls);
    initDash(toolEls);
    // Tools start fully hidden
    gsap.set(toolEls, { opacity: 0 });

    const tl = gsap.timeline();

    // ── Phase 1: Spirals draw in (staggered, 0–2.2s) ──────────────
    tl.to(sprEls, {
      strokeDashoffset: 0,
      duration: 1.8,
      stagger: 0.18,
      ease: "power1.inOut",
    }, 0);

    // ── Phase 2: Spirals "pulse" (brief scale+opacity flash) ──────
    tl.to(sprEls, {
      opacity: 0.6,
      scale: 1.08,
      duration: 0.25,
      stagger: 0.04,
      ease: "power1.in",
      transformOrigin: "center center",
    }, 2.0);

    // ── Phase 3: Spirals converge (scale down to center → fade) ───
    tl.to(sprEls, {
      scale: 0.3,
      opacity: 0,
      duration: 0.45,
      stagger: 0.05,
      ease: "power2.in",
      transformOrigin: "center center",
    }, 2.25);

    // ── Phase 4: Tools draw in from the spiral positions ──────────
    // Stagger per tool group (same order as spiral seed positions)
    const toolGroups = [
      "#s-gear-large",
      "#s-gear-small",
      "#s-wrench",
      "#s-nut1",
      "#s-nut2",
      "#s-bolt",
    ];

    toolGroups.forEach((selector, i) => {
      const groupEls = Array.from(
        svg.querySelectorAll<SVGGeometryElement>(`${selector} .s-tool`)
      );
      if (!groupEls.length) return;
      // Each group's paths draw in together, groups staggered by 0.12s
      tl.to(groupEls, {
        strokeDashoffset: 0,
        opacity: 1,
        duration: 0.9,
        stagger: 0.06,
        ease: "power2.out",
      }, 2.55 + i * 0.12);
    });

    // ── Phase 5: Gear rotation (starts after fully revealed) ──────
    const gearLargeEl = svg.querySelector<SVGGElement>("#s-gear-large");
    const gearSmallEl = svg.querySelector<SVGGElement>("#s-gear-small");

    if (gearLargeEl) {
      gsap.to(gearLargeEl, {
        rotation: 360,
        svgOrigin: `${GL.cx} ${GL.cy}`,
        duration: 16,
        repeat: -1,
        ease: "none",
        delay: 3.8,
      });
    }
    if (gearSmallEl) {
      gsap.to(gearSmallEl, {
        rotation: -360,
        svgOrigin: `${GS.cx} ${GS.cy}`,
        duration: 8,
        repeat: -1,
        ease: "none",
        delay: 3.8,
      });
    }

    // Subtle wrench float
    const wrenchEl = svg.querySelector<SVGGElement>("#s-wrench");
    if (wrenchEl) {
      gsap.to(wrenchEl, {
        y: -6,
        duration: 3.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: 4.2,
      });
    }

    return () => {
      tl.kill();
      gsap.killTweensOf(sprEls);
      gsap.killTweensOf(toolEls);
      if (gearLargeEl) gsap.killTweensOf(gearLargeEl);
      if (gearSmallEl) gsap.killTweensOf(gearSmallEl);
      if (wrenchEl) gsap.killTweensOf(wrenchEl);
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100">

      {/* ── SVG Background ───────────────────────────────────────── */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {/* ── Spirals (seeded at tool positions) ── */}
        <g fill="none" strokeLinecap="round">
          {spirals.map((s) => (
            <path
              key={s.id}
              className="s-spiral"
              d={s.d}
              stroke="#3b82f6"
              strokeWidth={s.tool ? "1.6" : "1.2"}
              opacity={s.tool ? "0.65" : "0.40"}
            />
          ))}
        </g>

        {/* ── Manufacturing Tools ── */}
        <g fill="none" stroke="#1e293b" strokeLinecap="round" strokeLinejoin="round" opacity="0.55">

          {/* Large Gear */}
          <g id="s-gear-large">
            <path   className="s-tool" d={toolPaths.gearLarge} strokeWidth="2"   />
            <circle className="s-tool" cx={GL.cx} cy={GL.cy} r="17" strokeWidth="1.8" />
            <circle className="s-tool" cx={GL.cx} cy={GL.cy} r="7"  strokeWidth="1.4" />
            {[0, 60, 120].map((deg) => {
              const a = (deg * Math.PI) / 180;
              return (
                <line
                  key={deg}
                  className="s-tool"
                  x1={(GL.cx + 7  * Math.cos(a)).toFixed(1)} y1={(GL.cy + 7  * Math.sin(a)).toFixed(1)}
                  x2={(GL.cx + 17 * Math.cos(a)).toFixed(1)} y2={(GL.cy + 17 * Math.sin(a)).toFixed(1)}
                  strokeWidth="1.2"
                />
              );
            })}
          </g>

          {/* Small Gear */}
          <g id="s-gear-small">
            <path   className="s-tool" d={toolPaths.gearSmall} strokeWidth="1.8" />
            <circle className="s-tool" cx={GS.cx} cy={GS.cy} r="9"   strokeWidth="1.6" />
            <circle className="s-tool" cx={GS.cx} cy={GS.cy} r="3.5" strokeWidth="1.3" />
          </g>

          {/* Wrench */}
          <g id="s-wrench">
            <circle className="s-tool" cx={75}  cy={290} r="22" strokeWidth="1.8" />
            <circle className="s-tool" cx={75}  cy={290} r="11" strokeWidth="1.4" />
            <path   className="s-tool" d="M 97,278 L 188,275" strokeWidth="1.5" />
            <path   className="s-tool" d="M 97,302 L 188,305" strokeWidth="1.5" />
            <path   className="s-tool" d="M 97,278 L 97,302"  strokeWidth="1.5" />
            <path   className="s-tool" d="M 188,275 L 215,264 L 215,277" strokeWidth="1.5" />
            <path   className="s-tool" d="M 188,305 L 215,316 L 215,303" strokeWidth="1.5" />
            <path   className="s-tool" d="M 215,277 A 13,13 0 0,0 215,303" strokeWidth="1.2" />
          </g>

          {/* Hex Nut 1 */}
          <g id="s-nut1">
            <path   className="s-tool" d={toolPaths.nut1} strokeWidth="1.8" />
            <circle className="s-tool" cx={TOOLS.nut1.cx} cy={TOOLS.nut1.cy} r="13" strokeWidth="1.5" />
          </g>

          {/* Hex Nut 2 */}
          <g id="s-nut2">
            <path   className="s-tool" d={toolPaths.nut2} strokeWidth="1.6" />
            <circle className="s-tool" cx={TOOLS.nut2.cx} cy={TOOLS.nut2.cy} r="9"  strokeWidth="1.3" />
          </g>

          {/* Bolt */}
          <g id="s-bolt">
            <path className="s-tool" d={toolPaths.boltHex} strokeWidth="1.8" />
            <path className="s-tool" d="M 659,483 L 659,548 L 677,548 L 677,483" strokeWidth="1.5" />
            <path className="s-tool" d="M 660,496 L 676,496" strokeWidth="1.0" />
            <path className="s-tool" d="M 660,508 L 676,508" strokeWidth="1.0" />
            <path className="s-tool" d="M 660,520 L 676,520" strokeWidth="1.0" />
            <path className="s-tool" d="M 660,532 L 676,532" strokeWidth="1.0" />
            <path className="s-tool" d="M 660,544 L 676,544" strokeWidth="1.0" />
          </g>
        </g>
      </svg>

      {/* Gradient vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-transparent to-white/70 pointer-events-none" />

      {/* ── Main Content ─────────────────────────────────────────── */}
      <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="max-w-5xl mx-auto"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-8 bg-blue-50 text-blue-700 border border-blue-200"
          >
            <span className="w-2 h-2 bg-blue-500 rounded-full inline-block" />
            All-in-one manufacturing ERP
          </motion.div>

          {/* Title */}
          <div className="mb-6">
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black mb-4 tracking-tighter leading-none">
              {words.map((word, wi) => (
                <span key={wi} className="inline-block mr-4 last:mr-0">
                  {word.split("").map((letter, li) => (
                    <motion.span
                      key={`${wi}-${li}`}
                      initial={{ y: 100, opacity: 0, rotateX: -90 }}
                      animate={{ y: 0, opacity: 1, rotateX: 0 }}
                      transition={{
                        delay: wi * 0.15 + li * 0.05,
                        type: "spring",
                        stiffness: 100,
                        damping: 20,
                      }}
                      className="inline-block text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-blue-800 to-blue-600 hover:from-blue-600 hover:to-purple-600 transition-all duration-700 cursor-default"
                      whileHover={{ scale: 1.05, y: -2 }}
                    >
                      {letter}
                    </motion.span>
                  ))}
                </span>
              ))}
            </h1>
          </div>

          {/* Subtitle */}
          {subtitle && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
              className="text-lg md:text-xl text-slate-600 font-light tracking-wide max-w-2xl mx-auto mb-10"
            >
              {subtitle}
            </motion.p>
          )}

          {/* CTA */}
          {primaryCta && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.8, type: "spring", stiffness: 100 }}
              className="flex justify-center"
            >
              <a href={primaryCta.href} style={{ textDecoration: "none" }}>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-slate-900 text-white font-semibold text-base tracking-wide hover:bg-slate-800 transition-colors duration-200 cursor-pointer"
                  style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}
                >
                  {primaryCta.label}
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  >
                    →
                  </motion.span>
                </motion.button>
              </a>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ── Floating Module Icons ─────────────────────────────────── */}
      {[
        // Top-left cluster
        { icon: <BarChartOutlined />,    bg: "#eff6ff", color: "#2563eb", top: "12%",  left: "4%",   delay: 0,    duration: 5.5,  size: 48 },
        { icon: <TeamOutlined />,        bg: "#f5f3ff", color: "#7c3aed", top: "28%",  left: "7%",   delay: 1.2,  duration: 7,    size: 44 },
        { icon: <ShoppingOutlined />,    bg: "#fff7ed", color: "#ea580c", top: "18%",  left: "13%",  delay: 2.5,  duration: 6,    size: 40 },

        // Top-right cluster
        { icon: <FileTextOutlined />,    bg: "#f0fdf4", color: "#16a34a", top: "10%",  right: "5%",  delay: 0.5,  duration: 6.5,  size: 48 },
        { icon: <DollarOutlined />,      bg: "#ecfdf5", color: "#059669", top: "24%",  right: "8%",  delay: 1.8,  duration: 5,    size: 44 },
        { icon: <RocketOutlined />,      bg: "#fdf4ff", color: "#a21caf", top: "16%",  right: "16%", delay: 3,    duration: 7.5,  size: 40 },

        // Bottom-left cluster
        { icon: <ToolOutlined />,        bg: "#f8fafc", color: "#475569", top: "68%",  left: "5%",   delay: 0.8,  duration: 6,    size: 48 },
        { icon: <InboxOutlined />,       bg: "#fff7ed", color: "#d97706", top: "80%",  left: "10%",  delay: 2,    duration: 5.5,  size: 44 },
        { icon: <FileDoneOutlined />,    bg: "#f0f9ff", color: "#0284c7", top: "73%",  left: "18%",  delay: 3.5,  duration: 7,    size: 40 },

        // Bottom-right cluster
        { icon: <ShoppingCartOutlined />,bg: "#fff1f2", color: "#e11d48", top: "70%",  right: "6%",  delay: 1.5,  duration: 6.5,  size: 48 },
        { icon: <CarOutlined />,         bg: "#eff6ff", color: "#3b82f6", top: "82%",  right: "11%", delay: 0.3,  duration: 5,    size: 44 },
        { icon: <SettingOutlined />,     bg: "#f1f5f9", color: "#64748b", top: "75%",  right: "19%", delay: 2.8,  duration: 7,    size: 40 },
      ].map((item, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{
            top: item.top,
            left: "left" in item ? item.left : undefined,
            right: "right" in item ? item.right : undefined,
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: item.delay + 1, duration: 0.6, ease: "backOut" }}
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{
              duration: item.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: item.delay,
            }}
            style={{
              width: item.size,
              height: item.size,
              borderRadius: item.size * 0.28,
              background: item.bg,
              border: `1px solid ${item.color}22`,
              boxShadow: `0 4px 16px ${item.color}18, 0 1px 4px rgba(0,0,0,0.06)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: item.size * 0.42,
              color: item.color,
              backdropFilter: "blur(4px)",
            }}
          >
            {item.icon}
          </motion.div>
        </motion.div>
      ))}

      {/* Floating accent blobs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-4 h-4 bg-blue-500/20 rounded-full blur-sm pointer-events-none"
        animate={{ y: [0, -20, 0], x: [0, 10, 0], scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-3/4 right-1/3 w-6 h-6 bg-slate-500/15 rounded-full blur-sm pointer-events-none"
        animate={{ y: [0, 15, 0], x: [0, -15, 0], scale: [1, 0.8, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
    </div>
  );
}
