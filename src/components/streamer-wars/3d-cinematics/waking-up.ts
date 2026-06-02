import * as THREE from "three";
import gsap from "gsap/dist/gsap";
import { playSound, playSoundWithReverb } from "@/consts/Sounds";
import type { Cinematic3DDefinition } from "./types";

function makePoint(scene: THREE.Scene, x: number, y: number, z: number, color: number, intensity: number, dist: number) {
  const l = new THREE.PointLight(color, intensity, dist, 2);
  l.position.set(x, y, z);
  scene.add(l);
  return l;
}

export const wakingUp: Cinematic3DDefinition = {
  id: "waking-up",

  setup(scene, camera, renderer, htmlRefs, playerNumber) {
    scene.background = new THREE.Color(0x020406);
    scene.fog = new THREE.FogExp2(0x040810, 0.028);

    camera.position.set(0.1, 0.28, 1.8);
    camera.rotation.order = "YXZ";
    camera.rotation.z = 0.38;
    camera.rotation.x = -0.04;
    camera.rotation.y = 0.05;

    // ── Lights ──────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x336644, 10.0);
    scene.add(ambient);

    const guardRim = new THREE.PointLight(0x55bb66, 3.0, 15, 2);
    guardRim.position.set(0, 3.5, -22);
    scene.add(guardRim);

    makePoint(scene, -3, 3.5, -4, 0x66dd77, 5.0, 35);
    makePoint(scene, 3, 3.5, -4, 0x66dd77, 5.0, 35);
    makePoint(scene, -3, 3.5, -14, 0x55bb66, 4.0, 35);
    makePoint(scene, 3, 3.5, -14, 0x55bb66, 4.0, 35);
    makePoint(scene, 0, 3.5, -24, 0x44aa55, 3.0, 35);
    makePoint(scene, 0, 3.5, -34, 0x338844, 2.5, 35);

    // Green accent lights — Streamer Wars reference
    makePoint(scene, -2.5, 1.5, -8, 0x44cc55, 1.5, 12);
    makePoint(scene, 2.5, 1.5, -8, 0x44cc55, 1.5, 12);
    makePoint(scene, 0, 1.5, -20, 0x44cc55, 1.5, 12);

    const redLight = new THREE.PointLight(0xff1500, 0, 22, 1.5);
    redLight.position.set(0, 4.5, -8);
    scene.add(redLight);
    const redLight2 = new THREE.PointLight(0xff2200, 0, 18, 1.5);
    redLight2.position.set(-4, 4, -4);
    scene.add(redLight2);
    const redLight3 = new THREE.PointLight(0xff1800, 0, 18, 1.5);
    redLight3.position.set(4, 4, -4);
    scene.add(redLight3);

    // ── Materials ───────────────────────────────────────────
    const matWall = new THREE.MeshStandardMaterial({ color: 0x141e28, roughness: 0.95, metalness: 0 });
    const matFloor = new THREE.MeshStandardMaterial({ color: 0x101820, roughness: 1 });
    const matMetal = new THREE.MeshStandardMaterial({ color: 0x1e2e3e, roughness: 0.45, metalness: 0.75 });
    const matGuard = new THREE.MeshStandardMaterial({ color: 0x060a0e, roughness: 0.65, metalness: 0.15 });
    const matMask = new THREE.MeshStandardMaterial({ color: 0x0c1318, roughness: 0.3, metalness: 0.55, emissive: 0x030608, emissiveIntensity: 0.5 });
    const matCircle = new THREE.MeshStandardMaterial({ color: 0x1a0505, emissive: 0x3a0808, emissiveIntensity: 1, roughness: 0.2 });
    const matMattress = new THREE.MeshStandardMaterial({ color: 0x161e24, roughness: 1 });
    const matStrip = new THREE.MeshStandardMaterial({ color: 0xaaeebb, emissive: 0x336644, emissiveIntensity: 1.2, roughness: 0.2 });

    const disposables: { geo: THREE.BufferGeometry; mat: THREE.Material }[] = [];
    const track = (m: THREE.Mesh) => disposables.push({ geo: m.geometry, mat: m.material });

    // ── Environment ─────────────────────────────────────────
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 70), matFloor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -22);
    floor.receiveShadow = true;
    scene.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(16, 70), matWall);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 3.9, -22);
    scene.add(ceiling);

    const wL = new THREE.Mesh(new THREE.PlaneGeometry(70, 4.5), matWall);
    wL.rotation.y = Math.PI / 2;
    wL.position.set(-7, 1.9, -22);
    scene.add(wL);
    const wR = new THREE.Mesh(new THREE.PlaneGeometry(70, 4.5), matWall);
    wR.rotation.y = -Math.PI / 2;
    wR.position.set(7, 1.9, -22);
    scene.add(wR);
    const wBack = new THREE.Mesh(new THREE.PlaneGeometry(16, 4.5), matWall);
    wBack.position.set(0, 1.9, -55);
    scene.add(wBack);
    const wFront = new THREE.Mesh(new THREE.PlaneGeometry(16, 4.5), matWall);
    wFront.rotation.y = Math.PI;
    wFront.position.set(0, 1.9, 8);
    scene.add(wFront);

    for (const m of [floor, ceiling, wL, wR, wBack, wFront]) track(m);

    // Ceiling strip lights geometry
    const stripPositions = [[-2.5, -3], [-2.5, -13], [2.5, -3], [2.5, -13], [0, -23], [0, -33]] as const;
    for (const [x, z] of stripPositions) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 1.4), matStrip);
      s.position.set(x, 3.88, z);
      scene.add(s);
      track(s);
    }

    // ── Bunk beds ──────────────────────────────────────────
    const makeBunk = (x: number, y: number, z: number) => {
      const g = new THREE.Group();
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.07, 0.9), matMetal);
      bed.position.y = 0;
      g.add(bed);
      track(bed);
      [-0.9, 0.9].forEach(dx =>
        [-0.4, 0.4].forEach(dz => {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 0.05), matMetal);
          leg.position.set(dx, -0.42, dz);
          g.add(leg);
          track(leg);
        })
      );
      const mat = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.07, 0.82), matMattress);
      mat.position.y = 0.07;
      g.add(mat);
      track(mat);
      g.position.set(x, y, z);
      return g;
    };

    for (let r = 0; r < 7; r++) {
      const z = -3 - r * 4.5;
      scene.add(makeBunk(-6, 0.85, z));
      scene.add(makeBunk(-6, 1.95, z));
      scene.add(makeBunk(6, 0.85, z));
      scene.add(makeBunk(6, 1.95, z));
    }

    // Support bars between bunks
    for (let r = 0; r < 7; r++) {
      const z = -3 - r * 4.5;
      for (const x of [-6, 6]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.9), matMetal);
        bar.position.set(x, 1.45, z);
        scene.add(bar);
        track(bar);
      }
    }

    // ── Guard ────────────────────────────────────────────────
    const guardGroup = new THREE.Group();
    const guardMeshes: THREE.Mesh[] = [];

    const gPart = (
      geo: THREE.BoxGeometry,
      mat: THREE.Material,
      px: number,
      py: number,
      pz: number,
      rx = 0,
      ry = 0,
      rz = 0,
    ) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(px, py, pz);
      m.rotation.set(rx, ry, rz);
      guardGroup.add(m);
      guardMeshes.push(m);
      track(m);
      return m;
    };

    gPart(new THREE.BoxGeometry(0.5, 0.6, 0.24), matGuard, 0, 0.93, 0); // torso
    gPart(new THREE.BoxGeometry(0.44, 0.24, 0.22), matGuard, 0, 0.6, 0); // hips
    gPart(new THREE.BoxGeometry(0.3, 0.32, 0.28), matGuard, 0, 1.38, 0); // head
    gPart(new THREE.BoxGeometry(0.32, 0.28, 0.06), matMask, 0, 1.38, 0.17); // mask
    const sym = new THREE.Mesh(new THREE.CircleGeometry(0.065, 16), matCircle);
    sym.position.set(0, 1.38, 0.21);
    guardGroup.add(sym);
    guardMeshes.push(sym);
    disposables.push({ geo: sym.geometry, mat: sym.material });

    const armL = gPart(new THREE.BoxGeometry(0.15, 0.52, 0.15), matGuard, -0.35, 0.86, 0);
    const armR = gPart(new THREE.BoxGeometry(0.15, 0.52, 0.15), matGuard, 0.35, 0.86, 0);
    gPart(new THREE.BoxGeometry(0.14, 0.18, 0.12), matGuard, -0.35, 0.56, 0); // hand L
    gPart(new THREE.BoxGeometry(0.14, 0.18, 0.12), matGuard, 0.35, 0.56, 0); // hand R
    const legL = gPart(new THREE.BoxGeometry(0.19, 0.58, 0.19), matGuard, -0.14, 0.29, 0);
    const legR = gPart(new THREE.BoxGeometry(0.19, 0.58, 0.19), matGuard, 0.14, 0.29, 0);
    gPart(new THREE.BoxGeometry(0.19, 0.1, 0.3), matGuard, -0.14, 0.03, 0.06); // foot L
    gPart(new THREE.BoxGeometry(0.19, 0.1, 0.3), matGuard, 0.14, 0.03, 0.06); // foot R

    guardGroup.position.set(0, 0, -32);
    scene.add(guardGroup);

    // ── Gas particles ────────────────────────────────────────
    const smokeCanvas = document.createElement("canvas");
    smokeCanvas.width = 128;
    smokeCanvas.height = 128;
    const sCtx = smokeCanvas.getContext("2d")!;
    const sg = sCtx.createRadialGradient(64, 64, 2, 64, 64, 64);
    sg.addColorStop(0, "rgba(160,215,190,0.55)");
    sg.addColorStop(0.35, "rgba(120,185,160,0.25)");
    sg.addColorStop(1, "rgba(80,150,130,0)");
    sCtx.fillStyle = sg;
    sCtx.fillRect(0, 0, 128, 128);
    const smokeTex = new THREE.CanvasTexture(smokeCanvas);

    const gasParticles: THREE.Sprite[] = [];
    const gasGroup = new THREE.Group();
    scene.add(gasGroup);

    const spawnGas = (side: number) => {
      const mat = new THREE.SpriteMaterial({
        map: smokeTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: new THREE.Color(0.08, 0.28, 0.22),
      });
      const sp = new THREE.Sprite(mat);
      const sc = 0.7 + Math.random() * 1.8;
      sp.scale.set(sc, sc, 1);
      sp.position.set(
        side * (6.5 + Math.random() * 1.5),
        Math.random() * 3.5,
        camera.position.z - 0.5 - Math.random() * 9,
      );
      sp.userData = {
        vx: -side * (0.006 + Math.random() * 0.01),
        vy: 0.003 + Math.random() * 0.005,
        life: 0,
        maxLife: 200 + Math.random() * 120,
      };
      gasGroup.add(sp);
      gasParticles.push(sp);
    };

    for (let i = 0; i < 40; i++) spawnGas(Math.random() > 0.5 ? 1 : -1);

    // ── State ──────────────────────────────────────────────
    const state: Record<string, any> = {
      breathPhase: 0,
      breathAmp: 0.002,
      alarmOn: false,
      alarmPhase: 0,
      gasActive: false,
      gasIntensity: 0,
      blur: 10,
      exposure: 5.0,
      chromaticShift: false,

      redLight,
      redLight2,
      redLight3,
      ambient,
      guardRim,
      guardGroup,
      armL,
      armR,
      legL,
      legR,
      gasGroup,
      gasParticles,
      smokeTex,
      spawnGas,
      camera,
      renderer,
      htmlRefs,
      scene,
      disposables,
    };

    // Set player number text
    if (htmlRefs.numberEl) {
      htmlRefs.numberEl.textContent = `PLAYER ${String(playerNumber).padStart(3, "0")}`;
    }

    // Preload sounds

    const soundPaths = [
      "scripts/3d/waking-up-bg",
      "scripts/3d/waking-heartbeat",
      "scripts/3d/waking-donde-estoy-2",
      "scripts/3d/waking-gas-2",
      "scripts/3d/waking-alarm2",
      "scripts/3d/waking-footsteps",
      "scripts/3d/waking-guardia-habla",
    ];

    // no es la forma más eficiente de cargar los sonidos pero es la más sencilla, y como son pocos no debería ser un gran problema
    soundPaths.forEach(path => playSound({ sound: path, volume: 0 }));

    // ── GSAP Timeline ──────────────────────────────────────
    const tl = gsap.timeline({ delay: 0.5 });

    // 0. BG Audio

    tl.call(() => { playSound({ sound: "scripts/3d/waking-up-bg", volume: 0.20, }); }, [], 0);

    // 1. Fade in
    tl.to(htmlRefs.overlayEl, { opacity: 0, duration: 5, ease: "power2.inOut" }, 0);
    tl.to(state, { blur: 10, duration: 0 }, 0);
    tl.to(state, { blur: 0.4, duration: 5.5, ease: "power3.out" }, 0.8);

    // Heartbeat ambient
    tl.call(() => { playSound({ sound: "scripts/3d/waking-heartbeat", volume: 0.3 }); }, [], 0);

    // 2. Camera wake up
    tl.to(camera.rotation, { z: 0.06, duration: 6, ease: "power2.inOut" }, 1.5);
    tl.to(camera.position, { y: 0.85, duration: 6, ease: "power2.out" }, 2);
    tl.to(camera.rotation, { x: -0.06, duration: 5, ease: "power2.inOut" }, 3);

    // 3. Breathing
    tl.to(state, { breathAmp: 0.0035, duration: 3, ease: "power1.in" }, 5);

    //tl.call(() => { playSound({ sound: "scripts/3d/waking-donde-estoy-2", volume: 0.25 }); }, [], 5);
    // Subtitle: first disoriented thought, after 2 seconds
    tl.call(() => { if (htmlRefs.subtitleEl) htmlRefs.subtitleEl.textContent = "¿Dónde... dónde estoy?"; }, [], 7);
    tl.set(htmlRefs.subtitleEl, { opacity: 1 }, 7);
    tl.set(htmlRefs.subtitleEl, { opacity: 0 }, 10);

    // 4. Guard rim visible + footsteps
    tl.to(guardRim, { intensity: 0.8, duration: 3, ease: "power2.inOut" }, 8);
    tl.to(guardGroup.position, { z: -24, duration: 5, ease: "power1.inOut" }, 8);
    tl.call(() => { playSound({ sound: "scripts/3d/waking-footsteps", volume: 0.5 }); }, [], 8);

    // Subtitle: someone approaches
    tl.call(() => { if (htmlRefs.subtitleEl) htmlRefs.subtitleEl.textContent = "Alguien viene..."; }, [], 9);
    tl.set(htmlRefs.subtitleEl, { opacity: 1 }, 9);
    tl.set(htmlRefs.subtitleEl, { opacity: 0 }, 12);

    // 5. Guard walks closer
    tl.to(guardGroup.position, { z: -9, duration: 8, ease: "power1.inOut" }, 13);

    // Subtitle: desperate
    tl.call(() => { if (htmlRefs.subtitleEl) htmlRefs.subtitleEl.textContent = "¡Aléjate!"; }, [], 14);
    tl.set(htmlRefs.subtitleEl, { opacity: 1 }, 14);
    tl.set(htmlRefs.subtitleEl, { opacity: 0 }, 17);

    // 6. RED ALARM
    tl.call(() => { state.alarmOn = true }, [], 20);
    tl.to(redLight, { intensity: 4.0, duration: 0.12, ease: "none" }, 20);
    tl.to(redLight2, { intensity: 2.5, duration: 0.12, ease: "none" }, 20);
    tl.to(redLight3, { intensity: 2.5, duration: 0.12, ease: "none" }, 20);
    tl.to(ambient, { intensity: 2.5, duration: 0.2, ease: "none" }, 20);
    tl.to(htmlRefs.numberEl, { color: "rgba(255,50,50,1)", duration: 0.2 }, 20);
    tl.to(camera.rotation, { z: 0.09, duration: 0.06, repeat: 7, yoyo: true, ease: "none" }, 20);

    // Alarm sound + subtitle
    tl.call(() => { playSoundWithReverb({ sound: "scripts/3d/waking-alarm2", volume: 0.2 }); }, [], 20);
    tl.call(() => { if (htmlRefs.subtitleEl) htmlRefs.subtitleEl.textContent = "¡¿Qué está pasando?!"; }, [], 20);
    tl.set(htmlRefs.subtitleEl, { opacity: 1 }, 20);
    tl.set(htmlRefs.subtitleEl, { opacity: 0 }, 21);

    // 7. Gas
    tl.call(() => { state.gasActive = true }, [], 22);
    tl.to(state, { gasIntensity: 1.0, duration: 9, ease: "power2.in" }, 22);
    tl.call(() => { playSound({ sound: "scripts/3d/waking-gas-2", volume: 0.15 }); }, [], 22);

    // 8. Blur increase
    tl.to(state, { blur: 1.5, duration: 0 }, 22);
    tl.to(state, { blur: 8, duration: 9, ease: "power2.in" }, 23);

    // 9. Chromatic shift
    tl.to(state, { chromaticShift: true, duration: 0 }, 24);

    // 10. Breathing slows + subtitle
    tl.to(state, { breathAmp: 0.008, duration: 3, ease: "power2.in" }, 23);
    tl.call(() => { if (htmlRefs.subtitleEl) htmlRefs.subtitleEl.textContent = "No puedo... respirar..."; }, [], 23);
    tl.set(htmlRefs.subtitleEl, { opacity: 1 }, 23);
    tl.to(state, { breathAmp: 0.0005, duration: 6, ease: "power3.in" }, 26);
    tl.set(htmlRefs.subtitleEl, { opacity: 0 }, 26);

    // 11. Pass out — camera tilts sideways
    tl.to(camera.rotation, { z: -0.7, duration: 8, ease: "power3.in" }, 25);
    tl.to(camera.position, { y: 0.2, duration: 8, ease: "power3.in" }, 25);
    tl.to(camera.rotation, { x: 0.2, duration: 8, ease: "power2.in" }, 25);

    // 12. Exposure drops
    tl.to(state, { exposure: 0.1, duration: 8, ease: "power3.in" }, 25);

    // 13. Fade to black + final subtitle
    tl.call(() => { playSoundWithReverb({ sound: "scripts/3d/waking-guardia-habla", volume: 1.2 }); }, [], 28);
    tl.to(htmlRefs.overlayEl, { opacity: 1, duration: 5.5, ease: "power3.in" }, 28);
    tl.call(() => { if (htmlRefs.subtitleEl) htmlRefs.subtitleEl.textContent = "(*guardia* ... todavía no es momento de despertar)"; }, [], 28);
    tl.set(htmlRefs.subtitleEl, { opacity: 1 }, 28);
    tl.set(htmlRefs.subtitleEl, { opacity: 0 }, 31);
    tl.to(htmlRefs.numberEl, { color: "rgba(255,50,50,0)", duration: 3, ease: "power2.in" }, 30);

    return { state, timeline: tl };
  },

  animate(dt, _time, state, _scene, camera) {
    const {
      guardGroup, armL, armR, legL, legR,
      redLight, redLight2, redLight3,
      gasGroup, gasParticles, spawnGas,
      htmlRefs, renderer,
    } = state;

    // Breathing
    state.breathPhase += dt * 0.75;
    camera.position.y += Math.sin(state.breathPhase) * state.breathAmp;

    // Guard idle sway + alarm animation
    if (guardGroup) {
      guardGroup.rotation.y = Math.sin(_time * 0.25) * 0.05;
      if (state.alarmOn) {
        armL.rotation.x = Math.sin(_time * 2) * 0.15;
        armR.rotation.x = -Math.sin(_time * 2) * 0.15;
        legL.rotation.x = Math.sin(_time * 2) * 0.1;
        legR.rotation.x = -Math.sin(_time * 2) * 0.1;
      }
    }

    // Alarm light flicker
    if (state.alarmOn) {
      state.alarmPhase += dt * 5.5;
      const p = 0.65 + 0.35 * Math.abs(Math.sin(state.alarmPhase));
      redLight.intensity = Math.max(0, redLight.intensity) * 0.96 + 4 * p * 0.04;
      redLight2.intensity = Math.max(0, redLight2.intensity) * 0.96 + 2.5 * p * 0.04;
      redLight3.intensity = Math.max(0, redLight3.intensity) * 0.96 + 2.5 * p * 0.04;
    }

    // Gas particles
    if (state.gasActive && Math.random() < state.gasIntensity * 4 * dt * 3) {
      spawnGas(Math.random() > 0.5 ? 1 : -1);
    }
    for (let i = gasParticles.length - 1; i >= 0; i--) {
      const sp = gasParticles[i];
      const d = sp.userData;
      d.life++;
      const t = d.life / d.maxLife;
      sp.position.x += d.vx;
      sp.position.y += d.vy * (1 - t * 0.4);
      let op = 0;
      if (t < 0.15) op = t / 0.15;
      else if (t < 0.7) op = 1;
      else op = 1 - (t - 0.7) / 0.3;
      (sp.material as THREE.SpriteMaterial).opacity = op * Math.min(state.gasIntensity, 1) * 0.32;
      if (d.life > d.maxLife) {
        gasGroup.remove(sp);
        (sp.material as THREE.SpriteMaterial).dispose();
        gasParticles.splice(i, 1);
      }
    }

    // Apply CSS filter (blur / chromatic shift)
    if (htmlRefs?.canvas) {
      htmlRefs.canvas.style.filter = state.chromaticShift
        ? "blur(0px) hue-rotate(8deg)"
        : `blur(${state.blur}px)`;
    }

    // Apply exposure
    if (renderer) {
      renderer.toneMappingExposure = state.exposure;
    }
  },

  cleanup(state) {
    const rafId = state._rafId;
    if (rafId != null) cancelAnimationFrame(rafId);

    const { scene, renderer, gasParticles, gasGroup, smokeTex, disposables } = state;
    if (!scene) return;

    // Dispose gas particle materials
    if (gasParticles) {
      for (const sp of gasParticles) {
        (sp.material as THREE.SpriteMaterial).dispose();
      }
    }
    if (gasGroup) {
      scene.remove(gasGroup);
    }

    // Dispose tracked geometries & materials
    if (disposables) {
      for (const { geo, mat } of disposables) {
        geo.dispose();
        mat.dispose();
      }
    }

    // Remove all scene children
    while (scene.children.length > 0) {
      const child = scene.children[0];
      if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
        scene.remove(child);
      } else {
        scene.remove(child);
      }
    }

    if (smokeTex) smokeTex.dispose();
    if (renderer) renderer.dispose();
  },
};
