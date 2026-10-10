import React, { useEffect, useRef } from 'react';

interface AmbientShaderCanvasProps {
  className?: string;
  opacity?: number;
  fadeOnScroll?: boolean;
  fadeDistance?: number;
}

export const AmbientShaderCanvas: React.FC<AmbientShaderCanvasProps> = ({
  className = 'fixed inset-0 pointer-events-none z-0',
  opacity = 0.88,
  fadeOnScroll = false,
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

    // Fragment Shader: Continuous full-page flowing ambient aura shader
    const fs = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_scroll;
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
    // Viewport-relative coordinates centered at screen center
    vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    
    // Normalized scroll parameter
    float scrollProgress = u_scroll / min(u_resolution.x, u_resolution.y);
    
    // Seamless harmonic loop period: exactly 14.0 seconds per cycle
    const float LOOP_PERIOD = 14.0;
    const float TAU = 6.283185307179586;
    float loopProgress = fract(u_time / LOOP_PERIOD);
    float angle = loopProgress * TAU;
    
    // Circular orbital coordinates for continuous, seamless cyclic motion
    vec2 orb1 = vec2(cos(angle), sin(angle));
    vec2 orb2 = vec2(cos(angle * 2.0), sin(angle * 2.0));
    vec2 orb3 = vec2(sin(angle + 1.570796), cos(angle + 1.570796));
    
    // Smooth mouse tilt
    vec2 mouseOffset = (u_mouse / u_resolution - 0.5) * 0.10;
    vec2 centerPos = p - mouseOffset;
    
    // Hero Dome positioning with natural vertical scroll drift
    float breathe = 1.0 + 0.07 * sin(angle);
    vec2 domePos = centerPos;
    domePos.y += 0.07 + 0.03 * cos(angle) - scrollProgress * 0.40;
    
    // Primary hero ribbon dome
    float arcDist = length(vec2(domePos.x * 0.65, (domePos.y + 0.52) * breathe));
    float heroRibbon = smoothstep(0.96 * breathe, 0.58, arcDist) * smoothstep(0.18, 0.54 * breathe, arcDist);
    
    // Continuous multi-octave noise fields with continuous scroll translation
    vec2 scrollCoord = centerPos + vec2(0.0, scrollProgress * 0.25);
    float n1 = snoise(scrollCoord * 1.45 + orb1 * 0.48);
    float n2 = snoise(scrollCoord * 2.25 + orb2 * 0.32 + vec2(orb1.y, -orb1.x) * 0.20);
    float n3 = snoise(scrollCoord * 3.10 - orb3 * 0.26);
    
    vec2 warpedUV = centerPos + vec2(n1, n2) * 0.18 + orb1 * 0.05 + vec2(0.0, scrollProgress * 0.12);
    
    // DueFlow Distinctive Brand Palette
    vec3 colIvory    = vec3(0.984, 0.976, 0.957); // #fbf9f4
    vec3 colNavy     = vec3(0.082, 0.149, 0.235); // #15263C
    vec3 colTeal     = vec3(0.620, 0.788, 0.768); // #9EC9C4
    vec3 colDeepTeal = vec3(0.239, 0.396, 0.384); // #3D6562
    vec3 colCoral    = vec3(0.913, 0.560, 0.482); // #E98F7B
    vec3 colPeach    = vec3(0.949, 0.713, 0.654); // #F2B6A7
    vec3 colLavender = vec3(0.851, 0.815, 0.909); // #D9D0E8
    
    // Full-page ambient color currents: smooth chromatic blend across entire viewport
    float xFactor = clamp((warpedUV.x + 0.58 + 0.10 * sin(angle + warpedUV.y * 1.6)) * 0.88, 0.0, 1.0);
    vec3 auraColor = mix(colTeal, colCoral, smoothstep(0.06, 0.44, xFactor));
    auraColor = mix(auraColor, colPeach, smoothstep(0.38, 0.74, xFactor));
    auraColor = mix(auraColor, colLavender, smoothstep(0.68, 0.98, xFactor));
    
    // Hero deep navy crest atop the dome
    float crestDist = abs(arcDist - 0.74);
    float navyCrest = smoothstep(0.18, 0.015, crestDist) * smoothstep(-0.45, 0.12, domePos.x + n1 * 0.22);
    auraColor = mix(auraColor, colNavy, clamp(navyCrest * 0.92, 0.0, 1.0));
    
    // Ambient teal & deep-teal undertones flowing across the whole page
    float flowAccent = smoothstep(0.38, 0.18, abs(sin(warpedUV.y * 2.2 + warpedUV.x * 1.3 + angle * 0.6) - 0.32));
    auraColor = mix(auraColor, colDeepTeal, clamp(flowAccent * 0.26, 0.0, 1.0));
    
    // Full-page continuous ambient flow (guarantees the shader covers the entire page without blank gaps)
    float wave1 = sin(warpedUV.y * 2.0 + warpedUV.x * 1.2 + angle * 0.7);
    float wave2 = cos(warpedUV.x * 1.6 - warpedUV.y * 1.5 - angle * 0.5);
    float fullPageAmbient = 0.34 + 0.16 * wave1 + 0.12 * wave2 + 0.16 * n2;
    
    // Combined intensity: hero dome provides dramatic focus in hero; full-page ambient provides seamless luminous flow everywhere
    float intensity = clamp(heroRibbon * 0.65 + fullPageAmbient * 0.42 + 0.06 * n3, 0.16, 0.88);
    intensity = intensity * u_fade;
    
    // Subtle organic film grain texture
    float grain = (fract(sin(dot(gl_FragCoord.xy + fract(u_time * 0.87), vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.016;
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
    const uScroll = gl.getUniformLocation(prog, 'u_scroll');
    const uFade = gl.getUniformLocation(prog, 'u_fade');

    // Smooth mouse coordinates with lerp
    let targetMouseX = window.innerWidth * 0.5;
    let targetMouseY = window.innerHeight * 0.5;
    let currentMouseX = targetMouseX;
    let currentMouseY = targetMouseY;

    // Smooth scroll position tracking
    let targetScrollY = window.scrollY || window.pageYOffset || 0;
    let currentScrollY = targetScrollY;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Optional legacy scroll-fade (disabled by default for full-page coverage)
    const handleScroll = () => {
      targetScrollY = window.scrollY || window.pageYOffset || 0;
      if (fadeOnScroll && container) {
        const threshold = fadeDistance || Math.max(window.innerHeight * 0.72, 480);
        const progress = Math.min(Math.max(targetScrollY / threshold, 0), 1);
        const smoothFade = 1.0 - (progress * progress * (3.0 - 2.0 * progress));
        fadeRef.current = smoothFade;
        const currentOpacity = Math.max(0, Math.min(1, opacity * smoothFade));
        container.style.opacity = currentOpacity.toFixed(3);
        container.style.visibility = currentOpacity <= 0.005 ? 'hidden' : 'visible';
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Accessibility: respects prefers-reduced-motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = motionQuery.matches;
    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches;
    };
    motionQuery.addEventListener('change', handleMotionChange);

    // HiDPI aware viewport sizing with performance cap (1.5 max DPR)
    const syncSize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.floor((canvas.clientWidth || window.innerWidth) * dpr);
      const h = Math.floor((canvas.clientHeight || window.innerHeight) * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    syncSize();

    window.addEventListener('resize', syncSize);

    const startTime = performance.now();

    const render = (now: number) => {
      if (isDisposed) return;

      // Throttle when page is hidden in background tab
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      if (fadeOnScroll && fadeRef.current <= 0.005) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      syncSize();
      gl.viewport(0, 0, canvas.width, canvas.height);

      // Lerp mouse
      currentMouseX += (targetMouseX - currentMouseX) * 0.06;
      currentMouseY += (targetMouseY - currentMouseY) * 0.06;

      // Lerp scroll
      currentScrollY += (targetScrollY - currentScrollY) * 0.08;

      const elapsedSeconds = prefersReducedMotion ? 2.5 : (now - startTime) * 0.001;

      if (uTime) gl.uniform1f(uTime, elapsedSeconds);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, currentMouseX, currentMouseY);
      if (uScroll) gl.uniform1f(uScroll, currentScrollY);
      if (uFade) gl.uniform1f(uFade, fadeRef.current);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', syncSize);
      motionQuery.removeEventListener('change', handleMotionChange);
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
        willChange: 'opacity',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="w-full h-full block pointer-events-none" />
    </div>
  );
};
