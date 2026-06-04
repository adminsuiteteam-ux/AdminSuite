import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ContainerScroll } from './container-scroll-animation';
import { Button } from './button';
import { ArrowRight, Sparkles, Sun, Moon, Menu, X } from 'lucide-react';

interface ThreeRefs {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  composer: EffectComposer | null;
  particles: THREE.Points[];
  floatingElements: THREE.Object3D[];
  animationId: number | null;
  targetCameraX: number;
  targetCameraY: number;
  targetCameraZ: number;
}

const SECTIONS = [
  {
    title: 'Manage Employees',
    description:
      'Onboard team members, assign custom workspace roles, and monitor personnel performance — all from a single, intelligent dashboard. Full biometric security, role-based access controls, and real-time attendance tracking.',
    highlights: [
      'Custom Role Assignment',
      'Onboarding Workflows',
      'Attendance Tracking',
      'Performance Analytics',
      'Biometric Security',
    ],
  },
  {
    title: 'Track Clients & Projects',
    description:
      'Maintain detailed client portfolios, coordinate project timelines, organize deliverables, and manage retainers from a unified command center. Visual Kanban boards and milestone trackers keep every project on schedule.',
    highlights: [
      'Client Portfolios',
      'Project Timelines',
      'Kanban Boards',
      'Milestone Tracking',
      'Retainer Management',
    ],
  },
  {
    title: 'Financial Control',
    description:
      'Real-time profit tracking, expense logging, income reporting, and transparent financial analytics synced directly to your database. Generate invoices, track payments, and visualize your cash flow with interactive charts.',
    highlights: [
      'Profit & Loss Reports',
      'Expense Logging',
      'Invoice Generation',
      'Payment Tracking',
      'Cash Flow Charts',
    ],
  },
];

