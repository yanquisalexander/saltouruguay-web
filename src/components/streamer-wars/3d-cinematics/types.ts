import * as THREE from "three";
import type gsap from "gsap";

export interface Cinematic3DHTMLRefs {
  overlayEl: HTMLDivElement | null;
  numberEl: HTMLDivElement | null;
  canvas: HTMLCanvasElement | null;
  subtitleEl: HTMLDivElement | null;
}

export interface Cinematic3DSetupResult {
  state: Record<string, any>;
  timeline: gsap.core.Timeline;
}

export interface Cinematic3DDefinition {
  id: string;
  setup: (
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    htmlRefs: Cinematic3DHTMLRefs,
    playerNumber: number
  ) => Cinematic3DSetupResult;
  animate: (
    dt: number,
    time: number,
    state: Record<string, any>,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera
  ) => void;
  cleanup: (state: Record<string, any>) => void;
}
