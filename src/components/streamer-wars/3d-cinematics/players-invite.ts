import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { gsap } from "gsap";
import { playSound, playSoundWithMegaphone } from "@/consts/Sounds";
import type { Cinematic3DDefinition } from "./types";

import { makeBox, makeCyl } from "./primitives";

// ─── Texturas procedurales (0 requests extra, se generan en ~1ms) ───
let _softTex: THREE.Texture | null = null;
function getSoftTexture(): THREE.Texture {
  if (_softTex) return _softTex;
  const c = document.createElement("canvas");
  c.width = 64; c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  _softTex = new THREE.CanvasTexture(c);
  return _softTex;
}

// ─── Sistema de partículas PUNTUAL: 1 draw call, 1 material ───────────
// Reemplaza los N Sprites (N draw calls + N materiales). Todo reciclado,
// sin allocs por frame: los Float32Array viven mientras dure la escena.
function makePuffSystem(opts: {
  count: number;
  color: THREE.Color;
  baseSize?: number;
  sizeVar?: number;
}) {
  const { count, color, baseSize = 2.4, sizeVar = 2.2 } = opts;
  const tex = getSoftTexture();
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const aScale = new Float32Array(count);
  const aAlpha = new Float32Array(count);
  const vel = new Float32Array(count * 3);
  const life = new Float32Array(count);
  const maxLife = new Float32Array(count);
  const maxOp = new Float32Array(count);
  const grow = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    life[i] = Math.random() * 200;
    maxLife[i] = 180 + Math.random() * 150;
    maxOp[i] = 0.5 + Math.random() * 0.5;
    aScale[i] = baseSize + Math.random() * sizeVar;
    grow[i] = 0.4 + Math.random() * 0.9;
    pos[i * 3 + 1] = -10; // bajo el suelo hasta que spawnee
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aScale", new THREE.BufferAttribute(aScale, 1));
  geo.setAttribute("aAlpha", new THREE.BufferAttribute(aAlpha, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: tex },
      uColor: { value: new THREE.Vector3(color.r, color.g, color.b) },
    },
    vertexShader: /* glsl */ `
      attribute float aScale;
      attribute float aAlpha;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aScale * (220.0 / max(0.1, -mv.z));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        float a = texture2D(uMap, gl_PointCoord).a * vAlpha;
        if (a < 0.004) discard;
        gl_FragColor = vec4(uColor * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  let intensity = 0;
  let cursor = 0;

  const spawnOne = (px: number, py: number, pz: number, spread: number) => {
    const i = cursor;
    cursor = (cursor + 1) % count;
    life[i] = 0;
    maxLife[i] = 180 + Math.random() * 150;
    maxOp[i] = 0.5 + Math.random() * 0.5;
    aScale[i] = baseSize + Math.random() * sizeVar;
    pos[i * 3] = px + (Math.random() - 0.5) * spread;
    pos[i * 3 + 1] = py + Math.random() * 0.6;
    pos[i * 3 + 2] = pz + (Math.random() - 0.5) * spread;
    vel[i * 3] = (Math.random() - 0.5) * 0.006;
    vel[i * 3 + 1] = 0.004 + Math.random() * 0.008;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.006;
  };

  return {
    points, geo, mat,
    setIntensity: (v: number) => { intensity = v; },
    getIntensity: () => intensity,
    update(dt: number, emit: (spawn: (px: number, py: number, pz: number, spread: number) => void) => void, driftX = 0) {
      if (intensity > 0) emit(spawnOne);
      const step = 60 * dt;
      const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
      const scaleAttr = geo.getAttribute("aScale") as THREE.BufferAttribute;
      const alphaAttr = geo.getAttribute("aAlpha") as THREE.BufferAttribute;
      for (let i = 0; i < count; i++) {
        if (life[i] > maxLife[i]) { aAlpha[i] = 0; continue; }
        life[i] += step;
        const t = life[i] / maxLife[i];
        pos[i * 3] += (vel[i * 3] + driftX) * step;
        pos[i * 3 + 1] += vel[i * 3 + 1] * (1 - t * 0.5) * step;
        pos[i * 3 + 2] += vel[i * 3 + 2] * step;
        let f = 0;
        if (t < 0.12) f = t / 0.12;
        else if (t < 0.72) f = 1;
        else f = 1 - (t - 0.72) / 0.28;
        aAlpha[i] = f * Math.min(intensity, 1.15) * maxOp[i] * 0.5;
        aScale[i] += grow[i] * dt;
      }
      posAttr.needsUpdate = true;
      scaleAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
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
        if ("backgroundIntensity" in scene) (scene as any).backgroundIntensity = 0.85;
        scene.environment = envMap;
        // 0.55 en vez de 1.2: noche creíble, no lava los negros, mismo costo.
        scene.environmentIntensity = 0.55;
        // Reflejos de charcos un poco más vivos que el resto
        scene.traverse((o: any) => {
          if (o?.isMesh && o.userData?.isPuddle && o.material) {
            o.material.envMapIntensity = 1.8;
          }
        });
        pmremGen.dispose();
      },
      undefined,
      () => { scene.background = new THREE.Color(0x06090f); },
    );

    camera.fov = 68;
    camera.rotation.order = "YXZ";
    camera.updateProjectionMatrix();

    const disposables: { geo: THREE.BufferGeometry; mat: THREE.Material }[] = [];
    const track = (m: THREE.Mesh) => disposables.push({ geo: m.geometry, mat: m.material as THREE.Material });
    const softTex = getSoftTexture();

    // ── Lighting: 6 luces en vez de 10 ─────────────────────
    // Cada PointLight extra encarece TODOS los fragmentos en forward.
    // Los rellenos cálidos/azules se fingen con sprites emissivos.
    const ambient = new THREE.AmbientLight(0x4a5a7a, 4.5);
    scene.add(ambient);

    const makeP = (x: number, y: number, z: number, c: number, i: number, d: number) => {
      const l = new THREE.PointLight(c, i, d, 2);
      l.position.set(x, y, z);
      scene.add(l);
      return l;
    };
    const streetLamp1 = makeP(4, 7, -2, 0xff9030, 18.0, 50);
    const streetLamp2 = makeP(-5, 7, -18, 0xff8820, 14.0, 45);

    const headlightL = new THREE.PointLight(0xc8e0ff, 0, 50, 1.2);
    headlightL.position.set(-0.8, 1.2, 2.8);
    const headlightR = new THREE.PointLight(0xc8e0ff, 0, 50, 1.2);
    headlightR.position.set(0.8, 1.2, 2.8);

    const interiorRed = new THREE.PointLight(0xff2020, 0, 8, 2);
    interiorRed.position.set(0, 1.5, 0.5);

    const gasLight = new THREE.PointLight(0x20ff80, 0, 6, 2);
    gasLight.position.set(0, 1.2, 1.0);

    // ── Street ──────────────────────────────────────────────
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.55, metalness: 0.45, envMapIntensity: 0.7 });
    const ground = makeBox(40, 0.1, 80, groundMat);
    ground.position.set(0, -0.05, -10);
    scene.add(ground);
    track(ground);

    // Charcos: 4 planos que capturan el HDRI → asfalto mojado creíble, 4 draws estáticos
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x0a0e14, roughness: 0.06, metalness: 0.9,
      transparent: true, opacity: 0.85, envMapIntensity: 1.8,
    });
    const puddleGeos: THREE.BufferGeometry[] = [];
    const addPuddle = (x: number, z: number, w: number, l: number, rot: number) => {
      const g = new THREE.PlaneGeometry(w, l);
      const m = new THREE.Mesh(g, puddleMat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = rot;
      m.position.set(x, 0.015, z);
      m.userData.isPuddle = true;
      scene.add(m);
      puddleGeos.push(g);
    };
    addPuddle(-1.8, -6, 2.4, 3.6, 0.4);
    addPuddle(1.6, -11, 1.8, 2.6, -0.3);
    addPuddle(-0.6, 2.5, 3.0, 1.8, 0.15);
    addPuddle(2.4, -20, 2.0, 3.0, 0.7);

    const markMat = new THREE.MeshStandardMaterial({ color: 0x8a8a72, roughness: 0.8, emissive: 0x22221a, emissiveIntensity: 0.25 });
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

    // Cable catenario cruzando la calle (1 draw, mucha profundidad)
    {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-10, 7.6, -8),
        new THREE.Vector3(-2, 6.3, -8),
        new THREE.Vector3(6, 7.4, -8),
      );
      const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.025, 5);
      const tubeMat = new THREE.MeshBasicMaterial({ color: 0x05060a });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      scene.add(tube);
      disposables.push({ geo: tubeGeo, mat: tubeMat });
    }

    // ── Lampposts + conos volumétricos falsos + glow ───────
    const glowSprites: THREE.Sprite[] = [];
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

      // Cono de luz falso (aditivo, 1 draw c/u) + halo sprite
      const coneGeo = new THREE.ConeGeometry(2.4, 7.4, 18, 1, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0xff9a30, transparent: true, opacity: 0.05,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false,
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(x - 1.1, 7.6 - 3.7, z);
      scene.add(cone);
      disposables.push({ geo: coneGeo, mat: coneMat });

      const haloMat = new THREE.SpriteMaterial({
        map: softTex, color: 0xffa040, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const halo = new THREE.Sprite(haloMat);
      halo.scale.set(2.6, 2.6, 1);
      halo.position.set(x - 1.1, 7.6, z);
      scene.add(halo);
      glowSprites.push(halo);
      disposables.push({ geo: halo.geometry as unknown as THREE.BufferGeometry, mat: haloMat });
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

    // Ventanas: 3 InstancedMesh (1 draw c/u) + 2 ventanas "TV" separadas que parpadean
    const tvMats: THREE.MeshStandardMaterial[] = [];
    {
      const winGeo = new THREE.PlaneGeometry(0.55, 0.7);
      const warm = new THREE.MeshStandardMaterial({ emissive: 0xffcc60, emissiveIntensity: 1.6, color: 0x100800 });
      const cool = new THREE.MeshStandardMaterial({ emissive: 0x6080ff, emissiveIntensity: 1.4, color: 0x000820 });
      const white = new THREE.MeshStandardMaterial({ emissive: 0xffffff, emissiveIntensity: 0.45, color: 0x101010 });
      const spots: { x: number; y: number; z: number; ry: number; k: number }[] = [];
      const collect = (bldX: number, bldY: number, bldZ: number, cols: number, rows: number, spacing: number, side: number) => {
        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            if (Math.random() < 0.35) continue;
            const roll = Math.random();
            const k = roll < 0.75 ? 0 : roll < 0.9 ? 1 : 2;
            spots.push({
              x: bldX + (c - cols / 2 + 0.5) * spacing,
              y: bldY - 2 + r * spacing * 1.3,
              z: bldZ + side * 0.06,
              ry: side > 0 ? 0 : Math.PI,
              k,
            });
          }
        }
      };
      collect(12, 9, -2.1, 3, 6, 2.0, -1);
      collect(-16, 7, 1.1, 4, 5, 1.8, 1);
      collect(14, 11, -19.1, 4, 7, 1.9, -1);
      const byKind = [[], [], []] as typeof spots[];
      for (const s of spots) byKind[s.k].push(s);
      const mats = [warm, cool, white];
      const dummy = new THREE.Object3D();
      byKind.forEach((list, k) => {
        if (!list.length) return;
        const im = new THREE.InstancedMesh(winGeo, mats[k], list.length);
        list.forEach((s, i) => {
          dummy.position.set(s.x, s.y, s.z);
          dummy.rotation.set(0, s.ry, 0);
          // Variación barata de brillo por instancia (tinte del emissive no, pero el color sí modula)
          dummy.updateMatrix();
          im.setMatrixAt(i, dummy.matrix);
        });
        im.instanceMatrix.needsUpdate = true;
        scene.add(im);
        disposables.push({ geo: winGeo, mat: mats[k] });
      });

      // 2 TVs que parpadean (únicas ventanas dinámicas)
      const tvGeoA = new THREE.PlaneGeometry(0.55, 0.7);
      const tvMatA = new THREE.MeshStandardMaterial({ emissive: 0x9db8ff, emissiveIntensity: 1.4, color: 0x05070f });
      const tvA = new THREE.Mesh(tvGeoA, tvMatA);
      tvA.position.set(12 + 2.0, 9 + 1.5, -2.1 - 0.06);
      tvA.rotation.y = Math.PI;
      scene.add(tvA);
      disposables.push({ geo: tvGeoA, mat: tvMatA });
      tvMats.push(tvMatA);
      const tvGeoB = new THREE.PlaneGeometry(0.55, 0.7);
      const tvMatB = new THREE.MeshStandardMaterial({ emissive: 0x9db8ff, emissiveIntensity: 1.1, color: 0x05070f });
      const tvB = new THREE.Mesh(tvGeoB, tvMatB);
      tvB.position.set(-16 - 1.8, 7 - 0.5, 1.1 + 0.06);
      scene.add(tvB);
      disposables.push({ geo: tvGeoB, mat: tvMatB });
      tvMats.push(tvMatB);
    }

    // Cartel neón "ON AIR" en el edificio izquierdo (1 draw + 1 halo, parpadeo en animate)
    let neonMat: THREE.MeshBasicMaterial | null = null;
    let neonHaloMat: THREE.SpriteMaterial | null = null;
    {
      const c = document.createElement("canvas");
      c.width = 256; c.height = 96;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, 256, 96);
      ctx.font = "bold 44px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(255,40,80,0.9)";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#ff2a55";
      ctx.fillText("ON AIR", 128, 50);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ff8aa0";
      ctx.fillText("ON AIR", 128, 50);
      const neonTex = new THREE.CanvasTexture(c);
      neonMat = new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, depthWrite: false });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9), neonMat);
      sign.position.set(-11.44, 4.6, -10);
      sign.rotation.y = Math.PI / 2;
      scene.add(sign);
      disposables.push({ geo: sign.geometry, mat: neonMat });
      (neonTex as THREE.Texture).colorSpace = THREE.SRGBColorSpace;
      disposables.push({ geo: new THREE.BufferGeometry(), mat: { dispose: () => neonTex.dispose() } as unknown as THREE.Material });

      neonHaloMat = new THREE.SpriteMaterial({
        map: softTex, color: 0xff2a55, transparent: true, opacity: 0.28,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const halo = new THREE.Sprite(neonHaloMat);
      halo.scale.set(4.2, 2.0, 1);
      halo.position.set(-11.2, 4.6, -10);
      scene.add(halo);
      disposables.push({ geo: halo.geometry as unknown as THREE.BufferGeometry, mat: neonHaloMat });
    }

    // Dumpster + bolsas de basura (siluetas que rompen la línea recta de la calle)
    const dumpster = makeBox(1.2, 0.9, 0.6, new THREE.MeshStandardMaterial({ color: 0x0a1208, roughness: 0.9, metalness: 0.4 }));
    dumpster.position.set(7.5, 0.45, 0.5);
    scene.add(dumpster);
    track(dumpster);
    const bagMat = new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.55, metalness: 0.1 });
    const bagGeos: THREE.BufferGeometry[] = [];
    [[7.0, 0.28, 1.4, 0.55], [8.1, 0.22, 1.0, 0.45], [7.4, 0.7, 0.2, 0.4]].forEach(([x, y, z, s]) => {
      const g = new THREE.SphereGeometry(s, 7, 6);
      const b = new THREE.Mesh(g, bagMat);
      b.position.set(x as number, y as number, z as number);
      b.scale.y = 0.75;
      scene.add(b);
      bagGeos.push(g);
      disposables.push({ geo: g, mat: bagMat });
    });

    // ── Van ─────────────────────────────────────────────────
    const vanGroup = new THREE.Group();
    vanGroup.position.set(1.0, 0, -35);
    scene.add(vanGroup);

    vanGroup.add(headlightL);
    vanGroup.add(headlightR);
    vanGroup.add(interiorRed);
    vanGroup.add(gasLight);

    // Haz principal de faros: 1 SpotLight (más barato que 2 points a full + da cono real)
    const headSpot = new THREE.SpotLight(0xcfe4ff, 0, 45, 0.55, 0.6, 1.1);
    headSpot.position.set(0, 1.3, 2.6);
    const headTarget = new THREE.Object3D();
    headTarget.position.set(0, 0.2, 14);
    vanGroup.add(headTarget);
    headSpot.target = headTarget;
    vanGroup.add(headSpot);

    // Flares de faros (sprites, 0 luces) + luces de freno traseras
    const flareMatL = new THREE.SpriteMaterial({ map: softTex, color: 0xd8ecff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const flareL = new THREE.Sprite(flareMatL);
    flareL.scale.set(1.6, 1.6, 1);
    flareL.position.set(-0.8, 1.1, 2.85);
    vanGroup.add(flareL);
    const flareMatR = flareMatL.clone();
    const flareR = new THREE.Sprite(flareMatR);
    flareR.scale.set(1.6, 1.6, 1);
    flareR.position.set(0.8, 1.1, 2.85);
    vanGroup.add(flareR);
    disposables.push({ geo: flareL.geometry as unknown as THREE.BufferGeometry, mat: flareMatL });
    disposables.push({ geo: flareR.geometry as unknown as THREE.BufferGeometry, mat: flareMatR });

    const brakeMat = new THREE.MeshStandardMaterial({ color: 0x1a0505, emissive: 0xff0808, emissiveIntensity: 0.35, roughness: 0.3 });
    const brakeGeoL = new THREE.BoxGeometry(0.3, 0.13, 0.06);
    const brakeL = new THREE.Mesh(brakeGeoL, brakeMat);
    brakeL.position.set(-0.72, 1.15, -2.78);
    vanGroup.add(brakeL);
    const brakeGeoR = new THREE.BoxGeometry(0.3, 0.13, 0.06);
    const brakeR = new THREE.Mesh(brakeGeoR, brakeMat);
    brakeR.position.set(0.72, 1.15, -2.78);
    vanGroup.add(brakeR);
    disposables.push({ geo: brakeGeoL, mat: brakeMat });
    disposables.push({ geo: brakeGeoR, mat: brakeMat });

    const vanData = { mixer: null as THREE.AnimationMixer | null, doorAction: null as THREE.AnimationAction | null };

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
      g.userData.torso = torso;
      return g;
    }

    const guard = createSeatedGuard();
    guard.scale.setScalar(0.60);
    guard.position.set(-0.7, 0.3, 0.7);
    vanGroup.add(guard);

    // ── Van side text ───────────────────────────────────────
    const textCanvas = document.createElement("canvas");
    textCanvas.width = 512;
    textCanvas.height = 256;
    const tCtx = textCanvas.getContext("2d")!;
    tCtx.clearRect(0, 0, 512, 256);

    const fontBase = '"Atomic Marker", "Arial Black", sans-serif';
    const textColor = "#b4cd02";

    // Glow layer
    tCtx.shadowColor = "rgba(180,205,2,0.6)";
    tCtx.shadowBlur = 24;
    tCtx.fillStyle = textColor;
    tCtx.font = `bold 52px ${fontBase}`;
    tCtx.textAlign = "center";
    tCtx.textBaseline = "middle";
    tCtx.fillText("GUERRA DE", 256, 90);

    tCtx.shadowBlur = 32;
    tCtx.font = `bold 68px ${fontBase}`;
    tCtx.fillText("STREAMERS", 256, 172);

    // Sharp text on top
    tCtx.shadowBlur = 0;
    tCtx.fillStyle = "#dae86a";
    tCtx.font = `bold 52px ${fontBase}`;
    tCtx.fillText("GUERRA DE", 256, 90);
    tCtx.font = `bold 68px ${fontBase}`;
    tCtx.fillText("STREAMERS", 256, 172);

    const textTex = new THREE.CanvasTexture(textCanvas);
    textTex.needsUpdate = true;

    const textPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.7),
      new THREE.MeshStandardMaterial({
        map: textTex,
        transparent: true,
        emissive: new THREE.Color(0xb4cd02),
        emissiveIntensity: 0.5,
        emissiveMap: textTex,
        depthWrite: false,
        roughness: 0.3,
        metalness: 0.2,
        side: THREE.DoubleSide,
      }),
    );
    textPlane.position.set(-0.85, 1.2, -0.5);
    textPlane.rotation.y = -Math.PI / 2;
    vanGroup.add(textPlane);
    disposables.push({ geo: textPlane.geometry, mat: textPlane.material as THREE.Material });

    // Load van GLB (sin sombras: ninguna luz proyecta, ahorramos el shadow pass)
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
            m.castShadow = false;
            m.receiveShadow = false;
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

        vanData.mixer = new THREE.AnimationMixer(model);
        const playerDoorClip = gltf.animations.find(c =>
          c.tracks.some(t => t.name === "Porte_avnt_2.quaternion")
        );
        if (playerDoorClip) {
          vanData.doorAction = vanData.mixer.clipAction(playerDoorClip);
          vanData.doorAction.setLoop(THREE.LoopOnce, 0);
          vanData.doorAction.clampWhenFinished = true;
        } else {
          const fallbackClip = gltf.animations.find(c =>
            c.tracks.some(t => t.name === "Porte_avnt_1.quaternion")
          );
          if (fallbackClip) {
            vanData.doorAction = vanData.mixer.clipAction(fallbackClip);
            vanData.doorAction.setLoop(THREE.LoopOnce);
            vanData.doorAction.clampWhenFinished = true;
          }
        }
      },
      undefined,
      () => {
        const fallback = makeBox(2.2, 2.0, 5.5, new THREE.MeshStandardMaterial({ color: 0x0a0c0e, roughness: 0.6, metalness: 0.5 }));
        fallback.position.y = 1.0;
        vanGroup.add(fallback);
        track(fallback);
      },
    );

    // ── Gas verde: 1 draw call (antes ~150 Sprites) ─────────
    const gas = makePuffSystem({ count: 110, color: new THREE.Color(0.35, 1.0, 0.6), baseSize: 2.6, sizeVar: 3.0 });
    gas.setIntensity(0);
    gas.points.position.set(0, 1.2, 0);
    scene.add(gas.points);

    // ── Humo del escape: 1 draw call, 26 partículas ─────────
    const exhaust = makePuffSystem({ count: 26, color: new THREE.Color(0.32, 0.34, 0.38), baseSize: 0.5, sizeVar: 0.7 });
    exhaust.setIntensity(0.25);
    vanGroup.add(exhaust.points);

    // ── Lluvia: 1 LineSegments, 340 gotas, 0 texturas ───────
    const RAIN = 340;
    const rainPos = new Float32Array(RAIN * 6);
    const rainSpeed = new Float32Array(RAIN);
    const rainGeo = new THREE.BufferGeometry();
    const resetDrop = (i: number, randomY = false) => {
      const x = -12 + Math.random() * 24;
      const y = randomY ? Math.random() * 10 : 8 + Math.random() * 3;
      const z = -32 + Math.random() * 42;
      rainSpeed[i] = 16 + Math.random() * 10;
      rainPos[i * 6] = x;
      rainPos[i * 6 + 1] = y;
      rainPos[i * 6 + 2] = z;
      rainPos[i * 6 + 3] = x + 0.06;
      rainPos[i * 6 + 4] = y - 0.55;
      rainPos[i * 6 + 5] = z;
    };
    for (let i = 0; i < RAIN; i++) resetDrop(i, true);
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.LineBasicMaterial({ color: 0x8fa3c7, transparent: true, opacity: 0.22 });
    const rain = new THREE.LineSegments(rainGeo, rainMat);
    rain.frustumCulled = false;
    scene.add(rain);

    // ── Polillas/polvo alrededor de los faroles: 1 Points ────
    const MOTHS = 36;
    const mothGeo = new THREE.BufferGeometry();
    const mothPos = new Float32Array(MOTHS * 3);
    const mothSeed = new Float32Array(MOTHS * 4); // cx, radio, velocidad, fase
    const lampA = new THREE.Vector3(3.9, 7.55, -2);
    const lampB = new THREE.Vector3(-7.1, 7.55, -18);
    for (let i = 0; i < MOTHS; i++) {
      mothSeed[i * 4] = i % 2; // qué farol
      mothSeed[i * 4 + 1] = 0.2 + Math.random() * 0.55;
      mothSeed[i * 4 + 2] = 2 + Math.random() * 4.5;
      mothSeed[i * 4 + 3] = Math.random() * Math.PI * 2;
    }
    mothGeo.setAttribute("position", new THREE.BufferAttribute(mothPos, 3));
    const mothMat = new THREE.PointsMaterial({
      map: softTex, size: 0.09, color: 0xffc878, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    const moths = new THREE.Points(mothGeo, mothMat);
    moths.frustumCulled = false;
    scene.add(moths);

    // ── Niebla baja a ras de suelo: 3 planos a la deriva ────
    const fogPlanes: THREE.Mesh[] = [];
    {
      const fg = new THREE.PlaneGeometry(30, 7);
      for (let i = 0; i < 3; i++) {
        const fm = new THREE.MeshBasicMaterial({
          map: softTex, color: 0x2a3a4a, transparent: true,
          opacity: 0.05 + i * 0.012, depthWrite: false,
        });
        const f = new THREE.Mesh(fg, fm);
        f.rotation.x = -Math.PI / 2;
        f.position.set((Math.random() - 0.5) * 6, 0.18 + i * 0.16, -16 + i * 9);
        scene.add(f);
        fogPlanes.push(f);
        disposables.push({ geo: fg, mat: fm });
      }
    }

    // ── Papeles al viento: 5 quads reciclados ───────────────
    const papers: THREE.Mesh[] = [];
    const paperVel: number[] = [];
    {
      const pg = new THREE.PlaneGeometry(0.24, 0.3);
      for (let i = 0; i < 5; i++) {
        const pm = new THREE.MeshBasicMaterial({ color: 0x9aa0a8, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
        const p = new THREE.Mesh(pg, pm);
        p.position.set(-12 + Math.random() * 24, 0.15 + Math.random() * 0.8, -28 + Math.random() * 34);
        p.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        scene.add(p);
        papers.push(p);
        paperVel.push(0.5 + Math.random() * 0.9);
        disposables.push({ geo: pg, mat: pm });
      }
    }

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
      exhaust,
      rain, rainPos, rainSpeed, rainGeo,
      moths, mothPos, mothSeed, mothGeo, lampA, lampB,
      fogPlanes,
      papers, paperVel,
      glowSprites,
      flareMatL, flareMatR,
      brakeMat,
      tvMats,
      neonMat, neonHaloMat,
      vanGroup,
      vanData,
      guard,
      streetLamp1,
      streetLamp2,
      headSpot,
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
      puddleGeos,
      puddleMat,
      bagGeos,
      prevVanZ: -35,
      vanSpeed: 0,
      lastFilter: "",
      lampDip1: 0,
      lampDip2: 0,
      textTex,
    };

    if (htmlRefs.numberEl) {
      htmlRefs.numberEl.textContent = `PLAYER ${String(playerNumber).padStart(3, "0")}`;
    }

    // Preload sounds
    const inviteSnd = [
      "scripts/3d/player-invite-bg",
      "scripts/3d/guardia-girando-cabeza",
      "scripts/3d/jugador-subase",
      "scripts/3d/waking-gas-2",
    ];
    inviteSnd.forEach(p => playSound({ sound: p, volume: 0 }));

    // ── GSAP Timeline (timings intactos) ────────────────────
    const tl = gsap.timeline({ delay: 0.5 });

    // Play background sound immediately, but fade it in with the musical cues
    tl.call(() => { playSound({ sound: "scripts/3d/player-invite-bg", volume: 0.1 }); }, [], 0);

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
    tl.to(headSpot, { intensity: 55, duration: 0.6, ease: "power2.in" }, 13.5);
    tl.to(flareMatL, { opacity: 0.9, duration: 0.6 }, 13.5);
    tl.to(flareMatR, { opacity: 0.9, duration: 0.6 }, 13.5);
    // Frenada: las luces traseras se encienden justo antes de detenerse
    tl.to(brakeMat, { emissiveIntensity: 4.5, duration: 0.25, ease: "power2.out" }, 18.2);
    tl.to(brakeMat, { emissiveIntensity: 0.8, duration: 1.2, ease: "power2.inOut" }, 19.2);

    tl.to(fpCam, { bx: -0.9, gx: 1, gz: 1, gy: 1.3, duration: 3, ease: "power2.inOut" }, 12);
    tl.to(fpCam, { bx: -0.5, duration: 1.8, ease: "power2.inOut" }, 15.5);
    tl.to(fpCam, { bx: -0.7, by: 1.7, duration: 1.5, ease: "power2.out" }, 16);
    tl.to(fpCam, { bx: -0.5, by: 1.68, duration: 1, ease: "power1.in" }, 17.5);
    tl.to(fpCam, { gx: 0.8, gz: 0, gy: 1.2, duration: 2, ease: "power2.out" }, 17);

    // Phase 4: DOOR OPENS (19s - 24s)
    tl.call(() => { if (vanData.doorAction) vanData.doorAction.play(); }, [], 19.5);
    tl.to(interiorRed, { intensity: 1.8, duration: 0.4, ease: "power2.out" }, 19.8);
    tl.to(interiorRed, { intensity: 0.6, duration: 0.15, ease: "none" }, 20.2);
    tl.to(interiorRed, { intensity: 2.0, duration: 0.3, ease: "power2.out" }, 20.4);

    tl.to(fpCam, { bx: -0.55, by: 1.7, rollTarget: 0.02, duration: 0.12, ease: "power3.out" }, 19.5);
    tl.to(fpCam, { bx: -0.5, by: 1.68, rollTarget: 0, duration: 0.4, ease: "power2.in" }, 19.62);

    tl.to(guard.userData.headYaw.rotation, { y: -0.6, duration: 4, ease: "power3.inOut" }, 18.5);
    tl.call(() => { playSound({ sound: "scripts/3d/guardia-girando-cabeza", volume: 0.5 }); }, [], 19.5);
    tl.to(fpCam, { gx: 1.7, gz: 1.0, gy: 1.3, duration: 2, ease: "power2.inOut" }, 21.5);

    // El guardia dice "Jugador, por favor subase"
    tl.call(() => { playSoundWithMegaphone({ sound: "scripts/3d/jugador-subase", volume: 1 }); }, [], 22.5);
    tl.call(() => { if (htmlRefs.subtitleEl) htmlRefs.subtitleEl.textContent = "Jugador, por favor súbase"; }, [], 22.5);
    tl.set(htmlRefs.subtitleEl, { opacity: 1 }, 22.5);
    tl.set(htmlRefs.subtitleEl, { opacity: 0 }, 25.5);

    // Phase 5: ENTERING THE VAN (24s - 30s)
    tl.to(fpCam, { bx: -0.45, duration: 0.6, ease: "sine.inOut" }, 24);
    tl.to(fpCam, { bx: -0.55, duration: 0.6, ease: "sine.inOut" }, 24.6);
    tl.to(fpCam, { bx: 0.0, by: 1.5, duration: 1.2, ease: "power2.inOut" }, 25.2);
    tl.to(fpCam, { gx: 0.8, gz: 1.5, gy: 1.0, duration: 1, ease: "power2.in" }, 25.2);
    tl.to(fpCam, { gx: 2.0, gz: 1.2, gy: 0.9, duration: 0.8, ease: "power2.inOut" }, 26.2);
    tl.to(fpCam, { bx: 0.35, by: 1.25, bz: 0.85, rollTarget: 0.08, duration: 0.8, ease: "power2.inOut" }, 26.5);
    tl.to(fpCam, { bx: 0.55, by: 1.55, bz: 0.7, rollTarget: 0, duration: 1.2, ease: "power2.inOut" }, 27.3);
    tl.to(fpCam, { by: 1.60, duration: 0.3, ease: "sine.inOut" }, 28.5);
    tl.to(fpCam, { by: 1.50, duration: 0.3, ease: "sine.inOut" }, 28.8);
    tl.to(fpCam, { bx: 0.55, by: 1.55, bz: 0.7, rollTarget: 0.01, duration: 0.5, ease: "power2.out" }, 29.1);
    tl.to(fpCam, { gx: 1.5, gz: 6, gy: 1.2, duration: 2, ease: "power2.inOut" }, 29);
    tl.to(guard.userData.headYaw.rotation, { y: 0, duration: 3, ease: "power2.inOut" }, 31);
    tl.call(() => {
      if (vanData.doorAction) {
        const clip = vanData.doorAction.getClip();
        vanData.doorAction.stop();
        vanData.doorAction.timeScale = -0.8;
        vanData.doorAction.time = clip.duration;
        vanData.doorAction.clampWhenFinished = true;
        vanData.doorAction.play();
      }
    }, [], 30.5);

    // Phase 6: INSIDE THE VAN (30s - 36s)
    tl.to(fpCam, { ba: 0.014, duration: 2, ease: "power2.in" }, 31);
    tl.to(interiorRed, { intensity: 2.5, duration: 2, ease: "power2.in" }, 32);
    tl.call(() => { playSound({ sound: "scripts/3d/waking-gas-2", volume: 0.15 }); }, [], 36);
    tl.to(gasState, {
      level: 0.7, duration: 1.5, ease: "power2.in",
      onUpdate: function () { gas.setIntensity(this.targets()[0].level); },
    }, 33);

    // Phase 7: LOSING CONSCIOUSNESS (36s - 46s)
    tl.to(fpCam, { blur: 0.4, duration: 2, ease: "power2.in" }, 36);
    tl.to(gasLight, { intensity: 3.5, duration: 3, ease: "power2.in" }, 36);
    tl.to(gasState, {
      level: 1.15, duration: 3, ease: "power2.in",
      onUpdate: function () { gas.setIntensity(this.targets()[0].level); },
    }, 36);
    tl.to(fpCam, { ba: 0.025, duration: 2, ease: "power2.in" }, 37);
    tl.to(fpCam, { blur: 0.8, duration: 2, ease: "power2.in" }, 38);
    tl.to(fpCam, { exposure: 0.6, duration: 3, ease: "power3.in" }, 38.5);
    tl.to(fpCam, { wobbleAmp: 0.04, duration: 3, ease: "power2.in" }, 39);
    tl.to(fpCam, { by: 1.25, duration: 3, ease: "power3.in" }, 39);
    tl.to(fpCam, { blur: 2.0, duration: 2.5, ease: "power2.in" }, 40);
    tl.to(fpCam, { exposure: 0.3, duration: 2.5, ease: "power3.in" }, 41);
    tl.to(fpCam, { by: 1.2, duration: 3, ease: "power3.in" }, 41.5);
    tl.to(fpCam, { blur: 4.5, duration: 2, ease: "power2.in" }, 42.5);
    tl.to(fpCam, { exposure: 0.05, duration: 3, ease: "power3.in" }, 43);
    tl.to(htmlRefs.overlayEl, { opacity: 1, duration: 3, ease: "power3.in" }, 43);

    return { state, timeline: tl };
  },

  animate(dt, time, state, _scene, camera) {
    const { fpCam, gas, exhaust, vanGroup, vanData, streetLamp1, streetLamp2, htmlRefs, renderer } = state;
    if (!fpCam) return;

    state.s0time += dt;
    const t = state.s0time;
    const clampedDt = Math.min(dt, 0.05);

    // Van animation mixer
    if (vanData?.mixer) vanData.mixer.update(clampedDt);

    // Velocidad real de la van (para vibración motor + escape)
    const vz = vanGroup ? vanGroup.position.z : 0;
    const rawSpeed = Math.abs(vz - (state.prevVanZ ?? vz)) / Math.max(clampedDt, 0.001);
    state.prevVanZ = vz;
    state.vanSpeed = (state.vanSpeed ?? 0) * 0.92 + rawSpeed * 0.08;

    // Ralentí + traqueteo en marcha: sin allocs, solo offsets
    if (vanGroup) {
      const idle = 0.006;
      const drive = Math.min(state.vanSpeed * 0.004, 0.03);
      vanGroup.position.y += Math.sin(t * 31) * (idle + drive) * clampedDt * 8 * 0.12;
      vanGroup.rotation.z = Math.sin(t * 27) * (0.0012 + drive * 0.04);
      vanGroup.rotation.x = Math.sin(t * 23 + 1) * (0.001 + drive * 0.03);
    }

    // Escape sigue al tubo trasero (coordenadas locales de la van)
    if (exhaust) {
      exhaust.points.position.set(0.7, 0.35, -2.9);
      exhaust.setIntensity(0.2 + Math.min(state.vanSpeed * 0.12, 0.8));
      exhaust.update(clampedDt, (spawn) => {
        if (Math.random() < 0.5) spawn(0, 0, 0, 0.25);
      }, -0.35);
    }

    // Spring physics: head position
    const k = 5.5, d = 3.2;
    fpCam.hvx += (fpCam.bx - fpCam.hx) * k * clampedDt - fpCam.hvx * d * clampedDt;
    fpCam.hvz += (fpCam.bz - fpCam.hz) * k * clampedDt - fpCam.hvz * d * clampedDt;
    fpCam.hvy += (fpCam.by - fpCam.hy) * k * clampedDt - fpCam.hvy * d * clampedDt;
    fpCam.hx += fpCam.hvx * clampedDt;
    fpCam.hz += fpCam.hvz * clampedDt;
    fpCam.hy += fpCam.hvy * clampedDt;

    // Spring physics: gaze
    const gk = 4.0, gd = 2.8;
    fpCam.avx += (fpCam.gx - fpCam.ax) * gk * clampedDt - fpCam.avx * gd * clampedDt;
    fpCam.avy += (fpCam.gy - fpCam.ay) * gk * clampedDt - fpCam.avy * gd * clampedDt;
    fpCam.avz += (fpCam.gz - fpCam.az) * gk * clampedDt - fpCam.avz * gd * clampedDt;
    fpCam.ax += fpCam.avx * clampedDt;
    fpCam.ay += fpCam.avy * clampedDt;
    fpCam.az += fpCam.avz * clampedDt;

    // Spring physics: roll
    const rk = 4.5, rd = 3.0;
    fpCam.rollV += (fpCam.rollTarget - fpCam.roll) * rk * clampedDt - fpCam.rollV * rd * clampedDt;
    fpCam.roll += fpCam.rollV * clampedDt;

    // Breathing
    fpCam.bp += clampedDt * 1.2;
    const by = Math.sin(fpCam.bp) * fpCam.ba;
    const bx = Math.sin(fpCam.bp * 0.7) * fpCam.ba * 0.3;

    // Wobble
    fpCam.wobblePhase += clampedDt * 2.5;
    const wx = Math.sin(fpCam.wobblePhase) * fpCam.wobbleAmp;
    const wz = Math.cos(fpCam.wobblePhase * 0.7) * fpCam.wobbleAmp * 0.5;

    // Lámparas: flicker independiente + micro-cortes ocasionales
    if (state.lampDip1 > 0) state.lampDip1 -= clampedDt;
    else if (Math.random() < 0.004) state.lampDip1 = 0.09;
    if (state.lampDip2 > 0) state.lampDip2 -= clampedDt;
    else if (Math.random() < 0.004) state.lampDip2 = 0.12;
    const f1 = (6.0 + Math.sin(t * 17.3) * 0.12 + Math.sin(t * 5.1) * 0.18) * (state.lampDip1 > 0 ? 0.35 : 1);
    const f2 = (6.0 + Math.sin(t * 15.1 + 2) * 0.14 + Math.sin(t * 4.3 + 1) * 0.2) * (state.lampDip2 > 0 ? 0.3 : 1);
    if (streetLamp1) streetLamp1.intensity = f1;
    if (streetLamp2) streetLamp2.intensity = f2 * 0.78;
    if (state.glowSprites?.[0]) (state.glowSprites[0].material as THREE.SpriteMaterial).opacity = 0.45 + (f1 / 6) * 0.15;
    if (state.glowSprites?.[1]) (state.glowSprites[1].material as THREE.SpriteMaterial).opacity = 0.45 + (f2 / 6) * 0.15;

    // Guardia: respiración + micro-cabeceo (el eje Y lo sigue moviendo el timeline)
    if (state.guard?.userData?.headYaw) {
      state.guard.userData.headYaw.rotation.x = Math.sin(t * 0.9) * 0.045;
      state.guard.userData.headYaw.position.y = 0.9 + Math.sin(t * 1.4) * 0.008;
    }
    if (state.guard?.userData?.torso) {
      const ts = 1 + Math.sin(t * 1.4) * 0.012;
      state.guard.userData.torso.scale.set(1, ts, 1);
    }

    // TVs parpadeando como zapping lejano
    if (state.tvMats) {
      state.tvMats[0].emissiveIntensity = 1.25 + Math.sin(t * 13.7) * 0.35 + Math.sin(t * 41.3) * 0.2;
      state.tvMats[1].emissiveIntensity = 1.0 + Math.sin(t * 11.3 + 2) * 0.3 + Math.sin(t * 37.7) * 0.18;
    }
    // Neón ON AIR: casi siempre on, con caídas raras
    if (state.neonMat) {
      const drop = Math.sin(t * 23.7) > 0.985 || Math.sin(t * 7.3 + 1) > 0.992 ? 0.25 : 1;
      state.neonMat.opacity = drop;
      if (state.neonHaloMat) state.neonHaloMat.opacity = 0.28 * drop;
    }

    // Lluvia: cae y recicla (340 segmentos, 1 draw)
    {
      const p = state.rainPos as Float32Array;
      const sp = state.rainSpeed as Float32Array;
      for (let i = 0; i < sp.length; i++) {
        const vy = sp[i] * clampedDt;
        p[i * 6 + 1] -= vy;
        p[i * 6 + 4] -= vy;
        p[i * 6] += 1.1 * clampedDt;
        p[i * 6 + 3] += 1.1 * clampedDt;
        if (p[i * 6 + 1] < 0) {
          const x = -12 + Math.random() * 24;
          const z = -32 + Math.random() * 42;
          const y = 8 + Math.random() * 3;
          sp[i] = 16 + Math.random() * 10;
          p[i * 6] = x; p[i * 6 + 1] = y; p[i * 6 + 2] = z;
          p[i * 6 + 3] = x + 0.06; p[i * 6 + 4] = y - 0.55; p[i * 6 + 5] = z;
        }
      }
      (state.rainGeo as THREE.BufferGeometry).getAttribute("position").needsUpdate = true;
    }

    // Polillas orbitando los faroles
    {
      const mp = state.mothPos as Float32Array;
      const ms = state.mothSeed as Float32Array;
      for (let i = 0; i < 36; i++) {
        const c: THREE.Vector3 = (ms[i * 4] < 0.5 ? state.lampA : state.lampB) as THREE.Vector3;
        const r = ms[i * 4 + 1];
        const s = ms[i * 4 + 2];
        const ph = ms[i * 4 + 3];
        mp[i * 3] = c.x + Math.cos(t * s + ph) * r;
        mp[i * 3 + 1] = c.y + Math.sin(t * s * 1.35 + ph) * 0.28;
        mp[i * 3 + 2] = c.z + Math.sin(t * s + ph) * r;
      }
      (state.mothGeo as THREE.BufferGeometry).getAttribute("position").needsUpdate = true;
    }

    // Niebla baja a la deriva
    if (state.fogPlanes) {
      for (let i = 0; i < state.fogPlanes.length; i++) {
        const f = state.fogPlanes[i] as THREE.Mesh;
        f.position.x = Math.sin(t * 0.07 + i * 2.1) * 3;
      }
    }

    // Papeles al viento, reciclados
    if (state.papers) {
      for (let i = 0; i < state.papers.length; i++) {
        const p = state.papers[i] as THREE.Mesh;
        const v = (state.paperVel as number[])[i];
        p.position.x += v * clampedDt * (1 + Math.sin(t * 0.8 + i) * 0.4);
        p.position.y = 0.15 + Math.abs(Math.sin(t * 1.7 + i * 1.9)) * 0.7;
        p.rotation.x += clampedDt * (1 + i * 0.3);
        p.rotation.y += clampedDt * 1.4;
        if (p.position.x > 13) {
          p.position.x = -13;
          p.position.z = -28 + Math.random() * 34;
        }
      }
    }

    // Gas sigue a la van (el Points vive en world space)
    if (gas && vanGroup) {
      gas.points.position.set(vanGroup.position.x, vanGroup.position.y + 1.2, vanGroup.position.z);
      gas.update(clampedDt, (spawn) => {
        if (Math.random() < 0.6) spawn(0, 0.4, 0.6, 3.2);
      }, -0.06);
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

    // Vision effects: escribir style.filter SOLO si cambió (evita reflow por frame)
    if (htmlRefs?.canvas) {
      const target = fpCam.blur > 0.05 ? `blur(${fpCam.blur.toFixed(2)}px)` : "none";
      if (target !== state.lastFilter) {
        htmlRefs.canvas.style.filter = target;
        state.lastFilter = target;
      }
    }
    if (renderer) {
      renderer.toneMappingExposure = fpCam.exposure;
    }
  },

  cleanup(state) {
    const { scene, renderer, gas, exhaust, disposables } = state;
    if (!scene) return;

    try { gas?.dispose(); } catch { /* noop */ }
    try { exhaust?.dispose(); } catch { /* noop */ }
    try { (state.rainGeo as THREE.BufferGeometry)?.dispose(); } catch { /* noop */ }
    try { (state.mothGeo as THREE.BufferGeometry)?.dispose(); } catch { /* noop */ }
    if (state.rain) {
      try { ((state.rain as THREE.LineSegments).material as THREE.Material).dispose(); } catch { /* noop */ }
    }
    if (state.moths) {
      try { ((state.moths as THREE.Points).material as THREE.Material).dispose(); } catch { /* noop */ }
    }
    if (state.textTex) {
      try { (state.textTex as THREE.Texture).dispose(); } catch { /* noop */ }
    }
    for (const g of (state.puddleGeos as THREE.BufferGeometry[] | undefined) ?? []) {
      try { g.dispose(); } catch { /* noop */ }
    }
    try { (state.puddleMat as THREE.Material)?.dispose(); } catch { /* noop */ }
    for (const g of (state.bagGeos as THREE.BufferGeometry[] | undefined) ?? []) {
      try { g.dispose(); } catch { /* noop */ }
    }

    // Dispose tracked geometries & materials
    if (disposables) {
      for (const { geo, mat } of disposables) {
        try { (geo as THREE.BufferGeometry)?.dispose(); } catch { /* noop */ }
        try { (mat as THREE.Material)?.dispose(); } catch { /* noop */ }
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
