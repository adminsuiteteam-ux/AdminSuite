import { Component as HorizonHero } from './components/ui/horizon-hero-section';
import { FeatureCarousel } from './components/ui/feature-carousel';
import { Footer2 as Footer } from './components/ui/shadcnblocks-com-footer2';
import { StoryCard } from './components/ui/story-card';
import { Button } from './components/ui/button';
import { GlowCard } from './components/ui/spotlight-card';
import { CircularTestimonials } from './components/ui/circular-testimonials';
import { TextRevealByWord } from './components/ui/text-reveal';

import { 
  ShieldAlert, 
  UserCheck, 
  TrendingUp, 
  Smartphone, 
  Cpu, 
  Database,
  ArrowRight,
  Sparkles,
  Mail
} from 'lucide-react';

export default function App() {
  // Real mockup pictures from our workspace assets/app mockups
  const appImages = [
    {
      src: '/phone_mockup_financial.png',
      alt: 'AdminSuite Live Financial Dashboard Pulse metrics'
    },
    {
      src: '/phone_mockup_verified.png',
      alt: 'Secure 8-digit Email verification flow'
    },
    {
      src: '/phone_mockup_setup.png',
      alt: 'Initial Workspace profiles setup form'
    },
    {
      src: '/phone_mockup_verification_code.png',
      alt: 'Verification code input keyboard prefill overlay'
    },
    {
      src: '/phone_mockup_role.png',
      alt: 'Tailored dashboard workspace roles selection'
    }
  ];

  return (
    <div className="relative min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-white select-none transition-colors duration-300">
      {/* Dynamic Horizon Three.js & GSAP Parallax background Hero */}
      <HorizonHero />

      {/* Storytelling Visual Experience */}
      <div className="relative z-10 max-w-7xl mx-auto py-32 space-y-32">
        <div className="text-center px-4 space-y-4 max-w-3xl mx-auto pb-16">
          {/* Section logo */}
          <div className="flex items-center justify-center gap-3.5 mb-6">
            <img src="/logo.png" alt="AdminSuite" className="w-14 h-14 object-contain dark:invert opacity-80" />
            <span className="text-lg font-bold text-zinc-800 dark:text-white/80 tracking-wide">AdminSuite</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-xs font-semibold tracking-wider text-accent uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Storytelling</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight text-zinc-900 dark:text-white">
            How AdminSuite Empowers Your Business
          </h2>
          <p className="text-zinc-500 dark:text-white/50 text-sm md:text-base">
            Take a visual walk through the dynamic workflow of AdminSuite. A unified environment built from the ground up to solve collaboration and transparency.
          </p>
        </div>

        {/* Step 1: Verification */}
        <StoryCard 
          step="01 / Security"
          title="Secure, Instant Email Onboarding"
          description="Enter your email and instantly receive a secure, 8-digit verification code. Verify your admin identity in milliseconds using keyboard prefilled overlays and seamless biometric-ready security."
          icon={ShieldAlert}
          imageSrc="/phone_mockup_verified.png"
          alignment="left"
          glowColor="rgba(94, 106, 210, 0.12)"
        />

        {/* Step 2: Track Clients & Projects */}
        <StoryCard 
          step="02 / Workspace"
          title="Track Clients & Projects"
          description="Maintain client portfolios, coordinate project timelines, and organize deliverables from a unified command center. Adaptive dashboard layouts ensure your project metrics are front and center."
          icon={UserCheck}
          imageSrc="/phone_mockup_role.png"
          alignment="right"
          glowColor="rgba(52, 211, 153, 0.1)"
        />

        {/* Step 3: Financial Control */}
        <StoryCard 
          step="03 / Finances"
          title="Real-Time Financial Control"
          description="Access a fully transparent financial health dashboard. Track your monthly net profit, log outgoing expenses, monitor active retainer clients, and view visual charts synced directly with your database."
          icon={TrendingUp}
          imageSrc="/phone_mockup_financial.png"
          alignment="left"
          glowColor="rgba(94, 106, 210, 0.15)"
        />
      </div>

      {/* Scroll-linked text reveal section */}
      <section className="relative z-10 w-full min-h-[150vh] flex items-center justify-center py-24 bg-white dark:bg-black transition-colors duration-300">
        <div className="w-full max-w-6xl mx-auto px-4">
          <TextRevealByWord text="AdminSuite gives you absolute control over your workforce, tracking client timelines and financial streams with real-time accuracy." />
        </div>
      </section>

      {/* 3D Mockup Rotation Carousel */}
      <FeatureCarousel 
        title={
          <>
            Manage Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-emerald-400">Workspace</span> On the Go
          </>
        }
        subtitle="Access all your administrator settings, client portfolios, transaction records, and staff schedules directly from your mobile device."
        images={appImages}
      />

      {/* Testimonials Section */}
      <section className="relative z-10 py-24 px-4 bg-zinc-50/50 dark:bg-zinc-950/30 border-t border-b border-zinc-200 dark:border-white/5 transition-colors duration-300">
        <div className="max-w-4xl mx-auto space-y-12 text-center">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3.5 mb-2">
              <img src="/logo.png" alt="AdminSuite" className="w-14 h-14 object-contain dark:invert opacity-80" />
              <span className="text-lg font-bold text-zinc-800 dark:text-white/80 tracking-wider uppercase">Social Proof</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight text-zinc-900 dark:text-white">
              Loved by Administrators Everywhere
            </h2>
            <p className="text-zinc-500 dark:text-white/40 text-sm md:text-base max-w-lg mx-auto">
              Hear what team leaders and financial controllers say about their experience with AdminSuite.
            </p>
          </div>
          
          <div className="flex items-center justify-center relative w-full pt-10">
            <CircularTestimonials 
              testimonials={[
                {
                  quote: "AdminSuite completely transformed how we onboard and manage employee workspace roles. The biometric security integration gives us full confidence.",
                  name: "Sarah Jenkins",
                  designation: "VP of Operations at TechCorp",
                  src: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop"
                },
                {
                  quote: "Tracking clients and project milestones is incredibly simple now. Our account managers save 15+ hours weekly with the unified dashboard.",
                  name: "Michael Chen",
                  designation: "Product Director at DesignFlux",
                  src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop"
                },
                {
                  quote: "The real-time database sync and transparent financial graphs are a game changer. We finally have direct visibility into our monthly cash flows.",
                  name: "Elena Rostova",
                  designation: "Chief Financial Officer at LexisMedia",
                  src: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=600&auto=format&fit=crop"
                }
              ]}
              autoplay={true}
              colors={{
                name: "hsl(var(--foreground))",
                designation: "hsl(var(--muted-foreground))",
                testimony: "hsl(var(--muted-foreground))",
                arrowBackground: "hsl(var(--secondary))",
                arrowForeground: "hsl(var(--foreground))",
                arrowHoverBackground: "hsl(var(--accent))"
              }}
              fontSizes={{
                name: "24px",
                designation: "14px",
                quote: "18px"
              }}
            />
          </div>
        </div>
      </section>

      {/* Tech Specifications Stack Showcase */}
      <section className="relative z-10 py-24 bg-zinc-50 dark:bg-zinc-950/60 border-t border-zinc-200 dark:border-white/5 px-4 transition-colors duration-300">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-xl mx-auto">
            {/* Section logo */}
            <div className="flex items-center justify-center gap-3.5 mb-4">
              <img src="/logo.png" alt="AdminSuite" className="w-14 h-14 object-contain dark:invert opacity-80" />
              <span className="text-lg font-bold text-zinc-800 dark:text-white/80 tracking-wide">AdminSuite</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Built on Modern Architecture</h2>
            <p className="text-zinc-500 dark:text-white/40 text-xs md:text-sm">High performance, native capabilities, and secure client-server databases.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tech 1 */}
            <GlowCard glowColor="purple" customSize={true} className="p-8 rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/5 space-y-4 text-left shadow-lg dark:shadow-none transition-colors duration-300">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Expo Mobile Core</h3>
              <p className="text-sm text-zinc-500 dark:text-white/50 leading-relaxed">
                Powered by React Native, offering standard hardware biometric login, offline secure token stores, and dynamic layouts optimized for both iOS and Android.
              </p>
            </GlowCard>

            {/* Tech 2 */}
            <GlowCard glowColor="green" customSize={true} className="p-8 rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/5 space-y-4 text-left shadow-lg dark:shadow-none transition-colors duration-300">
              <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Python REST Backend</h3>
              <p className="text-sm text-zinc-500 dark:text-white/50 leading-relaxed">
                Robust and scalable Python REST APIs handling transaction metrics calculations, worker roles routing, and token authorization logs.
              </p>
            </GlowCard>

            {/* Tech 3 */}
            <GlowCard glowColor="blue" customSize={true} className="p-8 rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/5 space-y-4 text-left shadow-lg dark:shadow-none transition-colors duration-300">
              <div className="w-12 h-12 rounded-2xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center text-blue-400">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Supabase Realtime DB</h3>
              <p className="text-sm text-zinc-500 dark:text-white/50 leading-relaxed">
                Instant synchronization of metrics, live updates, and secure database encryption keys to keep corporate data fully isolated.
              </p>
            </GlowCard>
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section id="support-section" className="relative z-10 py-24 bg-zinc-50 dark:bg-zinc-950/40 border-t border-zinc-200 dark:border-white/5 px-4 transition-colors duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(94,106,210,0.06),transparent_50%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold tracking-wider text-indigo-600 dark:text-indigo-300 uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Customer Care</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Dedicated Product Support</h2>
            <p className="text-zinc-500 dark:text-white/40 text-xs md:text-sm">Have questions or need technical assistance with AdminSuite? Our team is here to help you deploy, configure, and scale.</p>
          </div>

          <div className="max-w-2xl mx-auto p-8 md:p-10 rounded-3xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-white/5 backdrop-blur-xl relative overflow-hidden text-center space-y-6 shadow-xl dark:shadow-none transition-colors duration-300">
            <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-accent/5 rounded-full blur-3xl" />
            <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto text-accent shadow-[0_0_20px_rgba(94,106,210,0.15)]">
              <Mail className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-zinc-400 dark:text-white/40 font-bold">Official Support Email</p>
              <h3 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white selection:bg-accent selection:text-white">
                adminsuiteteam@gmail.com
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-white/50 max-w-md mx-auto leading-relaxed">
              We usually respond within 12-24 hours. For enterprise queries, please include your organization name and license details.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a 
                href="mailto:adminsuiteteam@gmail.com" 
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-white/90 font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Send an Email
              </a>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText('adminsuiteteam@gmail.com');
                  alert('Support email copied to clipboard!');
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-700 dark:text-white border border-zinc-200 dark:border-white/10 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section id="cta-section" className="relative z-10 py-24 px-4 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(94,106,210,0.15),transparent_60%)] pointer-events-none" />
        <div className="max-w-xl mx-auto space-y-8 relative z-10">
          {/* Section logo */}
          <div className="flex items-center justify-center gap-3.5 mb-4">
            <img src="/logo.png" alt="AdminSuite" className="w-14 h-14 object-contain dark:invert opacity-80" />
            <span className="text-lg font-bold text-zinc-800 dark:text-white/80 tracking-wide">AdminSuite</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Ready to Elevate Your Workflow?</h2>
          <p className="text-zinc-500 dark:text-white/60 text-sm md:text-base leading-relaxed">
            Deploy AdminSuite to your organization today. Streamline role allocation, secure transaction ledgers, and manage your workforce with premium UI/UX interfaces.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/AdminSuite_Setup.exe" download className="pointer-events-auto">
              <Button size="lg" className="rounded-full px-8 bg-zinc-900 text-white dark:bg-white dark:text-black hover:opacity-95 font-semibold group flex items-center gap-2">
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
      </section>

      {/* Footer */}
      <div id="footer-section">
        <Footer tagline="AdminSuite Workspace — Absolute control over personnel resources and financial pulse metrics." />
      </div>
    </div>
  );
}
