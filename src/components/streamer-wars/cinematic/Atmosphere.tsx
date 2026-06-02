import { type Atmosphere } from "./types";

interface AtmosphereProps {
  type: Atmosphere;
}

export const Atmosphere = ({ type }: AtmosphereProps) => {
  if (type === "none") return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-1">
      {type === "scanlines" && <Scanlines />}
      {type === "vignette" && <Vignette />}
      {type === "noise" && <Noise />}
    </div>
  );
};

const Scanlines = () => (
  <div
    className="absolute inset-0 opacity-20"
    style={{
      backgroundImage:
        "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.25) 3px, rgba(0,0,0,0.25) 4px)",
      backgroundSize: "100% 4px",
    }}
  />
);

const Vignette = () => (
  <div
    className="absolute inset-0"
    style={{
      background: "radial-gradient(circle, transparent 50%, rgba(0,0,0,0.6) 100%)",
    }}
  />
);

const Noise = () => {
  const filterId = "noise-atmosphere";
  return (
    <div className="absolute inset-0 opacity-[0.035] mix-blend-screen">
      <svg className="size-full" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <filter id={filterId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>
    </div>
  );
};
