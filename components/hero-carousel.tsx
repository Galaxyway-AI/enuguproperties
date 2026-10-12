"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { HeroSlide } from "@/lib/hero-slides";

function subscribeMotionPreference(update: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}

function motionPreference() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HeroCarousel({
  slides,
  children,
}: {
  slides: HeroSlide[];
  children: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [delay, setDelay] = useState(12000);
  const [playRequested, setPlayRequested] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeMotionPreference,
    motionPreference,
    () => false,
  );
  const stopped = paused || (reducedMotion && !playRequested);
  const [visited, setVisited] = useState<number[]>([0]);
  const [firstPhotoLoaded, setFirstPhotoLoaded] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const count = slides.length;
  const activeIndex = count ? index % count : 0;

  useEffect(() => {
    if (count < 2 || stopped) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const update = () => {
      clearInterval(timer);
      if (!document.hidden) {
        timer = setInterval(() => {
          setIndex((current) => (current + 1) % count);
        }, delay);
      }
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, [count, stopped, delay]);

  function move(next: number) {
    setPaused(true);
    const target = (next + count) % count;
    setIndex(target);
    setVisited((current) =>
      current.includes(target) ? current : [...current, target],
    );
  }

  const current = slides[activeIndex];
  return (
    <section
      className="homepage-hero"
      aria-label="Find property in Enugu"
      onFocusCapture={(event) => {
        // The play/pause control manages its own state when it receives focus.
        if (!event.target.closest(".homepage-slider-settings")) setPaused(true);
      }}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = touch
          ? { x: touch.clientX, y: touch.clientY }
          : null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        touchStart.current = null;
        const touch = event.changedTouches[0];
        if (!start || !touch || count < 2) return;
        if (
          event.target instanceof Element &&
          event.target.closest("input, select, textarea, button, a")
        )
          return;
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5)
          move(activeIndex + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="homepage-hero-images" aria-hidden="true">
        {slides.map((slide, slideIndex) => (
          <div
            key={slide.image}
            className={`homepage-hero-image${slideIndex === activeIndex ? " current" : ""}`}
          >
            {(slideIndex === 0 ||
              firstPhotoLoaded ||
              slideIndex === activeIndex ||
              visited.includes(slideIndex)) && (
              <Image
                src={slide.image}
                alt=""
                fill
                sizes="100vw"
                preload={slideIndex === 0}
                onLoad={
                  slideIndex === 0 ? () => setFirstPhotoLoaded(true) : undefined
                }
              />
            )}
          </div>
        ))}
      </div>
      <div className="container homepage-hero-inner">
        {children}
        {current && (
          <div className="homepage-hero-toolbar">
            <Link className="homepage-photo-link" href={current.href}>
              <span>On the market in {current.area}</span>
              <strong>{current.title}</strong>
              <ArrowUpRight size={18} />
            </Link>
            {count > 1 && (
              <div className="homepage-slider-settings">
                <label className="homepage-slider-speed">
                  <span>Slide speed</span>
                  <select
                    value={delay}
                    onChange={(event) => setDelay(Number(event.target.value))}
                  >
                    <option value={8000}>Normal · 8s</option>
                    <option value={12000}>Slow · 12s</option>
                    <option value={20000}>Very slow · 20s</option>
                  </select>
                </label>
                <div
                  className="homepage-slider-controls"
                  role="group"
                  aria-label="Property banner controls"
                >
                  <button
                    type="button"
                    onClick={() => move(activeIndex - 1)}
                    aria-label="Previous property photo"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <span
                    aria-live={stopped ? "polite" : "off"}
                    aria-atomic="true"
                  >
                    {activeIndex + 1} / {count}
                  </span>
                  <button
                    type="button"
                    onClick={() => move(activeIndex + 1)}
                    aria-label="Next property photo"
                  >
                    <ArrowRight size={18} />
                  </button>
                  <button
                    className="homepage-slider-play"
                    type="button"
                    onClick={() => {
                      if (stopped) {
                        setPlayRequested(true);
                        setPaused(false);
                      } else setPaused(true);
                    }}
                    aria-label={stopped ? "Start slideshow" : "Pause slideshow"}
                  >
                    {stopped ? <Play size={17} /> : <Pause size={17} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