export const Component = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const smoothCameraPos = useRef({ x: 0, y: 20, z: 150 });
  const [scrollY, setScrollY] = useState(0);
  const [isDark, setIsDark] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const totalSections = 3;

  const toggleTheme = useCallback(() => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      setIsDark(false);
    } else {
      html.classList.add('dark');
      setIsDark(true);
    }
  }, []);

  const threeRefs = useRef<ThreeRefs>({
    scene: null,
    camera: null,
    renderer: null,
    composer: null,
    particles: [],
    floatingElements: [],
    animationId: null,
    targetCameraX: 0,
    targetCameraY: 20,
    targetCameraZ: 150,
  });

  /* ════════════════ Three.js Initialisation ════════════════ */
  useEffect(() => {
    const { current: refs } = threeRefs;
    if (!canvasRef.current) return;

    const initThree = () => {
      // Scene
      refs.scene = new THREE.Scene();
      refs.scene.fog = new THREE.FogExp2(0x07080f, 0.002);

      // Camera
      refs.camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        2000
      );
      refs.camera.position.set(0, 20, 150);

      // Renderer
      refs.renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current!,
        antialias: true,
        alpha: true,
      });
      refs.renderer.setSize(window.innerWidth, window.innerHeight);
      refs.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      refs.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      refs.renderer.toneMappingExposure = 0.6;

      // Post-processing (bloom)
      refs.composer = new EffectComposer(refs.renderer);
      refs.composer.addPass(new RenderPass(refs.scene, refs.camera));
      refs.composer.addPass(
        new UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          0.5,
          0.3,
          0.85
        )
      );

      // Lighting
      refs.scene.add(new THREE.AmbientLight(0x8899bb, 0.35));
      const dirLight = new THREE.DirectionalLight(0x5e6ad2, 0.7);
      dirLight.position.set(50, 100, 80);
      refs.scene.add(dirLight);
      const pl1 = new THREE.PointLight(0x34d399, 0.5, 350);
      pl1.position.set(-80, 30, -60);
      refs.scene.add(pl1);
      const pl2 = new THREE.PointLight(0x5e6ad2, 0.4, 350);
      pl2.position.set(100, 50, -120);
      refs.scene.add(pl2);

      // Build scene
      createDataParticles();
      createGridFloor();
      createFloatingCharts();
      createDashboardCards();
      createDonutChart();
      createConnectionNetwork();

      animate();
    };

    /* ── Business-Coloured Data Particles ── */
    const createDataParticles = () => {
      if (!refs.scene) return;
      const count = 1200;

      for (let layer = 0; layer < 2; layer++) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        const palette = [
          new THREE.Color(0x5e6ad2),
          new THREE.Color(0x34d399),
          new THREE.Color(0x3b82f6),
          new THREE.Color(0x8b5cf6),
          new THREE.Color(0x94a3b8),
        ];

        for (let i = 0; i < count; i++) {
          const radius = 40 + Math.random() * 400;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(Math.random() * 2 - 1);

          positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
          positions[i * 3 + 1] =
            radius * Math.sin(phi) * Math.sin(theta) * 0.4;
          positions[i * 3 + 2] = radius * Math.cos(phi) - 80;

          const color = palette[Math.floor(Math.random() * palette.length)];
          colors[i * 3] = color.r;
          colors[i * 3 + 1] = color.g;
          colors[i * 3 + 2] = color.b;
          sizes[i] = Math.random() * 2.5 + 0.3;
        }

        geometry.setAttribute(
          'position',
          new THREE.BufferAttribute(positions, 3)
        );
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.ShaderMaterial({
          uniforms: { time: { value: 0 } },
          vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            uniform float time;
            void main() {
              vColor = color;
              vec3 pos = position;
              pos.y += sin(pos.x * 0.008 + time * 0.3) * 3.0;
              pos.x += cos(pos.z * 0.008 + time * 0.2) * 2.0;
              vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
              gl_PointSize = size * (200.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `,
          fragmentShader: `
            varying vec3 vColor;
            void main() {
              float dist = length(gl_PointCoord - vec2(0.5));
              if (dist > 0.5) discard;
              float opacity = 1.0 - smoothstep(0.0, 0.5, dist);
              gl_FragColor = vec4(vColor, opacity * 0.7);
            }
          `,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });

        const points = new THREE.Points(geometry, material);
        refs.scene.add(points);
        refs.particles.push(points);
      }
    };

    /* ── Perspective Grid Floor ── */
    const createGridFloor = () => {
      if (!refs.scene) return;
      const grid = new THREE.GridHelper(800, 50, 0x1a1a3e, 0x0e0e20);
      grid.position.y = -80;
      grid.position.z = -100;
      refs.scene.add(grid);
      const grid2 = new THREE.GridHelper(800, 10, 0x252550, 0x181835);
      grid2.position.y = -80.1;
      grid2.position.z = -100;
      refs.scene.add(grid2);
    };

    /* ── Floating 3-D Bar Chart ── */
    const createFloatingCharts = () => {
      if (!refs.scene) return;
      const group = new THREE.Group();
      const heights = [18, 30, 24, 40, 32, 36, 22];
      const clrs = [
        0x5e6ad2, 0x34d399, 0x3b82f6, 0x8b5cf6, 0x5e6ad2, 0x34d399,
        0x3b82f6,
      ];

      heights.forEach((h, i) => {
        const geo = new THREE.BoxGeometry(5, h, 5);
        const mat = new THREE.MeshStandardMaterial({
          color: clrs[i],
          metalness: 0.4,
          roughness: 0.5,
          transparent: true,
          opacity: 0.7,
          emissive: new THREE.Color(clrs[i]),
          emissiveIntensity: 0.12,
        });
        const bar = new THREE.Mesh(geo, mat);
        bar.position.set((i - 3) * 8, h / 2 - 80, 0);
        group.add(bar);
      });

      group.position.set(-70, 0, -70);
      group.userData.initialY = 0;
      refs.scene.add(group);
      refs.floatingElements.push(group);
    };

    /* ── Floating Dashboard Cards ── */
    const createDashboardCards = () => {
      if (!refs.scene) return;
      const configs = [
        { x: 90, y: 15, z: -50, ry: -0.3, w: 48, h: 30 },
        { x: -110, y: 35, z: -110, ry: 0.25, w: 42, h: 26 },
        { x: 70, y: 50, z: -170, ry: -0.15, w: 52, h: 32 },
        { x: -50, y: -15, z: -35, ry: 0.12, w: 38, h: 24 },
      ];
      configs.forEach((cfg) => {
        const geo = new THREE.PlaneGeometry(cfg.w, cfg.h);
        const mat = new THREE.MeshBasicMaterial({
          color: 0x111827,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
        });
        const card = new THREE.Mesh(geo, mat);
        card.position.set(cfg.x, cfg.y, cfg.z);
        card.rotation.y = cfg.ry;
        card.userData.initialY = cfg.y;
        refs.scene!.add(card);
        refs.floatingElements.push(card);
        // edge glow
        const eg = new THREE.EdgesGeometry(geo);
        card.add(
          new THREE.LineSegments(
            eg,
            new THREE.LineBasicMaterial({
              color: 0x5e6ad2,
              transparent: true,
              opacity: 0.2,
            })
          )
        );
      });
    };

    /* ── Donut / Pie Chart Ring ── */
    const createDonutChart = () => {
      if (!refs.scene) return;
      const arc1 = new THREE.Mesh(
        new THREE.TorusGeometry(14, 3.5, 8, 40, Math.PI * 1.35),
        new THREE.MeshStandardMaterial({
          color: 0x34d399,
          metalness: 0.3,
          roughness: 0.5,
          emissive: new THREE.Color(0x34d399),
          emissiveIntensity: 0.18,
          transparent: true,
          opacity: 0.7,
        })
      );
      arc1.position.set(90, 10, -90);
      arc1.rotation.x = Math.PI * 0.3;
      arc1.userData.initialY = 10;
      refs.scene.add(arc1);
      refs.floatingElements.push(arc1);

      const arc2 = new THREE.Mesh(
        new THREE.TorusGeometry(14, 3.5, 8, 40, Math.PI * 0.5),
        new THREE.MeshStandardMaterial({
          color: 0x5e6ad2,
          metalness: 0.3,
          roughness: 0.5,
          emissive: new THREE.Color(0x5e6ad2),
          emissiveIntensity: 0.18,
          transparent: true,
          opacity: 0.7,
        })
      );
      arc2.position.set(90, 10, -90);
      arc2.rotation.x = Math.PI * 0.3;
      arc2.rotation.z = Math.PI * 1.4;
      arc2.userData.initialY = 10;
      refs.scene.add(arc2);
      refs.floatingElements.push(arc2);
    };

    /* ── Data Connection Network ── */
    const createConnectionNetwork = () => {
      if (!refs.scene) return;
      const n = 28;
      const pts: THREE.Vector3[] = [];
      const geo = new THREE.SphereGeometry(1.2, 8, 8);

      for (let i = 0; i < n; i++) {
        const p = new THREE.Vector3(
          (Math.random() - 0.5) * 350,
          (Math.random() - 0.5) * 120 + 10,
          (Math.random() - 0.5) * 250 - 80
        );
        pts.push(p);
        const mat = new THREE.MeshBasicMaterial({
          color: i % 3 === 0 ? 0x34d399 : 0x5e6ad2,
          transparent: true,
          opacity: 0.5,
        });
        const node = new THREE.Mesh(geo, mat);
        node.position.copy(p);
        refs.scene!.add(node);
      }

      const lp: number[] = [];
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++)
          if (pts[i].distanceTo(pts[j]) < 100)
            lp.push(
              pts[i].x, pts[i].y, pts[i].z,
              pts[j].x, pts[j].y, pts[j].z
            );

      if (lp.length) {
        const lg = new THREE.BufferGeometry();
        lg.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(lp, 3)
        );
        refs.scene!.add(
          new THREE.LineSegments(
            lg,
            new THREE.LineBasicMaterial({
              color: 0x5e6ad2,
              transparent: true,
              opacity: 0.08,
            })
          )
        );
      }
    };

    /* ── Animation Loop ── */
    const animate = () => {
      refs.animationId = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;

      // Particle drift
      refs.particles.forEach((p) => {
        const u = (p.material as THREE.ShaderMaterial).uniforms;
        if (u) u.time.value = time;
      });

      // Floating elements bob + micro-rotate
      refs.floatingElements.forEach((el, i) => {
        const base = (el.userData.initialY as number) ?? el.position.y;
        el.position.y = base + Math.sin(time * 0.4 + i * 1.2) * 2;
        el.rotation.y += 0.0006;
      });

      // Smooth camera interpolation
      if (refs.camera) {
        const sf = 0.045;
        smoothCameraPos.current.x +=
          (refs.targetCameraX - smoothCameraPos.current.x) * sf;
        smoothCameraPos.current.y +=
          (refs.targetCameraY - smoothCameraPos.current.y) * sf;
        smoothCameraPos.current.z +=
          (refs.targetCameraZ - smoothCameraPos.current.z) * sf;

        refs.camera.position.x =
          smoothCameraPos.current.x + Math.sin(time * 0.12) * 1.0;
        refs.camera.position.y =
          smoothCameraPos.current.y + Math.cos(time * 0.18) * 0.5;
        refs.camera.position.z = smoothCameraPos.current.z;
        refs.camera.lookAt(0, 0, -200);
      }

      if (refs.composer) refs.composer.render();
    };

    initThree();

    // Resize
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
      if (refs.animationId) cancelAnimationFrame(refs.animationId);
      window.removeEventListener('resize', handleResize);
      if (refs.scene) {
        refs.scene.traverse((child) => {
          if (
            child instanceof THREE.Mesh ||
            child instanceof THREE.Points ||
            child instanceof THREE.LineSegments
          ) {
            child.geometry.dispose();
            if (Array.isArray(child.material))
              child.material.forEach((m) => m.dispose());
            else (child.material as THREE.Material).dispose();
          }
        });
      }
      if (refs.renderer) refs.renderer.dispose();
    };
  }, []);

  /* ════════════════ Scroll-Driven Camera ════════════════ */
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      const wh = window.innerHeight || 800;
      
      const progress = Math.min(currentScrollY / wh, 4);
      const curIdx = Math.floor(progress);
      const sp = progress % 1;

      const { current: refs } = threeRefs;

      const positions = [
        { x: 0, y: 20, z: 150 }, // 0: Intro
        { x: 0, y: 20, z: 150 }, // 1: Transition/Delay state (keeps camera still while Hero tilts/scales)
        { x: -25, y: 30, z: 60 }, // 2: Section 0: Manage Employees
        { x: 15, y: 45, z: -40 }, // 3: Section 1: Track Clients & Projects
        { x: 0, y: 15, z: -100 }, // 4: Section 2: Financial Control
      ];

      const cur = positions[curIdx] || positions[0];
      const next = positions[curIdx + 1] || cur;

      refs.targetCameraX = cur.x + (next.x - cur.x) * sp;
      refs.targetCameraY = cur.y + (next.y - cur.y) * sp;
      refs.targetCameraZ = cur.z + (next.z - cur.z) * sp;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [totalSections]);

  /* ════════════════ Render ════════════════ */
  const wh = typeof window !== 'undefined' ? window.innerHeight || 800 : 800;
  const scrollProgress = scrollY / (wh || 1);

  // Intro text (Screen 0) fades out between 0.8 and 1.2 scrollProgress
  const heroOpacity = scrollProgress <= 0.8
    ? 1
    : Math.max(0, 1 - (scrollProgress - 0.8) / 0.4);

  // Each feature section is assigned a spacious cross-fade window to prevent overlaps
  const getSectionOpacity = (idx: number) => {
    if (idx === 0) {
      // Screen 1 (Manage Employees)
      if (scrollProgress >= 1.3 && scrollProgress < 1.7) {
        return (scrollProgress - 1.3) / 0.4;
      } else if (scrollProgress >= 1.7 && scrollProgress <= 2.1) {
        return 1;
      } else if (scrollProgress > 2.1 && scrollProgress <= 2.5) {
        return Math.max(0, 1 - (scrollProgress - 2.1) / 0.4);
      }
    } else if (idx === 1) {
      // Screen 2 (Track Clients & Projects)
      if (scrollProgress >= 2.6 && scrollProgress < 3.0) {
        return (scrollProgress - 2.6) / 0.4;
      } else if (scrollProgress >= 3.0 && scrollProgress <= 3.4) {
        return 1;
      } else if (scrollProgress > 3.4 && scrollProgress <= 3.8) {
        return Math.max(0, 1 - (scrollProgress - 3.4) / 0.4);
      }
    } else if (idx === 2) {
      // Screen 3 (Financial Control)
      if (scrollProgress >= 3.9 && scrollProgress < 4.3) {
        return (scrollProgress - 3.9) / 0.4;
      } else if (scrollProgress >= 4.3 && scrollProgress <= 4.7) {
        return 1;
      } else if (scrollProgress > 4.7 && scrollProgress <= 5.1) {
        return Math.max(0, 1 - (scrollProgress - 4.7) / 0.4);
      }
    }
    return 0;
  };

  const getSectionTransformY = (idx: number) => {
    let center = 0;
    if (idx === 0) center = 1.9;
    else if (idx === 1) center = 3.2;
    else if (idx === 2) center = 4.5;
    const diff = scrollProgress - center;
    const clampedDiff = Math.max(-0.6, Math.min(0.6, diff));
    return -clampedDiff * 60;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[500vh] bg-white dark:bg-[#07080f] text-zinc-900 dark:text-white transition-colors duration-300"
    >
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full z-0 pointer-events-none"
      />

      {/* ── Fixed Logo + Brand Header ── */}
      <div className="fixed top-0 left-0 right-0 z-30 pointer-events-none">
        <div className="flex items-center justify-between px-6 md:px-10 py-5 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3.5 pointer-events-auto cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img
              src="/logo.png"
              alt="AdminSuite Logo"
              className="w-14 h-14 object-contain rounded-xl dark:invert select-none animate-[pulse_3s_infinite]"
            />
            <span className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white/90 select-none">
              AdminSuite
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 pointer-events-auto">
            <a
              href="#download"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('cta-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-sm font-semibold text-zinc-600 dark:text-white/75 hover:text-zinc-900 dark:hover:text-white transition-colors hover:scale-105 active:scale-95 duration-200"
            >
              Download EXE
            </a>
            <a
              href="#support"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('support-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-sm font-semibold text-zinc-600 dark:text-white/75 hover:text-zinc-900 dark:hover:text-white transition-colors hover:scale-105 active:scale-95 duration-200"
            >
              Support
            </a>
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-zinc-600 dark:text-white/75 hover:text-zinc-900 dark:hover:text-white transition-colors hover:scale-105 active:scale-95 duration-200"
            >
              Sign In
            </a>
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 transition-all duration-200 hover:scale-110 active:scale-95"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
            </button>
          </div>

          {/* Mobile: Theme Toggle + Hamburger */}
          <div className="flex md:hidden items-center gap-3 pointer-events-auto">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 transition-all duration-200"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 transition-all duration-200"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pointer-events-auto mx-4 mt-1 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-white/10 shadow-2xl p-5 space-y-1 animate-[fadeSlideIn_0.2s_ease-out]">
            <a
              href="#download"
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                document.getElementById('cta-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="block px-4 py-3 rounded-xl text-sm font-semibold text-zinc-700 dark:text-white/80 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
            >
              Download EXE
            </a>
            <a
              href="#support"
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                document.getElementById('support-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="block px-4 py-3 rounded-xl text-sm font-semibold text-zinc-700 dark:text-white/80 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
            >
              Support
            </a>
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noreferrer"
              className="block px-4 py-3 rounded-xl text-sm font-semibold text-zinc-700 dark:text-white/80 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
            >
              Sign In
            </a>
          </div>
        )}
      </div>

      {/* ── Hero Landing Content (3D Container Scroll) ── */}
      <div
        className="absolute top-0 left-0 right-0 w-full z-10 pointer-events-auto flex flex-col items-center justify-center pt-24"
        style={{
          opacity: heroOpacity,
          visibility: heroOpacity > 0 ? 'visible' : 'hidden',
          transition: 'opacity 0.25s ease-out, visibility 0.25s ease-out',
        }}
      >
        <ContainerScroll
          titleComponent={
            <div className="flex flex-col items-center justify-center text-center px-4 space-y-6">
              {/* Logo badge with glow */}
              <div className="flex items-center gap-4 mb-4 select-none">
                <img
                  src="/logo.png"
                  alt="AdminSuite"
                  className="w-16 h-16 md:w-24 md:h-24 object-contain rounded-3xl dark:invert"
                />
                <span className="text-3xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-600 dark:from-white dark:via-white dark:to-white/70">
                  AdminSuite
                </span>
              </div>

              {/* Sparkle badge */}
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold tracking-wider text-indigo-600 dark:text-indigo-300 uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Introducing Workspace V2</span>
              </div>

              {/* Big tagline */}
              <h1 className="text-4xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05] max-w-5xl">
                <span className="bg-clip-text text-transparent bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-500 dark:from-white dark:via-white/95 dark:to-white/40">
                  Your Complete Business Command Center
                </span>
              </h1>

              {/* Subtitle */}
              <p className="max-w-xl text-zinc-500 dark:text-white/50 text-sm md:text-lg leading-relaxed">
                Manage employees, track clients &amp; projects, and take full financial control — all from one powerful, intelligent dashboard.
              </p>

              {/* Hero CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 pointer-events-auto">
                <a href="/AdminSuite_Setup.exe" download className="pointer-events-auto">
                  <Button size="lg" className="rounded-full px-8 bg-zinc-900 text-white dark:bg-white dark:text-black hover:opacity-90 font-semibold group flex items-center gap-2">
                    <span>Download Windows .exe File</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </a>
                <a href="http://localhost:5173" target="_blank" rel="noreferrer" className="pointer-events-auto">
                  <Button size="lg" variant="outline" className="rounded-full px-8 border-zinc-300 dark:border-white/10 text-zinc-700 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/5">
                    Use AdminSuite Web
                  </Button>
                </a>
              </div>
            </div>
          }
        >
          <img
            src="/dashboard.png"
            alt="AdminSuite Dashboard Command Center"
            className="mx-auto rounded-2xl object-cover h-full object-left-top select-none w-full"
            draggable={false}
          />
        </ContainerScroll>
      </div>

      {/* ── Detailed Feature Sections (Sticky + Fade) ── */}
      {SECTIONS.map((sec, idx) => {
        const opacity = getSectionOpacity(idx);
        return (
          <div
            key={idx}
            className="fixed inset-0 flex flex-col items-center justify-center z-10 pointer-events-none px-4"
            style={{
              opacity: opacity,
              visibility: opacity > 0 ? 'visible' : 'hidden',
              transform: `translateY(${getSectionTransformY(idx)}px)`,
              transition: 'opacity 0.25s ease-out, visibility 0.25s ease-out',
            }}
          >
            {/* Section Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-white/70 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5E6AD2]" />
              <span>0{idx + 1} / 03</span>
            </div>

            {/* Section Title */}
            <h2 className="text-5xl md:text-8xl font-black tracking-tight text-center leading-[1.1] max-w-5xl">
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-zinc-950 via-zinc-800 to-zinc-600 dark:from-white dark:via-white/90 dark:to-white/40">
                {sec.title}
              </span>
            </h2>

            {/* Description */}
            <p className="mt-6 text-zinc-500 dark:text-white/50 text-sm md:text-lg max-w-2xl text-center leading-relaxed">
              {sec.description}
            </p>

            {/* Feature highlights */}
            {'highlights' in sec && (
              <div className="mt-10 flex flex-wrap justify-center gap-4 max-w-3xl">
                {(sec as typeof sec & { highlights: string[] }).highlights.map((h: string, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.07] text-sm text-zinc-700 dark:text-white/70"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] flex-shrink-0" />
                    {h}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Scroll height spacers */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="h-screen w-full" />
        <div className="h-screen w-full" />
        <div className="h-screen w-full" />
        <div className="h-screen w-full" />
        <div className="h-screen w-full" />
      </div>
    </div>
  );
};
