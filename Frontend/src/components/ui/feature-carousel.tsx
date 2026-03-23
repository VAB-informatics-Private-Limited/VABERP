"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  FileText,
  Wrench,
  Package,
  ShoppingCart,
  BarChart2,
  Box,
  Settings2,
  Users,
  Truck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MODULES = [
  {
    id: "crm",
    label: "CRM & Enquiries",
    icon: Phone,
    image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=1200",
    description: "Capture leads, track follow-ups, and nurture relationships from first contact.",
  },
  {
    id: "quotations",
    label: "Quotation Builder",
    icon: FileText,
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=1200",
    description: "Generate professional, versioned quotations and convert them to orders in one click.",
  },
  {
    id: "manufacturing",
    label: "Manufacturing",
    icon: Wrench,
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1200",
    description: "Full BOM-to-dispatch workflow with job cards and real-time production tracking.",
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1200",
    description: "Manage raw materials, track stock levels, and maintain a complete stock ledger.",
  },
  {
    id: "procurement",
    label: "Procurement",
    icon: ShoppingCart,
    image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=1200",
    description: "Handle purchase indents, manage suppliers, and streamline purchasing.",
  },
  {
    id: "reports",
    label: "Reports & Analytics",
    icon: BarChart2,
    image: "https://images.unsplash.com/photo-1551288049-bbda38a10ad5?q=80&w=1200",
    description: "Charts, sales funnels, and trend analysis to keep you always ahead.",
  },
  {
    id: "products",
    label: "Products",
    icon: Box,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1200",
    description: "Manage your full product catalogue with attributes, categories, and pricing.",
  },
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1200",
    description: "Centralised customer profiles with full history, contacts, and communication logs.",
  },
  {
    id: "dispatch",
    label: "Dispatch",
    icon: Truck,
    image: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=1200",
    description: "Dispatch finished goods with full documentation and delivery tracking.",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings2,
    image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1200",
    description: "Configure stages, units, templates, and permissions to fit your business.",
  },
];

const AUTO_PLAY_INTERVAL = 3000;
const ITEM_HEIGHT = 54;

const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

