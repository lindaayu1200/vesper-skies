export const SUN_DIRECTION = new THREE.Vector3(-0.55, 0.22, -0.72).normalize();
const VERTEX = `varying vec3 vWorld;
void main(){ vec4 p=modelMatrix*vec4(position,1.0); vWorld=p.xyz-cameraPosition; gl_Position=projectionMatrix*viewMatrix*p; }`;
const FRAGMENT = `uniform vec3 uSunDir; uniform float uNight; uniform float uTime; varying vec3 vWorld;
vec3 palette(float h){
  vec3 zen=vec3(0.11,0.16,0.37), mid=vec3(0.10,0.30,0.68), hor=vec3(0.96,0.31,0.10);
  return mix(mix(hor,mid,smoothstep(0.025,0.36,h)),zen,smoothstep(0.36,1.0,h));
}
void main(){ vec3 d=normalize(vWorld); float h=max(0.0,d.y); vec3 c=palette(h);
  float sun=max(dot(d,normalize(uSunDir)),0.0); float horizon=pow(1.0-h,2.2);
  c+=vec3(1.0,0.22,0.025)*pow(sun,22.0)*1.35; c+=vec3(1.0,0.32,0.08)*pow(sun,4.0)*horizon*0.68;
  vec3 night=vec3(0.002,0.006,0.035)+vec3(0.008,0.018,0.075)*h;
  c=mix(c,night,uNight); c+=vec3(0.78,0.16,0.045)*pow(1.0-h,7.0)*uNight*0.34;
  float disc=pow(max(sun,0.0),900.0)*(1.0-uNight);
  float glow=pow(max(sun,0.0),8.0)*(1.0-uNight)*1.15; c+=vec3(1.0,0.56,0.18)*(disc*1.7+glow);
  gl_FragColor=vec4(c,1.0);
}`;

export function makeAtmosphere(scene) {
  const sunDir = SUN_DIRECTION.clone();
  const material = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSunDir: { value: sunDir.clone() }, uNight: { value: 0 }, uTime: { value: 0 } },
    vertexShader: VERTEX, fragmentShader: FRAGMENT });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(9000, 32, 16), material);
  dome.frustumCulled = false; dome.renderOrder = -10; scene.add(dome);
  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffd38a, transparent: true, opacity: 0.98, depthWrite: false, depthTest: true, fog: false });
  const sun = new THREE.Mesh(new THREE.CircleGeometry(145, 32), sunMaterial);
  sun.renderOrder = 10; sun.position.copy(sunDir).multiplyScalar(6800); sun.lookAt(0, 0, 0); scene.add(sun);
  const stars = new Float32Array(420 * 3);
  for (let i = 0; i < 420; i += 1) { const a=Math.random()*Math.PI*2, e=0.08+Math.random()*0.9, r=8100, q=Math.sqrt(1-e*e); stars[i*3]=Math.cos(a)*q*r; stars[i*3+1]=e*r; stars[i*3+2]=Math.sin(a)*q*r; }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(stars, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xd9e7ff, size: 15, sizeAttenuation: false, transparent: true, opacity: 0, fog: false });
  const starField = new THREE.Points(starGeo, starMat); scene.add(starField);
  return { dome, sun, material, stars: starField, sunDir, night: 0 };
}

export function updateAtmosphere(atmo, sunDir, night, dt) {
  atmo.sunDir.copy(sunDir).normalize(); atmo.material.uniforms.uSunDir.value.copy(atmo.sunDir);
  atmo.sun.position.copy(atmo.sunDir).multiplyScalar(6800); atmo.sun.lookAt(0, 0, 0); atmo.sun.material.opacity = 0.98 * (1 - atmo.night);
  atmo.material.uniforms.uTime.value += Number(dt) || 0;
  const target = night ? 1 : 0; atmo.night += (target-atmo.night)*Math.min(1,(Number(dt)||0)*2.5);
  atmo.material.uniforms.uNight.value = atmo.night; atmo.stars.material.opacity = atmo.night*0.9;
}
