import { useState } from "react";
import type { SceneKind } from "@shared/trip";
import { photoUrl } from "../lib/photos";
import { Scene } from "./Scene";

interface Props {
  /** Key into PHOTOS, normally the activity id. */
  /** Requested width in pixels; hero images ask for more. */
  width?: number;
  id: string;
  alt: string;
  scene: SceneKind;
  tone?: number;
  className?: string;
  eager?: boolean;
}

/**
 * A photograph with a built-in fallback: the illustrated scene sits underneath, shows while the
 * photo loads, and stays if the photo is missing or fails to load.
 */
export function Photo({ id, alt, scene, tone, className = "", eager, width }: Props) {
  const src = photoUrl(id, width);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showImg = Boolean(src) && !failed;
  return (
    <div className={`relative overflow-hidden bg-forest-900 ${className}`} role={showImg ? undefined : "img"} aria-label={showImg ? undefined : alt}>
      <Scene kind={scene} tone={tone} id={id} />
      {showImg && (
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
