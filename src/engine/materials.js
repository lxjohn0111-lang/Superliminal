// Material library: PBR materials built on procedural textures. `userData.tile` = metres per texture repeat.
import * as THREE from 'three';
import { getTextureSet } from './textures.js';

const DEF = {
  carpet:      { tex: 'carpet', color: 0x7d8796, tile: 1.0, sound: 'carpet', normalScale: 0.8 },
  carpetBlue:  { tex: 'carpet', color: 0x5d6f8c, tile: 1.0, sound: 'carpet', normalScale: 0.8 },
  carpetWarm:  { tex: 'carpet', color: 0x9a7f6a, tile: 1.0, sound: 'carpet', normalScale: 0.8 },
  carpetRed:   { tex: 'carpet', color: 0x8a3b3b, tile: 1.0, sound: 'carpet', normalScale: 0.8 },
  plaster:     { tex: 'plaster', color: 0xebe7df, tile: 2.0, sound: 'hard' },
  plasterWarm: { tex: 'plaster', color: 0xf0e2cf, tile: 2.0, sound: 'hard' },
  plasterBlue: { tex: 'plaster', color: 0xc9d8e6, tile: 2.0, sound: 'hard' },
  plasterPink: { tex: 'plaster', color: 0xf0d3d0, tile: 2.0, sound: 'hard' },
  plasterGreen:{ tex: 'plaster', color: 0xcfdccb, tile: 2.0, sound: 'hard' },
  plasterGrey: { tex: 'plaster', color: 0xb9bcc0, tile: 2.0, sound: 'hard' },
  plasterDark: { tex: 'plaster', color: 0x4a4f58, tile: 2.0, sound: 'hard' },
  paintWhite:  { tex: 'paint', color: 0xf3f1ec, tile: 3.0, sound: 'hard' },
  paintSky:    { tex: 'paint', color: 0x9cc6ea, tile: 3.0, sound: 'hard' },
  paintMint:   { tex: 'paint', color: 0xbfe3d2, tile: 3.0, sound: 'hard' },
  paintLilac:  { tex: 'paint', color: 0xd4c8ea, tile: 3.0, sound: 'hard' },
  paintPeach:  { tex: 'paint', color: 0xf6d2b8, tile: 3.0, sound: 'hard' },
  paintYellow: { tex: 'paint', color: 0xf3df9c, tile: 3.0, sound: 'hard' },
  ceiling:     { tex: 'ceiling', color: 0xf2f0ea, tile: 0.6, sound: 'hard', normalScale: 1.0 },
  woodfloor:   { tex: 'woodfloor', color: 0xffffff, tile: 1.6, sound: 'wood', normalScale: 0.7 },
  tiles:       { tex: 'tiles', color: 0xf4f4f2, tile: 1.2, sound: 'tile', normalScale: 1.0 },
  tilesBlue:   { tex: 'tiles', color: 0xb9d6e8, tile: 1.2, sound: 'tile', normalScale: 1.0 },
  tilesMint:   { tex: 'tiles', color: 0xcdebdc, tile: 1.2, sound: 'tile', normalScale: 1.0 },
  tilesBig:    { tex: 'tiles', color: 0xe9e6df, tile: 4.0, sound: 'tile', normalScale: 1.0 },
  mosaic:      { tex: 'mosaic', color: 0xffffff, tile: 1.0, sound: 'tile', normalScale: 0.8 },
  marble:      { tex: 'marble', color: 0xffffff, tile: 2.0, sound: 'tile', normalScale: 0.6 },
  concrete:    { tex: 'concrete', color: 0xd8d6d2, tile: 3.0, sound: 'hard' },
  concreteDark:{ tex: 'concrete', color: 0x8e8c88, tile: 3.0, sound: 'hard' },
  wood:        { tex: 'wood', color: 0xffffff, tile: 1.0, sound: 'wood' },
  woodDark:    { tex: 'wood', color: 0x7a5a48, tile: 1.0, sound: 'wood' },
  woodPale:    { tex: 'wood', color: 0xffe6cc, tile: 1.0, sound: 'wood' },
  wallpaper:   { tex: 'wallpaper', color: 0xffffff, tile: 1.4, sound: 'hard' },
  wallpaperBlue:{ tex: 'wallpaper', color: 0xb8c8d8, tile: 1.4, sound: 'hard' },
  hedge:       { tex: 'hedge', color: 0xffffff, tile: 1.2, sound: 'grass', normalScale: 1.4 },
  grass:       { tex: 'grass', color: 0xffffff, tile: 2.0, sound: 'grass' },
  flagstone:   { tex: 'flagstone', color: 0xffffff, tile: 3.0, sound: 'stone' },
  cardboard:   { tex: 'cardboard', color: 0xffffff, tile: 1.0, sound: 'cardboard' },
  fabric:      { tex: 'fabric', color: 0x6d7f99, tile: 0.25, sound: 'soft' },
  fabricRed:   { tex: 'fabric', color: 0xa5463f, tile: 0.25, sound: 'soft' },
  fabricGreen: { tex: 'fabric', color: 0x5f7d62, tile: 0.25, sound: 'soft' },
  fabricCream: { tex: 'fabric', color: 0xe3d9c6, tile: 0.25, sound: 'soft' },
  fabricMustard:{ tex: 'fabric', color: 0xc99a3a, tile: 0.25, sound: 'soft' },
  metal:       { tex: 'metal', color: 0xc8ccd2, tile: 1.0, metalness: 1.0, sound: 'metal' },
  metalDark:   { tex: 'metal', color: 0x50555c, tile: 1.0, metalness: 1.0, sound: 'metal' },
  brass:       { tex: 'metal', color: 0xd6a85a, tile: 1.0, metalness: 1.0, sound: 'metal' },
  chrome:      { color: 0xe8ecf0, metalness: 1.0, roughness: 0.12, sound: 'metal' },
  whitePlastic:{ color: 0xf2f2ef, roughness: 0.38, sound: 'plastic' },
  greyPlastic: { color: 0x8a8f96, roughness: 0.45, sound: 'plastic' },
  blackPlastic:{ color: 0x1d1f23, roughness: 0.4, sound: 'plastic' },
  rubber:      { color: 0x202224, roughness: 0.9, sound: 'soft' },
  trim:        { color: 0xf5f3ee, roughness: 0.42, sound: 'wood' },
  trimDark:    { color: 0x3b3430, roughness: 0.5, sound: 'wood' },
  frame:       { color: 0x2a2522, roughness: 0.35, sound: 'wood' },
  gold:        { color: 0xd9b162, metalness: 1.0, roughness: 0.25, sound: 'metal' },
  porcelain:   { color: 0xf7f6f2, roughness: 0.12, sound: 'ceramic' },
  paper:       { color: 0xf6f1e6, roughness: 0.9, sound: 'paper' },
  void:        { color: 0x000000, roughness: 1.0, sound: 'hard' },
};