export function FeatureCarousel() {
  const [step, setStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentIndex = ((step % MODULES.length) + MODULES.length) % MODULES.length;

  const nextStep = useCallback(() => setStep((p) => p + 1), []);
  const prevStep = useCallback(() => setStep((p) => p - 1), []);

  const handleChipClick = (index: number) => {
    const diff = (index - currentIndex + MODULES.length) % MODULES.length;
    if (diff > 0) setStep((s) => s + diff);
  };

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(nextStep, AUTO_PLAY_INTERVAL);
    return () => clearInterval(interval);
  }, [nextStep, isPaused]);

  const getCardStatus = (index: number) => {
    const diff = index - currentIndex;
    const len = MODULES.length;
    let d = diff;
    if (diff > len / 2) d -= len;
    if (diff < -len / 2) d += len;
    if (d === 0) return "active";
    if (d === -1) return "prev";
    if (d === 1) return "next";
    return "hidden";
  };

  const ActiveIcon = MODULES[currentIndex].icon;

  return (
    <div className="w-full max-w-7xl mx-auto md:p-4">
      <div className="relative overflow-hidden rounded-[2rem] border border-neutral-200">

        {/* ── MOBILE layout (< lg) ─────────────────────────────────── */}
        <div className="flex flex-col lg:hidden">

          {/* Image card */}
          <div className="relative w-full aspect-[4/3] bg-neutral-100 overflow-hidden">
            {MODULES.map((mod, index) => {
              const status = getCardStatus(index);
              const isActive = status === "active";
              const isPrev = status === "prev";
              const isNext = status === "next";

              return (
                <motion.div
                  key={mod.id}
                  initial={false}
                  animate={{
                    x: isActive ? 0 : isPrev ? -120 : isNext ? 120 : 0,
                    scale: isActive ? 1 : 0.9,
                    opacity: isActive ? 1 : isPrev || isNext ? 0.3 : 0,
                    zIndex: isActive ? 20 : isPrev || isNext ? 10 : 0,
                    pointerEvents: isActive ? "auto" : "none",
                  }}
                  transition={{ type: "spring", stiffness: 260, damping: 25 }}
                  className="absolute inset-0 overflow-hidden"
                >
                  <img
                    src={mod.image}
                    alt={mod.label}
                    className="w-full h-full object-cover"
                  />
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-x-0 bottom-0 p-5 pt-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent"
                      >
                        <div className="bg-white text-slate-900 px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-widest w-fit mb-2">
                          {index + 1} · {mod.label}
                        </div>
                        <p className="text-white text-sm leading-snug">{mod.description}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Module selector strip */}
          <div className="bg-slate-900 px-4 py-4">
            {/* Active module + prev/next arrows */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => { prevStep(); setIsPaused(true); setTimeout(() => setIsPaused(false), 4000); }}
                style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
              >
                <ChevronLeft size={16} color="white" />
              </button>

              <div className="flex items-center gap-2">
                <ActiveIcon size={14} color="white" />
                <span style={{ color: 'white', fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {MODULES[currentIndex].label}
                </span>
              </div>

              <button
                onClick={() => { nextStep(); setIsPaused(true); setTimeout(() => setIsPaused(false), 4000); }}
                style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
              >
                <ChevronRight size={16} color="white" />
              </button>
            </div>

            {/* Dot indicators */}
            <div className="flex items-center justify-center gap-1.5">
              {MODULES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleChipClick(i)}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    i === currentIndex
                      ? "w-5 h-1.5 bg-white"
                      : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── DESKTOP layout (lg+) ─────────────────────────────────── */}
        <div className="hidden lg:flex lg:h-[420px]">

          {/* Left panel */}
          <div className="w-[38%] h-full relative z-30 flex flex-col items-start justify-center overflow-hidden pl-12 bg-slate-900">
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-slate-900 via-slate-900/80 to-transparent z-40" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent z-40" />

            <div className="relative w-full h-full flex items-center justify-start z-20">
              {MODULES.map((mod, index) => {
                const isActive = index === currentIndex;
                const distance = index - currentIndex;
                const wrappedDistance = wrap(-(MODULES.length / 2), MODULES.length / 2, distance);
                const Icon = mod.icon;

                return (
                  <motion.div
                    key={mod.id}
                    style={{ height: ITEM_HEIGHT, width: "fit-content" }}
                    animate={{
                      y: wrappedDistance * ITEM_HEIGHT,
                      opacity: 1 - Math.abs(wrappedDistance) * 0.25,
                    }}
                    transition={{ type: "spring", stiffness: 90, damping: 22, mass: 1 }}
                    className="absolute flex items-center justify-start"
                  >
                    <button
                      onClick={() => handleChipClick(index)}
                      onMouseEnter={() => setIsPaused(true)}
                      onMouseLeave={() => setIsPaused(false)}
                      className={cn(
                        "relative flex items-center gap-4 px-8 py-4 rounded-full transition-all duration-700 text-left border cursor-pointer",
                        isActive
                          ? "bg-white text-slate-900 border-white z-10"
                          : "bg-transparent text-white/50 border-white/20 hover:border-white/40 hover:text-white"
                      )}
                    >
                      <Icon
                        size={16}
                        className={cn(
                          "transition-colors duration-500 flex-shrink-0",
                          isActive ? "text-slate-900" : "text-white/40"
                        )}
                      />
                      <span className="font-normal text-sm tracking-tight whitespace-nowrap uppercase">
                        {mod.label}
                      </span>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 h-full relative bg-neutral-50 flex items-center justify-center py-8 px-10 overflow-hidden border-l border-neutral-200">
            <div className="relative w-full max-w-[280px] aspect-[4/5] flex items-center justify-center">
              {MODULES.map((mod, index) => {
                const status = getCardStatus(index);
                const isActive = status === "active";
                const isPrev = status === "prev";
                const isNext = status === "next";

                return (
                  <motion.div
                    key={mod.id}
                    initial={false}
                    animate={{
                      x: isActive ? 0 : isPrev ? -100 : isNext ? 100 : 0,
                      scale: isActive ? 1 : isPrev || isNext ? 0.85 : 0.7,
                      opacity: isActive ? 1 : isPrev || isNext ? 0.4 : 0,
                      rotate: isPrev ? -3 : isNext ? 3 : 0,
                      zIndex: isActive ? 20 : isPrev || isNext ? 10 : 0,
                      pointerEvents: isActive ? "auto" : "none",
                    }}
                    transition={{ type: "spring", stiffness: 260, damping: 25, mass: 0.8 }}
                    className="absolute inset-0 rounded-[1.5rem] overflow-hidden border-4 border-white bg-white origin-center"
                  >
                    <img
                      src={mod.image}
                      alt={mod.label}
                      className={cn(
                        "w-full h-full object-cover transition-all duration-700",
                        isActive ? "grayscale-0 blur-0" : "grayscale blur-[2px] brightness-75"
                      )}
                    />
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute inset-x-0 bottom-0 p-8 pt-28 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"
                        >
                          <div className="bg-white text-slate-900 px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-widest w-fit mb-3">
                            {index + 1} · {mod.label}
                          </div>
                          <p className="text-white font-normal text-xl leading-snug tracking-tight">
                            {mod.description}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default FeatureCarousel;
