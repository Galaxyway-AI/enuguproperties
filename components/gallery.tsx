"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { Images, X, ChevronLeft, ChevronRight } from "lucide-react";
export function Gallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  return (
    <>
      <div className="detail-gallery">
        {images[0] ? (
          <Image
            src={images[0]}
            alt={title}
            fill
            priority
            sizes="(max-width: 650px) 100vw, 1200px"
          />
        ) : (
          <div className="no-image">No photographs available</div>
        )}
        {images.length > 0 && (
          <button
            className="button light"
            onClick={() => dialog.current?.showModal()}
          >
            <Images size={17} /> View {images.length}{" "}
            {images.length === 1 ? "photo" : "photos"}
          </button>
        )}
      </div>
      <dialog ref={dialog} className="modal" aria-label="Property photographs">
        <button
          type="button"
          className="modal-close"
          aria-label="Close gallery"
          onClick={() => dialog.current?.close()}
        >
          <span>Close</span>
          <X size={19} aria-hidden="true" />
        </button>
        <div className="modal-image">
          {images[index] && (
            <Image
              src={images[index]}
              alt={`${title}, photograph ${index + 1}`}
              fill
              sizes="90vw"
            />
          )}
        </div>
        <div className="form-actions">
          <button
            type="button"
            className="icon-button"
            aria-label="Previous photograph"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
          >
            <ChevronLeft />
          </button>
          <span>
            {index + 1} / {images.length}
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label="Next photograph"
            disabled={index === images.length - 1}
            onClick={() => setIndex(index + 1)}
          >
            <ChevronRight />
          </button>
        </div>
      </dialog>
    </>
  );
}