const cache = new Map();

export function mat(name) {
  if (cache.has(name)) return cache.get(name);
  const d = DEF[name];
  if (!d) throw new Error('Unknown material ' + name);
  const m = new THREE.MeshStandardMaterial({
    color: d.color, roughness: d.roughness ?? 1.0, metalness: d.metalness ?? 0.0,
  });
  if (d.tex) {
    const t = getTextureSet(d.tex);
    m.map = t.map; m.normalMap = t.normalMap; m.roughnessMap = t.roughnessMap;
    const ns = d.normalScale ?? 1.0;
    m.normalScale.set(ns, ns);
    if (d.metalness) m.roughness = 1.0;
  }
  m.userData.tile = d.tile ?? 1.0;
  m.userData.sound = d.sound ?? 'hard';
  m.userData.name = name;
  cache.set(name, m);
  return m;
}

// Simple colored PBR material (cached by key).
export function colorMat(color, roughness = 0.5, metalness = 0, extra = {}) {
  const key = `c:${color}:${roughness}:${metalness}:${JSON.stringify(extra)}`;
  if (cache.has(key)) return cache.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  m.userData.tile = 1; m.userData.sound = extra.sound || 'plastic';
  delete m.sound;
  cache.set(key, m);
  return m;
}

export function emissiveMat(color, intensity = 3) {
  const key = `e:${color}:${intensity}`;
  if (cache.has(key)) return cache.get(key);
  const m = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: intensity, roughness: 1 });
  m.userData.tile = 1; m.userData.sound = 'hard';
  cache.set(key, m);
  return m;
}

export function glassMat(tint = 0xdfeff7, opacity = 0.18) {
  const key = `g:${tint}:${opacity}`;
  if (cache.has(key)) return cache.get(key);
  const m = new THREE.MeshPhysicalMaterial({ color: tint, roughness: 0.04, metalness: 0, transparent: true, opacity, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide });
  m.userData.tile = 1; m.userData.sound = 'glass';
  cache.set(key, m);
  return m;
}

export function soundOf(material) { return (material && material.userData && material.userData.sound) || 'hard'; }
