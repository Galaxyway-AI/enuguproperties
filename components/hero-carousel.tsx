"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { HeroSlide } from "@/lib/hero-slides";

export function HeroCarousel({
  slides,
  children,
}: {
  slides: HeroSlide[];
  children: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [visited, setVisited] = useState<number[]>([0]);
  const [firstPhotoLoaded, setFirstPhotoLoaded] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const count = slides.length;
  const activeIndex = count ? index % count : 0;

  useEffect(() => {
    if (count < 2 || paused || hovered) return;
    const media = window.matchMedia(
      "(max-width: 650px), (prefers-reduced-motion: reduce)",
    );
    let timer: ReturnType<typeof setInterval> | undefined;
    const update = () => {
      clearInterval(timer);
      if (!media.matches && !document.hidden) {
        timer = setInterval(() => {
          setIndex((current) => (current + 1) % count);
        }, 8000);
      }
    };
    update();
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [count, paused, hovered]);

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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setPaused(true)}
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
                <span aria-live={paused ? "polite" : "off"} aria-atomic="true">
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
                  onClick={() => setPaused((value) => !value)}
                  aria-label={paused ? "Start slideshow" : "Pause slideshow"}
                >
                  {paused ? <Play size={17} /> : <Pause size={17} />}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
