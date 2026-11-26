// Renderer + cinematic post-processing stack with automatic quality scaling.
import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode,
  VignetteEffect, SMAAEffect, SMAAPreset, NoiseEffect, BlendFunction, ChromaticAberrationEffect,
  BrightnessContrastEffect, HueSaturationEffect,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { setMaxAnisotropy } from './textures.js';

export const QUALITY = [
  { name: 'Low', pixelRatio: 0.7, ao: false, bloom: true, shadowSize: 512, smaa: false, shadows: true },
  { name: 'Medium', pixelRatio: 0.9, ao: true, aoMode: 'Low', bloom: true, shadowSize: 1024, smaa: true, shadows: true },
  { name: 'High', pixelRatio: 1.25, ao: true, aoMode: 'Medium', bloom: true, shadowSize: 2048, smaa: true, shadows: true },
  { name: 'Ultra', pixelRatio: 2.0, ao: true, aoMode: 'High', bloom: true, shadowSize: 2048, smaa: true, shadows: true },
];

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, stencil: false, depth: true, powerPreference: 'high-performance' });
    const r = this.renderer;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NoToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    setMaxAnisotropy(Math.min(8, r.capabilities.getMaxAnisotropy()));
    RectAreaLightUniformsLib.init();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.05, 600);
    this.scene.add(this.camera);

    this.tier = 2;
    this.autoQuality = true;
    this.frameTimes = [];
    this.lastAdjust = 0;
    this.exposure = 1.0;
    this.buildComposer();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  buildComposer() {
    const r = this.renderer;
    if (this.composer) this.composer.dispose();
    const q = QUALITY[this.tier];
    const composer = new EffectComposer(r, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
    composer.addPass(new RenderPass(this.scene, this.camera));

    this.aoPass = null;
    if (q.ao) {
      const ao = new N8AOPostPass(this.scene, this.camera, 1, 1);
      ao.configuration.aoRadius = 1.1;
      ao.configuration.distanceFalloff = 1.0;
      ao.configuration.intensity = 3.4;
      ao.configuration.halfRes = q.aoMode !== 'High';
      ao.configuration.gammaCorrection = false;
      ao.setQualityMode(q.aoMode);
      composer.addPass(ao);
      this.aoPass = ao;
    }

    this.bloom = new BloomEffect({ intensity: 0.85, luminanceThreshold: 0.92, luminanceSmoothing: 0.25, mipmapBlur: true, radius: 0.72, levels: 7 });
    this.tone = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
    this.vignette = new VignetteEffect({ darkness: 0.42, offset: 0.32 });
    this.grade = new BrightnessContrastEffect({ brightness: 0.0, contrast: 0.06 });
    this.sat = new HueSaturationEffect({ saturation: 0.06 });
    const effects = [];
    if (q.bloom) effects.push(this.bloom);
    effects.push(this.tone, this.grade, this.sat, this.vignette);
    composer.addPass(new EffectPass(this.camera, ...effects));

    if (q.smaa) composer.addPass(new EffectPass(this.camera, new SMAAEffect({ preset: SMAAPreset.HIGH })));

    this.ca = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.0007, 0.0005), radialModulation: true, modulationOffset: 0.35 });
    this.noise = new NoiseEffect({ blendFunction: BlendFunction.SOFT_LIGHT, premultiply: false });
    this.noise.blendMode.opacity.value = 0.12;
    composer.addPass(new EffectPass(this.camera, this.ca, this.noise));
    this.composer = composer;
    this.applyShadowSize();
    this.resize();
  }

  setTier(t, rebuild = true) {
    t = Math.max(0, Math.min(QUALITY.length - 1, t));
    if (t === this.tier && this.composer) return;
    this.tier = t;
    if (rebuild) this.buildComposer();
  }

  applyShadowSize() {
    const size = QUALITY[this.tier].shadowSize;
    this.scene.traverse((o) => {
      if (o.isLight && o.castShadow && o.shadow) {
        const s = Math.min(size, o.userData.maxShadow || size);
        if (o.shadow.mapSize.x !== s) {
          o.shadow.mapSize.set(s, s);
          if (o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; }
        }
      }
    });
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, QUALITY[this.tier].pixelRatio);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.composer) this.composer.setSize(w, h, false);
  }

  // Called every frame with the real frame delta; downgrades quality if we can't hold ~45fps.
  trackPerformance(dt) {
    if (!this.autoQuality) return;
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 90) return;
    const sorted = this.frameTimes.slice().sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    this.frameTimes.length = 0;
    const now = performance.now();
    if (now - this.lastAdjust < 2500) return;
    if (median > 1 / 42 && this.tier > 0) { this.lastAdjust = now; this.setTier(this.tier - 1); }
    else if (median < 1 / 85 && this.tier < 2 && now - this.lastAdjust > 15000) { this.lastAdjust = now; this.setTier(this.tier + 1); }
  }

  render(dt) {
    this.composer.render(dt);
  }
}
