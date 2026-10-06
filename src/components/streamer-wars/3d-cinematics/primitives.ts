import * as THREE from "three";

/** Luz puntual con decaimiento físico (reemplaza los makePoint duplicados). */
export function makePoint(
  scene: THREE.Scene,
  x: number,
  y: number,
  z: number,
  color: number,
  intensity: number,
  dist: number,
) {
  const l = new THREE.PointLight(color, intensity, dist, 2);
  l.position.set(x, y, z);
  scene.add(l);
  return l;
}

export function makeBox(w: number, h: number, d: number, mat: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

export function makeCyl(rt: number, rb: number, h: number, seg: number, mat: THREE.Material) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
}

/** Registra geometrías/materiales para dispose en cleanup. */
export function createDisposalTracker() {
  const disposables: { geo: THREE.BufferGeometry; mat: THREE.Material | THREE.Material[] }[] = [];
  const track = (m: THREE.Mesh) => {
    disposables.push({ geo: m.geometry, mat: m.material as THREE.Material });
    return m;
  };
  const disposeAll = () => {
    for (const { geo, mat } of disposables) {
      try { geo.dispose(); } catch {}
      const mats = Array.isArray(mat) ? mat : [mat];
      for (const mm of mats) {
        try {
          Object.values(mm).forEach((v: any) => { if (v?.isTexture) { try { v.dispose(); } catch {} } });
          (mm as THREE.Material).dispose();
        } catch {}
      }
    }
    disposables.length = 0;
  };
  return { track, disposeAll };
}
