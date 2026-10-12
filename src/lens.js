import * as THREE from 'three';
import { BokehShader } from 'three/addons/shaders/BokehShader.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const APERTURE = 7.1;

export function createLens(renderer, scene, camera) {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
    samples: Math.min(4, renderer.capabilities.maxSamples),
  });
  target.texture.name = 'Lens.color';target.depthTexture.name = 'Lens.depth';
  const uniforms = THREE.UniformsUtils.clone(BokehShader.uniforms);
  uniforms.tColor.value = target.texture;uniforms.tDepth.value = target.depthTexture;
  const material = new THREE.ShaderMaterial({
    name: 'CameraLens', uniforms, defines: { ...BokehShader.defines, DEPTH_PACKING: 0 },
    vertexShader: BokehShader.vertexShader,
    fragmentShader: BokehShader.fragmentShader.replace('gl_FragColor.a = 1.0;', `
      gl_FragColor.a = col.a / 41.0;
      gl_FragColor.rgb /= max(gl_FragColor.a, 0.0001);
      #include <colorspace_fragment>
      #include <premultiplied_alpha_fragment>
    `),
    depthTest: false, depthWrite: false, blending: THREE.NoBlending, premultipliedAlpha: true,
  });
  const quad = new FullScreenQuad(material);
  const focusPoint = new THREE.Vector3();
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  let focus;
  return {
    setSize(width, height) {
      const pixelRatio = renderer.getPixelRatio();
      target.setSize(Math.max(1, Math.round(width * pixelRatio)), Math.max(1, Math.round(height * pixelRatio)));
      uniforms.aspect.value = width / Math.max(1, height);
      uniforms.maxblur.value = 16 / Math.max(1, width);
    },
    render(position, dt) {
      camera.updateMatrixWorld();
      const desiredFocus = Math.max(camera.near, -focusPoint.copy(position).applyMatrix4(camera.matrixWorldInverse).z);
      focus = focus === undefined || reducedMotion?.matches ? desiredFocus : THREE.MathUtils.damp(focus, desiredFocus, 8, dt);
      uniforms.focus.value = focus;
      uniforms.aperture.value = .08 / (APERTURE * focus);
      uniforms.nearClip.value = camera.near;uniforms.farClip.value = camera.far;
      const destination = renderer.getRenderTarget();
      // Reuse the scene's actual depth so masked building details stay in sync with the scan.
      renderer.setRenderTarget(target);renderer.render(scene, camera);
      renderer.setRenderTarget(destination);quad.render(renderer);
    },
    dispose() { target.dispose();material.dispose();quad.dispose(); },
  };
}
