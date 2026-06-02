import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import gsap from "gsap/dist/gsap";
import type { Cinematic3DDefinition } from "./types";

function makeBox(w: number, h: number, d: number, mat: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

function makeCyl(rt: number, rb: number, h: number, seg: number, mat: THREE.Material) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
}

function createGasSystem(parentScene: THREE.Scene, options: {
  count?: number;
  color?: THREE.Color;
  opacity?: number;
  spreadX?: number;
  spreadZ?: number;
  spreadY?: number;
  spawnSide?: boolean;
} = {}) {
  const {
    count = 60,
    color = new THREE.Color(0.07, 0.25, 0.2),
    opacity = 0.28,
    spreadX = 8,
    spreadZ = 12,
    spreadY = 4,
    spawnSide = true,
  } = options;

  const sc = document.createElement("canvas");
  sc.width = sc.height = 128;
  const sx = sc.getContext("2d")!;
  const sg = sx.createRadialGradient(64, 64, 2, 64, 64, 64);
  sg.addColorStop(0, "rgba(200,240,220,0.55)");
  sg.addColorStop(0.4, "rgba(150,210,185,0.22)");
  sg.addColorStop(1, "rgba(80,160,140,0)");
  sx.fillStyle = sg;
  sx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(sc);

  const group = new THREE.Group();
  const particles: THREE.Sprite[] = [];
  let intensity = 0;

  const spawn = (forced: boolean) => {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: color.clone(),
    });
    const sp = new THREE.Sprite(mat);
    const scale = 0.8 + Math.random() * 2.2;
    sp.scale.set(scale, scale, 1);

    let px: number;
    let pz: number;
    if (spawnSide) {
      const side = Math.random() > 0.5 ? 1 : -1;
      px = side * (spreadX * 0.85 + Math.random() * spreadX * 0.15);
      pz = (Math.random() - 0.5) * spreadZ * 2;
    } else {
      px = (Math.random() - 0.5) * spreadX * 2;
      pz = (Math.random() - 0.5) * spreadZ * 2;
    }
    sp.position.set(px, Math.random() * spreadY, pz);

    const side = px > 0 ? -1 : 1;
    sp.userData = {
      vx: side * (0.005 + Math.random() * 0.012),
      vy: 0.002 + Math.random() * 0.006,
      vz: (Math.random() - 0.5) * 0.006,
      life: forced ? Math.random() * 120 : 0,
      maxLife: 180 + Math.random() * 150,
      maxOpacity: opacity * (0.6 + Math.random() * 0.4),
    };
    group.add(sp);
    particles.push(sp);
  };

  for (let i = 0; i < count * 0.6; i++) spawn(true);

  const update = (dt: number) => {
    if (intensity > 0 && Math.random() < intensity * 3 * dt) spawn(false);

    for (let i = particles.length - 1; i >= 0; i--) {
      const sp = particles[i];
      const d = sp.userData;
      d.life += 60 * dt;
      const t = d.life / d.maxLife;

      sp.position.x += d.vx;
      sp.position.y += d.vy * (1 - t * 0.5);
      sp.position.z += d.vz;

      let op = 0;
      if (t < 0.12) op = t / 0.12;
      else if (t < 0.72) op = 1;
      else op = 1 - (t - 0.72) / 0.28;
      (sp.material as THREE.SpriteMaterial).opacity = op * Math.min(intensity, 1) * d.maxOpacity;

      if (d.life > d.maxLife) {
        group.remove(sp);
        (sp.material as THREE.SpriteMaterial).dispose();
        particles.splice(i, 1);
      }
    }
  };

  parentScene.add(group);
  return {
    group,
    particles,
    update,
    setIntensity: (v: number) => { intensity = v; },
    getIntensity: () => intensity,
  };
}

