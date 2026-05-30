import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Import passes manually as basic objects to avoid complex bundler resolution issues for Three examples
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

gsap.registerPlugin(ScrollTrigger);

interface ThreeRefs {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  composer: EffectComposer | null;
  stars: THREE.Points[];
  nebula: THREE.Mesh | null;
  mountains: THREE.Mesh[];
  animationId: number | null;
  targetCameraX?: number;
  targetCameraY?: number;
  targetCameraZ?: number;
  locations?: number[];
}

export const Component = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const smoothCameraPos = useRef({ x: 0, y: 30, z: 100 });
  
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentSection, setCurrentSection] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const totalSections = 3;
  
  const threeRefs = useRef<ThreeRefs>({
    scene: null,
    camera: null,
    renderer: null,
    composer: null,
    stars: [],
    nebula: null,
    mountains: [],
    animationId: null
  });

  // Initialize Three.js
  useEffect(() => {
    const { current: refs } = threeRefs;
    if (!canvasRef.current) return;

    const initThree = () => {
      // Scene setup
      refs.scene = new THREE.Scene();
      refs.scene.fog = new THREE.FogExp2(0x000000, 0.00025);

      // Camera
      refs.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        2000
      );
      refs.camera.position.z = 300;
      refs.camera.position.y = 30;

      // Renderer
      refs.renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current!,
        antialias: true,
        alpha: true
      });
      refs.renderer.setSize(window.innerWidth, window.innerHeight);
      refs.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      refs.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      refs.renderer.toneMappingExposure = 0.5;

      // Post-processing
      refs.composer = new EffectComposer(refs.renderer);
      const renderPass = new RenderPass(refs.scene, refs.camera);
      refs.composer.addPass(renderPass);

      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.8,
        0.4,
        0.85
      );
      refs.composer.addPass(bloomPass);

      // Create scene elements
      createStarField();
      createNebula();
      createMountains();
      createAtmosphere();
      getLocation();

      // Set initial target values
      refs.targetCameraX = 0;
      refs.targetCameraY = 30;
      refs.targetCameraZ = 300;

      // Start animation
      animate();
      
      // Mark as ready after Three.js is initialized
      setIsReady(true);
    };

    const createStarField = () => {
      if (!refs.scene) return;
      const starCount = 2000;
      
      for (let i = 0; i < 3; i++) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);

        for (let j = 0; j < starCount; j++) {
          const radius = 200 + Math.random() * 800;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(Math.random() * 2 - 1);

          positions[j * 3] = radius * Math.sin(phi) * Math.cos(theta);
          positions[j * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
          positions[j * 3 + 2] = radius * Math.cos(phi);

          // Color variation
          const color = new THREE.Color();
          const colorChoice = Math.random();
          if (colorChoice < 0.7) {
            color.setHSL(0, 0, 0.8 + Math.random() * 0.2);
          } else if (colorChoice < 0.9) {
            color.setHSL(0.08, 0.5, 0.8);
          } else {
            color.setHSL(0.6, 0.5, 0.8);
          }
          
          colors[j * 3] = color.r;
          colors[j * 3 + 1] = color.g;
          colors[j * 3 + 2] = color.b;

          sizes[j] = Math.random() * 2 + 0.5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            depth: { value: { value: i } }
          },
          vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            uniform float time;
            
            void main() {
              vColor = color;
              vec3 pos = position;
              
              // Slow rotation
              float angle = time * 0.02;
              mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
              pos.xy = rot * pos.xy;
              
              vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
              gl_PointSize = size * (300.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `,
          fragmentShader: `
            varying vec3 vColor;
            
            void main() {
              float dist = length(gl_PointCoord - vec2(0.5));
              if (dist > 0.5) discard;
              
              float opacity = 1.0 - smoothstep(0.0, 0.5, dist);
              gl_FragColor = vec4(vColor, opacity);
            }
          `,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });

        const stars = new THREE.Points(geometry, material);
        refs.scene.add(stars);
        refs.stars.push(stars);
      }
    };

    const createNebula = () => {
      if (!refs.scene) return;
      
      const geometry = new THREE.PlaneGeometry(8000, 4000, 10, 10);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color1: { value: new THREE.Color(0x0033ff) },
          color2: { value: new THREE.Color(0xff0066) },
          opacity: { value: 0.2 }
        },
        vertexShader: `
          varying vec2 vUv;
          varying float vElevation;
          uniform float time;
          
          void main() {
            vUv = uv;
            vec3 pos = position;
            
            float elevation = sin(pos.x * 0.005 + time) * cos(pos.y * 0.005 + time) * 10.0;
            pos.z += elevation;
            vElevation = elevation;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 color1;
          uniform vec3 color2;
          uniform float opacity;
          uniform float time;
          varying vec2 vUv;
          varying float vElevation;
          
          void main() {
            float mixFactor = sin(vUv.x * 5.0 + time) * cos(vUv.y * 5.0 + time);
            vec3 color = mix(color1, color2, mixFactor * 0.5 + 0.5);
            
            float alpha = opacity * (1.0 - length(vUv - 0.5) * 2.0);
            alpha *= 1.0 + vElevation * 0.02;
            
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const nebula = new THREE.Mesh(geometry, material);
      nebula.position.z = -1050;
      refs.scene.add(nebula);
      refs.nebula = nebula;
    };

    const createMountains = () => {
      if (!refs.scene) return;
      
      const layers = [
        { distance: -50, height: 60, color: 0x05050a, opacity: 1 },
        { distance: -100, height: 80, color: 0x0b0b18, opacity: 0.9 },
        { distance: -150, height: 100, color: 0x11112c, opacity: 0.7 },
        { distance: -200, height: 120, color: 0x1a163e, opacity: 0.5 }
      ];

      layers.forEach((layer) => {
        const points = [];
        const segments = 40;
        
        for (let i = 0; i <= segments; i++) {
          const x = (i / segments - 0.5) * 1200;
          const y = Math.sin(i * 0.15) * layer.height * 0.6 + 
                   Math.sin(i * 0.08) * layer.height * 0.3 +
                   Math.random() * layer.height * 0.1 - 90;
          points.push(new THREE.Vector2(x, y));
        }
        
        points.push(new THREE.Vector2(1000, -400));
        points.push(new THREE.Vector2(-1000, -400));

        const shape = new THREE.Shape(points);
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({
          color: layer.color,
          transparent: true,
          opacity: layer.opacity,
          side: THREE.DoubleSide
        });

        const mountain = new THREE.Mesh(geometry, material);
        mountain.position.z = layer.distance;
        mountain.position.y = layer.distance * 0.6;
        refs.scene!.add(mountain);
        refs.mountains.push(mountain);
      });
    };

    const createAtmosphere = () => {
      if (!refs.scene) return;
      
      const geometry = new THREE.SphereGeometry(600, 16, 16);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 }
        },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          uniform float time;
          
          void main() {
            float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            vec3 atmosphere = vec3(0.2, 0.4, 0.9) * intensity;
            
            float pulse = sin(time * 1.5) * 0.08 + 0.92;
            atmosphere *= pulse;
            
            gl_FragColor = vec4(atmosphere, intensity * 0.2);
          }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
      });

      const atmosphere = new THREE.Mesh(geometry, material);
      refs.scene.add(atmosphere);
    };

    const getLocation = () => {
      const locations: number[] = [];
      refs.mountains.forEach((mountain, i) => {
        locations[i] = mountain.position.z;
      });
      refs.locations = locations;
    };

    const animate = () => {
      refs.animationId = requestAnimationFrame(animate);
      
      const time = Date.now() * 0.001;

      // Update stars
      refs.stars.forEach((starField) => {
        if (starField.material && (starField.material as THREE.ShaderMaterial).uniforms) {
          (starField.material as THREE.ShaderMaterial).uniforms.time.value = time;
        }
      });

      // Update nebula
      if (refs.nebula && refs.nebula.material && (refs.nebula.material as THREE.ShaderMaterial).uniforms) {
        (refs.nebula.material as THREE.ShaderMaterial).uniforms.time.value = time * 0.4;
      }

      // Smooth camera movement with easing
      if (refs.camera && refs.targetCameraX !== undefined && refs.targetCameraY !== undefined && refs.targetCameraZ !== undefined) {
        const smoothingFactor = 0.05;
        
        smoothCameraPos.current.x += (refs.targetCameraX - smoothCameraPos.current.x) * smoothingFactor;
        smoothCameraPos.current.y += (refs.targetCameraY - smoothCameraPos.current.y) * smoothingFactor;
        smoothCameraPos.current.z += (refs.targetCameraZ - smoothCameraPos.current.z) * smoothingFactor;
        
        // Add subtle floating motion
        const floatX = Math.sin(time * 0.15) * 1.5;
        const floatY = Math.cos(time * 0.2) * 0.8;
        
        refs.camera.position.x = smoothCameraPos.current.x + floatX;
        refs.camera.position.y = smoothCameraPos.current.y + floatY;
        refs.camera.position.z = smoothCameraPos.current.z;
        refs.camera.lookAt(0, 10, -600);
      }

      // Parallax mountains
      refs.mountains.forEach((mountain, i) => {
        const parallaxFactor = 1 + i * 0.4;
        mountain.position.x = Math.sin(time * 0.12) * 1.5 * parallaxFactor;
      });

      if (refs.composer) {
        refs.composer.render();
      }
    };

    initThree();

    // Handle resize
    const handleResize = () => {
      if (refs.camera && refs.renderer && refs.composer) {
        refs.camera.aspect = window.innerWidth / window.innerHeight;
        refs.camera.updateProjectionMatrix();
        refs.renderer.setSize(window.innerWidth, window.innerHeight);
        refs.composer.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (refs.animationId) {
        cancelAnimationFrame(refs.animationId);
      }

      window.removeEventListener('resize', handleResize);

      // Dispose Three.js resources
      refs.stars.forEach(starField => {
        starField.geometry.dispose();
        if (Array.isArray(starField.material)) {
          starField.material.forEach(m => m.dispose());
        } else {
          starField.material.dispose();
        }
      });

      refs.mountains.forEach(mountain => {
        mountain.geometry.dispose();
        if (Array.isArray(mountain.material)) {
          mountain.material.forEach(m => m.dispose());
        } else {
          mountain.material.dispose();
        }
      });

      if (refs.nebula) {
        refs.nebula.geometry.dispose();
        if (Array.isArray(refs.nebula.material)) {
          refs.nebula.material.forEach(m => m.dispose());
        } else {
          refs.nebula.material.dispose();
        }
      }

      if (refs.renderer) {
        refs.renderer.dispose();
      }
    };
  }, []);

  // GSAP Animations
  useEffect(() => {
    if (!isReady) return;
    
    gsap.set([menuRef.current, titleRef.current, subtitleRef.current, scrollProgressRef.current], {
      visibility: 'visible'
    });

    const tl = gsap.timeline();

    if (menuRef.current) {
      tl.from(menuRef.current, {
        x: -50,
        opacity: 0,
        duration: 1.2,
        ease: "power3.out"
      });
    }

    if (titleRef.current) {
      tl.from(titleRef.current, {
        y: 80,
        opacity: 0,
        duration: 1.4,
        ease: "power4.out"
      }, "-=0.8");
    }

    if (subtitleRef.current) {
      tl.from(subtitleRef.current.querySelectorAll('.subtitle-line'), {
        y: 30,
        opacity: 0,
        duration: 1,
        stagger: 0.15,
        ease: "power3.out"
      }, "-=0.8");
    }

    if (scrollProgressRef.current) {
      tl.from(scrollProgressRef.current, {
        opacity: 0,
        y: 30,
        duration: 1,
        ease: "power2.out"
      }, "-=0.6");
    }

    return () => {
      tl.kill();
    };
  }, [isReady]);

  // Scroll handler coordinates
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      const maxScroll = Math.max(1, documentHeight - windowHeight);
      const progress = Math.min(scrollY / maxScroll, 1);
      
      setScrollProgress(progress);
      const newSection = Math.min(totalSections - 1, Math.floor(progress * totalSections));
      setCurrentSection(newSection);

      const { current: refs } = threeRefs;
      
      const totalProgress = progress * totalSections;
      const sectionProgress = totalProgress % 1;
      
      const cameraPositions = [
        { x: 0, y: 30, z: 300 },   // Section 0 - HORIZON (Resting)
        { x: 0, y: 40, z: -50 },    // Section 1 - COSMOS (Deeper space)
        { x: 0, y: 55, z: -700 }    // Section 2 - INFINITY (Abyss)
      ];
      
      const currentPos = cameraPositions[newSection] || cameraPositions[0];
      const nextPos = cameraPositions[newSection + 1] || currentPos;
      
      refs.targetCameraX = currentPos.x + (nextPos.x - currentPos.x) * sectionProgress;
      refs.targetCameraY = currentPos.y + (nextPos.y - currentPos.y) * sectionProgress;
      refs.targetCameraZ = currentPos.z + (nextPos.z - currentPos.z) * sectionProgress;

      // Parallax update
      refs.mountains.forEach((mountain, i) => {
        const speed = 1 + i * 0.8;
        const targetZ = (refs.locations ? refs.locations[i] : -50) + scrollY * speed * 0.3;
        
        if (progress > 0.72) {
          mountain.position.z = 20000; // Float away
        } else {
          mountain.position.z = targetZ;
        }
      });

      if (refs.nebula && refs.mountains[3]) {
        refs.nebula.position.z = refs.mountains[3].position.z - 200;
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [totalSections]);

  return (
    <div ref={containerRef} className="hero-container cosmos-style relative w-full h-[300vh] bg-black text-white">
      <canvas ref={canvasRef} className="hero-canvas fixed inset-0 w-full h-full z-0 pointer-events-none" />
      
      {/* Side menu info indicator */}
      <div ref={menuRef} className="side-menu fixed left-8 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-4" style={{ visibility: 'hidden' }}>
        <div className="menu-icon flex flex-col gap-1 w-6 cursor-pointer">
          <span className="h-0.5 w-full bg-white/70"></span>
          <span className="h-0.5 w-full bg-white/70"></span>
          <span className="h-0.5 w-full bg-white/70"></span>
        </div>
        <div className="vertical-text text-xs uppercase tracking-[0.4em] text-white/50 select-none [writing-mode:vertical-lr] rotate-180">ADMIN SUITE</div>
      </div>

      {/* Dynamic Title / Section Text */}
      <div className="fixed inset-0 flex flex-col items-center justify-center z-10 pointer-events-none px-4">
        <h1 ref={titleRef} className="hero-title text-7xl md:text-9xl font-black tracking-[0.25em] text-center bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 uppercase">
          {currentSection === 0 ? "HORIZON" : currentSection === 1 ? "COSMOS" : "INFINITY"}
        </h1>
        
        <div ref={subtitleRef} className="hero-subtitle cosmos-subtitle mt-6 text-center max-w-xl text-white/70 text-sm md:text-lg tracking-wide leading-relaxed">
          {currentSection === 0 && (
            <>
              <p className="subtitle-line">Where vision meets reality,</p>
              <p className="subtitle-line">we shape the premium workspace of tomorrow</p>
            </>
          )}
          {currentSection === 1 && (
            <>
              <p className="subtitle-line">Absolute control across all screens.</p>
              <p className="subtitle-line">Manage workforce records and track corporate tasks instantly</p>
            </>
          )}
          {currentSection === 2 && (
            <>
              <p className="subtitle-line">Live statistics and financial pulses.</p>
              <p className="subtitle-line">Your command center for endless productivity</p>
            </>
          )}
        </div>
      </div>

      {/* Scroll indicator overlay */}
      <div ref={scrollProgressRef} className="scroll-progress fixed right-12 bottom-12 z-20 flex items-center gap-4" style={{ visibility: 'hidden' }}>
        <div className="scroll-text text-xs font-semibold tracking-widest text-white/50">SCROLL DOWN</div>
        <div className="progress-track w-24 h-[2px] bg-white/20 relative rounded-full overflow-hidden">
          <div 
            className="progress-fill absolute left-0 top-0 h-full bg-accent transition-all duration-150" 
            style={{ width: `${scrollProgress * 100}%` }}
          />
        </div>
        <div className="section-counter text-sm font-mono text-white/70">
          0{currentSection + 1} / 0{totalSections}
        </div>
      </div>

      {/* Story teller section scrolls to register heights */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="h-screen w-full"></div>
        <div className="h-screen w-full"></div>
        <div className="h-screen w-full"></div>
      </div>
    </div>
  );
};
