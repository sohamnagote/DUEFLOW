import React, { useEffect, useRef } from 'react';

interface AmbientShaderCanvasProps {
  className?: string;
  opacity?: number;
  fadeOnScroll?: boolean;
  fadeDistance?: number;
}

export const AmbientShaderCanvas: React.FC<AmbientShaderCanvasProps> = ({
  className = 'fixed inset-0 pointer-events-none z-0',
  opacity = 0.82,
  fadeOnScroll = true,
  fadeDistance,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fadeRef = useRef<number>(1.0);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !container) return;

    // WebGL Context
    const gl = (canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    }) ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

    if (!gl) return;

    let animationFrameId: number;
    let isDisposed = false;

    // Vertex Shader: Fullscreen quad
    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    // Fragment Shader: Smooth looping chromatic ribbon dome with fade
    const fs = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_fade;

// 2D Simplex Noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    
    // Seamless harmonic loop period: exactly 14.0 seconds per cycle
    const float LOOP_PERIOD = 14.0;
    const float TAU = 6.283185307179586;
    float loopProgress = fract(u_time / LOOP_PERIOD);
    float angle = loopProgress * TAU;
    
    // Circular orbital coordinates for continuous, seamless cyclic motion
    vec2 orb1 = vec2(cos(angle), sin(angle));
    vec2 orb2 = vec2(cos(angle * 2.0), sin(angle * 2.0));
    vec2 orb3 = vec2(sin(angle + 1.570796), cos(angle + 1.570796));
    
    // Smooth mouse responsiveness
    vec2 mouseOffset = (u_mouse / u_resolution - 0.5) * 0.12;
    vec2 centerPos = p - mouseOffset;
    
    // Undulating breathing aura dome
    float breathe = 1.0 + 0.07 * sin(angle);
    vec2 domePos = centerPos;
    domePos.y += 0.07 + 0.03 * cos(angle);
    
    float arcDist = length(vec2(domePos.x * 0.65, (domePos.y + 0.52) * breathe));
    float ribbon = smoothstep(0.96 * breathe, 0.58, arcDist) * smoothstep(0.18, 0.54 * breathe, arcDist);
    
    // Seamless periodic noise fields
    float n1 = snoise(centerPos * 1.55 + orb1 * 0.52);
    float n2 = snoise(centerPos * 2.40 + orb2 * 0.36 + vec2(orb1.y, -orb1.x) * 0.22);
    float n3 = snoise(centerPos * 3.10 - orb3 * 0.28);
    
    vec2 warpedUV = centerPos + vec2(n1, n2) * 0.17 + orb1 * 0.04;
    
    // DueFlow Distinctive Brand Palette
    vec3 colIvory    = vec3(0.984, 0.976, 0.957); // #fbf9f4
    vec3 colNavy     = vec3(0.082, 0.149, 0.235); // #15263C
    vec3 colTeal     = vec3(0.620, 0.788, 0.768); // #9EC9C4
    vec3 colDeepTeal = vec3(0.239, 0.396, 0.384); // #3D6562
    vec3 colCoral    = vec3(0.913, 0.560, 0.482); // #E98F7B
    vec3 colPeach    = vec3(0.949, 0.713, 0.654); // #F2B6A7
    vec3 colLavender = vec3(0.851, 0.815, 0.909); // #D9D0E8
    
    // Fluid chromatic gradient flowing horizontally across the aura
    float xFactor = clamp((warpedUV.x + 0.62 + 0.06 * sin(angle)) * 0.88, 0.0, 1.0);
    vec3 auraColor = mix(colTeal, colCoral, smoothstep(0.08, 0.46, xFactor));
    auraColor = mix(auraColor, colPeach, smoothstep(0.40, 0.74, xFactor));
    auraColor = mix(auraColor, colLavender, smoothstep(0.70, 0.98, xFactor));
    
    // Signature DueFlow deep navy crest atop the dome
    float crestDist = abs(arcDist - 0.74);
    float navyCrest = smoothstep(0.18, 0.015, crestDist) * smoothstep(-0.45, 0.12, domePos.x + n1 * 0.22);
    auraColor = mix(auraColor, colNavy, clamp(navyCrest * 0.94, 0.0, 1.0));
    
    // Accent teal undertone
    float innerAccent = smoothstep(0.40, 0.22, arcDist) * smoothstep(-0.25, 0.35, domePos.x);
    auraColor = mix(auraColor, colDeepTeal, clamp(innerAccent * 0.42, 0.0, 1.0));
    
    // Dynamic intensity modulated by fade
    float intensity = ribbon * (0.86 + 0.28 * n2 + 0.12 * n3);
    intensity = clamp(intensity * u_fade, 0.0, 1.0);
    
    // Subtle organic film grain texture
    float grain = (fract(sin(dot(gl_FragCoord.xy + fract(u_time * 0.87), vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.022;
    vec3 finalColor = mix(colIvory, auraColor, intensity * 0.82) + grain * intensity;
    
    gl_FragColor = vec4(finalColor, 1.0);
}`;

    const createShader = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertShader = createShader(gl.VERTEX_SHADER, vs);
    const fragShader = createShader(gl.FRAGMENT_SHADER, fs);
    if (!vertShader || !fragShader) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vertShader);
    gl.attachShader(prog, fragShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('Program link error:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');
    const uFade = gl.getUniformLocation(prog, 'u_fade');

    // Smooth mouse coordinates with lerp
    let targetMouseX = window.innerWidth * 0.5;
    let targetMouseY = window.innerHeight * 0.5;
    let currentMouseX = targetMouseX;
    let currentMouseY = targetMouseY;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // HiDPI aware viewport sizing
    const syncSize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor((canvas.clientWidth || window.innerWidth) * dpr);
      const h = Math.floor((canvas.clientHeight || window.innerHeight) * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    syncSize();

    // Scroll Fade Logic: Fades away smoothly as user scrolls down
    const updateScrollFade = () => {
      if (!fadeOnScroll || !container) {
        fadeRef.current = 1.0;
        return;
      }

      const scrollY = window.scrollY || window.pageYOffset || 0;
      // Fade completely over roughly 70% of viewport height or provided fadeDistance
      const threshold = fadeDistance || Math.max(window.innerHeight * 0.72, 480);
      const progress = Math.min(Math.max(scrollY / threshold, 0), 1);
      
      // Smoothstep easing: 1 - (3t^2 - 2t^3)
      const smoothFade = 1.0 - (progress * progress * (3.0 - 2.0 * progress));
      fadeRef.current = smoothFade;

      const currentOpacity = Math.max(0, Math.min(1, opacity * smoothFade));
      
      container.style.opacity = currentOpacity.toFixed(3);
      // Gentle parallax translation upward as it fades away
      container.style.transform = `translate3d(0, ${(-scrollY * 0.22).toFixed(1)}px, 0)`;
      container.style.visibility = currentOpacity <= 0.005 ? 'hidden' : 'visible';
    };

    // Initial update
    updateScrollFade();

    window.addEventListener('scroll', updateScrollFade, { passive: true });
    window.addEventListener('resize', () => {
      syncSize();
      updateScrollFade();
    });

    const startTime = performance.now();

    const render = (now: number) => {
      if (isDisposed) return;

      // When completely scrolled past, throttle draw calls to preserve GPU/battery
      if (fadeRef.current <= 0.005) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      syncSize();
      gl.viewport(0, 0, canvas.width, canvas.height);

      // Lerp mouse
      currentMouseX += (targetMouseX - currentMouseX) * 0.06;
      currentMouseY += (targetMouseY - currentMouseY) * 0.06;

      const elapsedSeconds = (now - startTime) * 0.001;

      if (uTime) gl.uniform1f(uTime, elapsedSeconds);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, currentMouseX, currentMouseY);
      if (uFade) gl.uniform1f(uFade, fadeRef.current);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('scroll', updateScrollFade);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', syncSize);
      if (prog) gl.deleteProgram(prog);
      if (vertShader) gl.deleteShader(vertShader);
      if (fragShader) gl.deleteShader(fragShader);
      if (buf) gl.deleteBuffer(buf);
    };
  }, [opacity, fadeOnScroll, fadeDistance]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        opacity,
        willChange: 'opacity, transform',
        transition: 'opacity 0.15s ease-out',
      }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