export const playersInvite: Cinematic3DDefinition = {
  id: "players-invite",

  setup(scene, camera, renderer, htmlRefs, playerNumber) {
    scene.background = new THREE.Color(0x05080f);
    scene.fog = new THREE.FogExp2(0x141a24, 0.014);

    // ── Starry sky HDRI (async, best-effort) ───────────────
    const pmremGen = new THREE.PMREMGenerator(renderer);
    pmremGen.compileEquirectangularShader();
    new EXRLoader().load(
      "https://cdn.saltouruguayserver.com/guerra-streamers/3d-models/cielo_estrellado_v2.exr",
      (exrTex) => {
        exrTex.mapping = THREE.EquirectangularReflectionMapping;
        const envMap = pmremGen.fromEquirectangular(exrTex).texture;
        scene.background = exrTex;
        scene.environment = envMap;
        scene.environmentIntensity = 1.2;
        pmremGen.dispose();
      },
      undefined,
      () => { scene.background = new THREE.Color(0x06090f); },
    );

    camera.fov = 68;
    camera.rotation.order = "YXZ";
    camera.updateProjectionMatrix();

    const disposables: { geo: THREE.BufferGeometry; mat: THREE.Material }[] = [];
    const track = (m: THREE.Mesh) => disposables.push({ geo: m.geometry, mat: m.material });

    // ── Lighting ────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x4a5a7a, 10.0);
    scene.add(ambient);

    const makeP = (x: number, y: number, z: number, c: number, i: number, d: number) => {
      const l = new THREE.PointLight(c, i, d, 2);
      l.position.set(x, y, z);
      scene.add(l);
      return l;
    };
    const streetLamp1 = makeP(4, 7, -2, 0xff9030, 18.0, 50);
    const streetLamp2 = makeP(-5, 7, -18, 0xff8820, 14.0, 45);
    makeP(-8, 5, -8, 0xffcc60, 8.0, 30);
    makeP(9, 4, -14, 0xffaa40, 6.5, 28);
    makeP(-10, 3, -10, 0x4060c0, 4.5, 30);
    makeP(2, 0.5, 0, 0xff7010, 3.0, 20);

    const headlightL = new THREE.PointLight(0xc8e0ff, 0, 50, 1.2);
    headlightL.position.set(-0.8, 1.2, 2.8);
    const headlightR = new THREE.PointLight(0xc8e0ff, 0, 50, 1.2);
    headlightR.position.set(0.8, 1.2, 2.8);

    const interiorRed = new THREE.PointLight(0xff2020, 0, 8, 2);
    interiorRed.position.set(0, 1.5, 0.5);

    const gasLight = new THREE.PointLight(0x20ff80, 0, 6, 2);
    gasLight.position.set(0, 1.2, 1.0);

    // ── Street ──────────────────────────────────────────────
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.75, metalness: 0.2 });
    const ground = makeBox(40, 0.1, 80, groundMat);
    ground.position.set(0, -0.05, -10);
    scene.add(ground);
    track(ground);

    const markMat = new THREE.MeshStandardMaterial({ color: 0x1a1c18, roughness: 1.0 });
    for (let i = -3; i < 5; i++) {
      const mark = makeBox(0.15, 0.02, 2.5, markMat);
      mark.position.set(0, 0.02, i * 5);
      scene.add(mark);
      track(mark);
    }

    const sideMat = new THREE.MeshStandardMaterial({ color: 0x0e1014, roughness: 0.95 });
    const sidewalk = makeBox(4, 0.15, 80, sideMat);
    sidewalk.position.set(6, 0.07, -10);
    scene.add(sidewalk);
    track(sidewalk);

    const sidewalkL = makeBox(4, 0.15, 80, sideMat);
    sidewalkL.position.set(-10, 0.07, -10);
    scene.add(sidewalkL);
    track(sidewalkL);

    const curb = makeBox(0.12, 0.12, 80, new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.9 }));
    curb.position.set(4.1, 0.06, -10);
    scene.add(curb);
    track(curb);

    // ── Lampposts ──────────────────────────────────────────
    const addLampPost = (x: number, z: number) => {
      const mat = new THREE.MeshStandardMaterial({ color: 0x1a1e22, roughness: 0.5, metalness: 0.8 });
      const post = makeCyl(0.06, 0.08, 8, 6, mat);
      post.position.set(x, 4, z);
      scene.add(post);
      track(post);
      const arm = makeBox(1.2, 0.07, 0.07, mat);
      arm.position.set(x - 0.6, 7.9, z);
      scene.add(arm);
      track(arm);
      const head = makeBox(0.6, 0.2, 0.6, new THREE.MeshStandardMaterial({ color: 0x2a2e32, roughness: 0.4 }));
      head.position.set(x - 1.1, 7.8, z);
      scene.add(head);
      track(head);
      const glowMat = new THREE.MeshStandardMaterial({ emissive: 0xff9900, emissiveIntensity: 5.0, color: 0x201000 });
      const glowGeo = new THREE.SphereGeometry(0.18, 8, 8);
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(x - 1.1, 7.6, z);
      scene.add(glow);
      disposables.push({ geo: glowGeo, mat: glowMat });
    };
    addLampPost(5, -2);
    addLampPost(-6, -18);

    // ── Buildings ──────────────────────────────────────────
    const bldMat = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 });
    const bld1 = makeBox(8, 18, 20, bldMat(0x0a0c10));
    bld1.position.set(12, 9, -12);
    scene.add(bld1);
    track(bld1);
    const bld2 = makeBox(6, 12, 16, bldMat(0x0c0e12));
    bld2.position.set(18, 6, -5);
    scene.add(bld2);
    track(bld2);
    const bld3 = makeBox(10, 22, 18, bldMat(0x090b0f));
    bld3.position.set(14, 11, -28);
    scene.add(bld3);
    track(bld3);
    const bld4 = makeBox(9, 14, 22, bldMat(0x0b0d11));
    bld4.position.set(-16, 7, -10);
    scene.add(bld4);
    track(bld4);
    const bld5 = makeBox(7, 20, 16, bldMat(0x090b0e));
    bld5.position.set(-20, 10, -25);
    scene.add(bld5);
    track(bld5);

    // Building windows
    const winMats = [
      new THREE.MeshStandardMaterial({ emissive: 0xffcc60, emissiveIntensity: 1.8, color: 0x100800 }),
      new THREE.MeshStandardMaterial({ emissive: 0x6080ff, emissiveIntensity: 1.5, color: 0x000820 }),
      new THREE.MeshStandardMaterial({ emissive: 0xffffff, emissiveIntensity: 0.5, color: 0x101010 }),
    ];
    const addWindows = (bldX: number, bldY: number, bldZ: number, cols: number, rows: number, spacing: number, side: number) => {
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (Math.random() < 0.35) continue;
          const mat = winMats[Math.random() < 0.15 ? 1 : Math.random() < 0.1 ? 2 : 0].clone();
          mat.emissiveIntensity *= 0.6 + Math.random() * 0.8;
          const winGeo = new THREE.PlaneGeometry(0.55, 0.7);
          const w = new THREE.Mesh(winGeo, mat);
          w.position.set(bldX + (c - cols / 2 + 0.5) * spacing, bldY - 2 + r * spacing * 1.3, bldZ + side * 0.05);
          w.rotation.y = side > 0 ? 0 : Math.PI;
          scene.add(w);
          disposables.push({ geo: winGeo, mat });
        }
      }
    };
    addWindows(12, 9, -2.1, 3, 6, 2.0, -1);
    addWindows(-16, 7, 1.1, 4, 5, 1.8, 1);
    addWindows(14, 11, -19.1, 4, 7, 1.9, -1);

    // Dumpster
    const dumpster = makeBox(1.2, 0.9, 0.6, new THREE.MeshStandardMaterial({ color: 0x0a1208, roughness: 0.9, metalness: 0.4 }));
    dumpster.position.set(7.5, 0.45, 0.5);
    scene.add(dumpster);
    track(dumpster);

    // ── Van ─────────────────────────────────────────────────
    const vanGroup = new THREE.Group();
    vanGroup.position.set(1.0, 0, -35);
    scene.add(vanGroup);

    headlightL.position.set(-0.8, 1.2, 2.8);
    headlightR.position.set(0.8, 1.2, 2.8);
    vanGroup.add(headlightL);
    vanGroup.add(headlightR);
    interiorRed.position.set(0, 1.5, 0.5);
    vanGroup.add(interiorRed);
    gasLight.position.set(0, 1.2, 1.0);
    vanGroup.add(gasLight);

    let vanLoaded = false;
    let vanMixer: THREE.AnimationMixer | null = null;
    let passengerDoorAction: THREE.AnimationAction | null = null;

    // ── Seated Guard ──────────────────────────────────────
    function createSeatedGuard() {
      const g = new THREE.Group();
      const suitMat = new THREE.MeshStandardMaterial({ color: 0x39ff14, roughness: 0.65, metalness: 0.15 });
      const maskMat = new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.3, metalness: 0.55, emissive: 0x060a0f, emissiveIntensity: 0.5 });
      const symMat = new THREE.MeshStandardMaterial({ color: 0x101418, emissive: 0x1a2030, emissiveIntensity: 0.8, roughness: 0.2 });

      const torso = makeBox(0.48, 0.5, 0.28, suitMat);
      torso.position.set(0, 0.55, -0.05);
      g.add(torso);
      track(torso);

      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.9, 0);
      const head = makeBox(0.28, 0.3, 0.26, suitMat);
      head.position.y = 0;
      headGroup.add(head);
      track(head);
      const mask = makeBox(0.30, 0.25, 0.05, maskMat);
      mask.position.set(0, 0, 0.16);
      headGroup.add(mask);
      track(mask);
      const tri = new THREE.Shape();
      const pts = [new THREE.Vector2(0, 0.07), new THREE.Vector2(-0.06, -0.04), new THREE.Vector2(0.06, -0.04)];
      tri.setFromPoints(pts);
      const sym = new THREE.Mesh(new THREE.ShapeGeometry(tri), symMat);
      sym.position.set(0, 0, 0.19);
      headGroup.add(sym);
      disposables.push({ geo: sym.geometry, mat: symMat });
      g.add(headGroup);
      g.userData.headYaw = headGroup;

      const armL = makeBox(0.14, 0.4, 0.14, suitMat);
      armL.position.set(-0.36, 0.38, 0.05);
      g.add(armL);
      track(armL);
      const armR = makeBox(0.14, 0.4, 0.14, suitMat);
      armR.position.set(0.36, 0.38, 0.05);
      g.add(armR);
      track(armR);
      const legL = makeBox(0.16, 0.15, 0.35, suitMat);
      legL.position.set(-0.15, 0.08, 0.2);
      g.add(legL);
      track(legL);
      const legR = makeBox(0.16, 0.15, 0.35, suitMat);
      legR.position.set(0.15, 0.08, 0.2);
      g.add(legR);
      track(legR);
      return g;
    }

    const guard = createSeatedGuard();
    guard.scale.setScalar(0.60);
    guard.position.set(-0.7, 0.3, 0.7);
    vanGroup.add(guard);

    // Load van GLB
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      "https://cdn.saltouruguayserver.com/guerra-streamers/3d-models/camioneta.glb",
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const scaleVal = 5.5 / Math.max(size.x, size.z);
        model.scale.setScalar(scaleVal);
        const box2 = new THREE.Box3().setFromObject(model);
        model.position.y = -box2.min.y;
        model.traverse(child => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
            if (m.material) {
              const mats = Array.isArray(m.material) ? m.material : [m.material];
              mats.forEach((mat: THREE.Material) => {
                if ((mat as THREE.MeshStandardMaterial).color) (mat as THREE.MeshStandardMaterial).color.multiplyScalar(0.4);
                if ((mat as THREE.MeshStandardMaterial).emissiveIntensity) (mat as THREE.MeshStandardMaterial).emissiveIntensity *= 0.5;
              });
            }
          }
        });
        vanGroup.add(model);
        vanGroup.updateMatrixWorld(true);

        const guardDoor = model.getObjectByName("Porte_avnt_1");
        if (guardDoor && guard) {
          const doorPos = new THREE.Vector3();
          guardDoor.getWorldPosition(doorPos);
          vanGroup.worldToLocal(doorPos);
          guard.position.set(doorPos.x - 0.4, 1, 0.6);
        }

        vanMixer = new THREE.AnimationMixer(model);
        const playerDoorClip = gltf.animations.find(c =>
          c.tracks.some(t => t.name === "Porte_avnt_2.quaternion")
        );
        if (playerDoorClip) {
          passengerDoorAction = vanMixer.clipAction(playerDoorClip);
          passengerDoorAction.setLoop(THREE.LoopOnce);
          passengerDoorAction.clampWhenFinished = true;
        } else {
          const fallbackClip = gltf.animations.find(c =>
            c.tracks.some(t => t.name === "Porte_avnt_1.quaternion")
          );
          if (fallbackClip) {
            passengerDoorAction = vanMixer.clipAction(fallbackClip);
            passengerDoorAction.setLoop(THREE.LoopOnce);
            passengerDoorAction.clampWhenFinished = true;
          }
        }
        vanLoaded = true;
      },
      undefined,
      () => {
        const fallback = makeBox(2.2, 2.0, 5.5, new THREE.MeshStandardMaterial({ color: 0x0a0c0e, roughness: 0.6, metalness: 0.5 }));
        fallback.position.y = 1.0;
        vanGroup.add(fallback);
        track(fallback);
        vanLoaded = true;
      },
    );

    // ── Gas System ──────────────────────────────────────────
    const gas = createGasSystem(scene, {
      count: 50, color: new THREE.Color(0.07, 0.25, 0.20),
      opacity: 0.35, spreadX: 2.5, spreadZ: 3.5, spreadY: 2.5, spawnSide: false,
    });
    gas.setIntensity(0);

    // ── First-person Camera State ─────────────────────────
    const VX = 1.0;
    const fpCam = {
      bx: -0.5, by: 1.68, bz: 1.0,
      hx: -0.5, hy: 1.68, hz: 1.0,
      hvx: 0, hvy: 0, hvz: 0,
      gx: 4, gy: 1.5, gz: -14,
      ax: 4, ay: 1.5, az: -14,
      avx: 0, avy: 0, avz: 0,
      roll: 0, rollTarget: 0, rollV: 0,
      bp: 0, ba: 0.007,
      wobbleAmp: 0, wobblePhase: 0,
      blur: 0,
      exposure: 2.2,
    };
    const gasState = { level: 0 };

    // ── State ──────────────────────────────────────────────
    const state: Record<string, any> = {
      s0time: 0,
      fpCam,
      gasState,
      gas,
      vanGroup,
      vanMixer,
      passengerDoorAction,
      guard,
      streetLamp1,
      streetLamp2,
      interiorRed,
      headlightL,
      headlightR,
      gasLight,
      VX,
      camera,
      renderer,
      scene,
      htmlRefs,
      disposables,
    };

    if (htmlRefs.numberEl) {
      htmlRefs.numberEl.textContent = `PLAYER ${String(playerNumber).padStart(3, "0")}`;
    }

    // ── GSAP Timeline ──────────────────────────────────────
    const tl = gsap.timeline({ delay: 0.5 });

    // Phase 1: WAITING (0s - 7s)
    tl.to(htmlRefs.overlayEl, { opacity: 0, duration: 3.5, ease: "power2.inOut" }, 0);

    tl.to(fpCam, { gx: 1.5, gz: -14, gy: 1.6, duration: 2.5, ease: "power2.inOut" }, 1.5);
    tl.to(fpCam, { gx: 3, gz: -18, gy: 1.8, duration: 3, ease: "power2.inOut" }, 4);

    // Phase 2: DETECTING THE VAN (7s - 12s)
    tl.to(fpCam, { rollTarget: 0.015, duration: 0.3, ease: "power1.out" }, 7.2);
    tl.to(fpCam, { rollTarget: 0, duration: 0.6, ease: "power2.inOut" }, 7.5);
    tl.to(fpCam, { bx: -0.35, duration: 1.5, ease: "power2.inOut" }, 7.5);
    tl.to(fpCam, { gx: 7, gz: -2, gy: 1.3, duration: 2.5, ease: "power2.inOut" }, 7.8);
    tl.to(fpCam, { gx: 5.5, gz: 1, gy: 1.4, duration: 1.2, ease: "power2.out" }, 10.5);

    // Phase 3: THE VAN ARRIVES (12s - 19s)
    tl.to(vanGroup.position, { z: 0, duration: 6.5, ease: "power2.inOut" }, 12);
    tl.to(vanGroup.position, { z: -0.3, duration: 0.3, ease: "power2.out" }, 18.5);
    tl.to(vanGroup.position, { z: 0, y: -0.06, duration: 0.15, ease: "power3.out" }, 18.8);
    tl.to(vanGroup.position, { y: 0, duration: 0.4, ease: "power2.in" }, 18.95);

    tl.to(headlightL, { intensity: 8.0, duration: 0.5, ease: "power2.in" }, 13.5);
    tl.to(headlightR, { intensity: 8.0, duration: 0.5, ease: "power2.in" }, 13.5);

    tl.to(fpCam, { bx: -0.9, gx: 1, gz: 1, gy: 1.3, duration: 3, ease: "power2.inOut" }, 12);
    tl.to(fpCam, { bx: -0.5, duration: 1.8, ease: "power2.inOut" }, 15.5);
    tl.to(fpCam, { bx: -0.7, by: 1.7, duration: 1.5, ease: "power2.out" }, 16);
    tl.to(fpCam, { bx: -0.5, by: 1.68, duration: 1, ease: "power1.in" }, 17.5);
    tl.to(fpCam, { gx: 0.8, gz: 0, gy: 1.2, duration: 2, ease: "power2.out" }, 17);

    // Phase 4: DOOR OPENS (19s - 24s)
    tl.call(() => { if (passengerDoorAction) passengerDoorAction.play(); }, [], 19.5);
    tl.to(interiorRed, { intensity: 1.8, duration: 0.4, ease: "power2.out" }, 19.8);
    tl.to(interiorRed, { intensity: 0.6, duration: 0.15, ease: "none" }, 20.2);
    tl.to(interiorRed, { intensity: 2.0, duration: 0.3, ease: "power2.out" }, 20.4);

    tl.to(fpCam, { bx: -0.55, by: 1.7, rollTarget: 0.02, duration: 0.12, ease: "power3.out" }, 19.5);
    tl.to(fpCam, { bx: -0.5, by: 1.68, rollTarget: 0, duration: 0.4, ease: "power2.in" }, 19.62);

    tl.to(guard.userData.headYaw.rotation, { y: -0.6, duration: 2.5, ease: "power2.inOut" }, 21);
    tl.to(fpCam, { gx: 1.7, gz: 1.0, gy: 1.3, duration: 2, ease: "power2.inOut" }, 21.5);

    // Phase 5: ENTERING THE VAN (24s - 30s)
    tl.to(fpCam, { bx: -0.45, duration: 0.6, ease: "sine.inOut" }, 24);
    tl.to(fpCam, { bx: -0.55, duration: 0.6, ease: "sine.inOut" }, 24.6);
    tl.to(fpCam, { bx: 0.0, by: 1.5, duration: 1.2, ease: "power2.inOut" }, 25.2);
    tl.to(fpCam, { gx: 0.8, gz: 1.5, gy: 1.0, duration: 1, ease: "power2.in" }, 25.2);
    tl.to(fpCam, { gx: 2.0, gz: 1.2, gy: 0.9, duration: 0.8, ease: "power2.inOut" }, 26.2);
    tl.to(fpCam, { bx: 0.35, by: 1.2, bz: 1.4, rollTarget: 0.08, duration: 0.8, ease: "power2.inOut" }, 26.5);
    tl.to(fpCam, { bx: 0.55, by: 1.55, bz: 0.7, rollTarget: 0, duration: 1.2, ease: "power2.inOut" }, 27.3);
    tl.to(fpCam, { by: 1.60, duration: 0.3, ease: "sine.inOut" }, 28.5);
    tl.to(fpCam, { by: 1.50, duration: 0.3, ease: "sine.inOut" }, 28.8);
    tl.to(fpCam, { bx: 0.55, by: 1.55, bz: 0.7, rollTarget: 0.01, duration: 0.5, ease: "power2.out" }, 29.1);
    tl.to(fpCam, { gx: 1.5, gz: 6, gy: 1.2, duration: 2, ease: "power2.inOut" }, 29);
    tl.to(guard.userData.headYaw.rotation, { y: 0, duration: 3, ease: "power2.inOut" }, 31);
    tl.call(() => {
      if (passengerDoorAction) {
        const clip = passengerDoorAction.getClip();
        passengerDoorAction.stop();
        passengerDoorAction.timeScale = -0.8;
        passengerDoorAction.time = clip.duration;
        passengerDoorAction.clampWhenFinished = true;
        passengerDoorAction.play();
      }
    }, [], 30.5);

    // Phase 6: INSIDE THE VAN (30s - 36s)
    tl.to(fpCam, { ba: 0.014, duration: 2, ease: "power2.in" }, 31);
    tl.to(interiorRed, { intensity: 2.5, duration: 2, ease: "power2.in" }, 32);
    tl.to(gasState, {
      level: 0.4, duration: 1.5, ease: "power2.in",
      onUpdate: function () { gas.setIntensity(this.targets()[0].level); },
    }, 33);

    // Phase 7: LOSING CONSCIOUSNESS (36s - 46s)
    tl.to(fpCam, { blur: 0.4, duration: 2, ease: "power2.in" }, 36);
    tl.to(gasLight, { intensity: 3.5, duration: 3, ease: "power2.in" }, 36);
    tl.to(gasState, {
      level: 0.85, duration: 3, ease: "power2.in",
      onUpdate: function () { gas.setIntensity(this.targets()[0].level); },
    }, 36);
    tl.to(fpCam, { ba: 0.025, duration: 2, ease: "power2.in" }, 37);
    tl.to(fpCam, { blur: 0.8, duration: 2, ease: "power2.in" }, 38);
    tl.to(fpCam, { exposure: 0.6, duration: 3, ease: "power3.in" }, 38.5);
    tl.to(fpCam, { wobbleAmp: 0.04, duration: 3, ease: "power2.in" }, 39);
    tl.to(fpCam, { by: 1.0, duration: 3, ease: "power3.in" }, 39);
    tl.to(fpCam, { blur: 2.0, duration: 2.5, ease: "power2.in" }, 40);
    tl.to(fpCam, { exposure: 0.3, duration: 2.5, ease: "power3.in" }, 41);
    tl.to(fpCam, { by: 1.0, duration: 3, ease: "power3.in" }, 41.5);
    tl.to(fpCam, { blur: 4.5, duration: 2, ease: "power2.in" }, 42.5);
    tl.to(fpCam, { exposure: 0.05, duration: 3, ease: "power3.in" }, 43);
    tl.to(htmlRefs.overlayEl, { opacity: 1, duration: 3, ease: "power3.in" }, 43);

    return { state, timeline: tl };
  },

  animate(dt, _time, state, _scene, camera) {
    const { fpCam, gas, vanGroup, vanMixer, streetLamp1, streetLamp2, htmlRefs, renderer } = state;
    if (!fpCam) return;

    state.s0time += dt;

    // Van animation mixer
    if (vanMixer) vanMixer.update(dt);

    // Spring physics: head position
    const k = 5.5, d = 3.2;
    fpCam.hvx += (fpCam.bx - fpCam.hx) * k * dt - fpCam.hvx * d * dt;
    fpCam.hvz += (fpCam.bz - fpCam.hz) * k * dt - fpCam.hvz * d * dt;
    fpCam.hvy += (fpCam.by - fpCam.hy) * k * dt - fpCam.hvy * d * dt;
    fpCam.hx += fpCam.hvx * dt;
    fpCam.hz += fpCam.hvz * dt;
    fpCam.hy += fpCam.hvy * dt;

    // Spring physics: gaze
    const gk = 4.0, gd = 2.8;
    fpCam.avx += (fpCam.gx - fpCam.ax) * gk * dt - fpCam.avx * gd * dt;
    fpCam.avy += (fpCam.gy - fpCam.ay) * gk * dt - fpCam.avy * gd * dt;
    fpCam.avz += (fpCam.gz - fpCam.az) * gk * dt - fpCam.avz * gd * dt;
    fpCam.ax += fpCam.avx * dt;
    fpCam.ay += fpCam.avy * dt;
    fpCam.az += fpCam.avz * dt;

    // Spring physics: roll
    const rk = 4.5, rd = 3.0;
    fpCam.rollV += (fpCam.rollTarget - fpCam.roll) * rk * dt - fpCam.rollV * rd * dt;
    fpCam.roll += fpCam.rollV * dt;

    // Breathing
    fpCam.bp += dt * 1.2;
    const by = Math.sin(fpCam.bp) * fpCam.ba;
    const bx = Math.sin(fpCam.bp * 0.7) * fpCam.ba * 0.3;

    // Wobble
    fpCam.wobblePhase += dt * 2.5;
    const wx = Math.sin(fpCam.wobblePhase) * fpCam.wobbleAmp;
    const wz = Math.cos(fpCam.wobblePhase * 0.7) * fpCam.wobbleAmp * 0.5;

    // Lamp flicker
    const flicker = 6.0 + Math.sin(state.s0time * 17.3) * 0.12 + Math.sin(state.s0time * 5.1) * 0.18;
    if (streetLamp1) streetLamp1.intensity = flicker;
    if (streetLamp2) streetLamp2.intensity = flicker * 0.75;

    // Gas follows van
    if (gas && vanGroup) {
      gas.group.position.copy(vanGroup.position);
      gas.group.position.y += 1.2;
    }

    // Apply camera
    camera.position.set(
      fpCam.hx + bx + wx,
      fpCam.hy + by,
      fpCam.hz + wz,
    );
    camera.rotation.order = "YXZ";
    camera.rotation.z = fpCam.roll;
    camera.lookAt(fpCam.ax, fpCam.ay + by * 0.5, fpCam.az);
    camera.rotation.z = fpCam.roll;

    // Vision effects
    if (htmlRefs?.canvas) {
      htmlRefs.canvas.style.filter = fpCam.blur > 0.05 ? `blur(${fpCam.blur.toFixed(2)}px)` : "none";
    }
    if (renderer) {
      renderer.toneMappingExposure = fpCam.exposure;
    }

    // Gas update
    if (gas) gas.update(dt);
  },

  cleanup(state) {
    const { scene, renderer, gas, disposables } = state;
    if (!scene) return;

    // Dispose gas particles
    if (gas) {
      const { group, particles } = gas;
      if (particles) {
        for (const sp of particles) {
          (sp.material as THREE.SpriteMaterial).dispose();
        }
      }
      if (group) scene.remove(group);
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
      scene.remove(child);
    }

    if (renderer) renderer.dispose();
  },
};
