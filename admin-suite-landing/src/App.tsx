import { Component as HorizonHero } from './components/ui/horizon-hero-section';
import { FeatureCarousel } from './components/ui/feature-carousel';
import { Footer2 as Footer } from './components/ui/shadcnblocks-com-footer2';
import { StoryCard } from './components/ui/story-card';
import { Button } from './components/ui/button';
import { ParticleButton } from './components/ui/particle-button';
import FlowArt, { FlowSection } from './components/ui/story-scroll';
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
  Sparkles,
  Mail,
  Download
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

      {/* ── About Us — Vision & Mission (Story Scroll) ── */}
      <div id="about-section">
        <FlowArt aria-label="About AdminSuite">
          <FlowSection aria-label="Who We Are" style={{ backgroundColor: '#0a0b14', color: '#fff' }}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">01 — Who We Are</p>
            <hr className="my-[2vw] border-none border-t border-white/10" />
            <div>
              <h2 className="text-[clamp(3.5rem,12vw,13rem)] font-black leading-[0.85] uppercase tracking-tight">
                Built For
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">Leaders</span>
              </h2>
            </div>
            <hr className="my-[2vw] border-none border-t border-white/10" />
            <p className="mt-auto max-w-[55ch] text-[clamp(1rem,2.2vw,1.75rem)] font-normal leading-relaxed text-white/70">
              AdminSuite is a full-stack business command centre designed for modern managers. We unify employee oversight, client management, and financial intelligence into one seamless, secure ecosystem — giving decision-makers the clarity they need to lead with confidence.
            </p>
          </FlowSection>

          <FlowSection aria-label="Our Mission" style={{ backgroundColor: '#5e6ad2', color: '#fff' }}>
            <p className="text-xs font-bold uppercase tracking-[0.2em]">02 — Our Mission</p>
            <hr className="my-[2vw] border-none border-t border-white/30" />
            <div>
              <h2 className="text-[clamp(3.5rem,12vw,13rem)] font-black leading-[0.85] uppercase tracking-tight">
                Clarity
                <br />
                In Every
                <br />
                Decision
              </h2>
            </div>
            <hr className="my-[2vw] border-none border-t border-white/30" />
            <p className="max-w-[55ch] text-[clamp(1rem,2.2vw,1.75rem)] font-normal leading-relaxed text-white/80">
              Our mission is to eliminate the chaos of disconnected spreadsheets, siloed data, and manual reporting. AdminSuite delivers real-time visibility across your entire operation so that every leader — from team lead to CFO — can make faster, smarter decisions.
            </p>
            <hr className="my-[2vw] border-none border-t border-white/30" />
            <div className="flex flex-wrap gap-[3vw]">
              <div className="min-w-[180px] flex-1">
                <p className="mb-2 text-sm font-bold uppercase tracking-wider">People First</p>
                <p className="text-[clamp(0.85rem,1.3vw,1.05rem)] leading-relaxed opacity-75">
                  Every feature is built around the humans who use it — intuitive interfaces, zero friction onboarding, and role-based access that makes sense from day one.
                </p>
              </div>
              <div className="min-w-[180px] flex-1">
                <p className="mb-2 text-sm font-bold uppercase tracking-wider">Data Integrity</p>
                <p className="text-[clamp(0.85rem,1.3vw,1.05rem)] leading-relaxed opacity-75">
                  Transactions, payroll, and client records are stored securely with end-to-end encryption and live Supabase synchronisation across all devices.
                </p>
              </div>
              <div className="min-w-[180px] flex-1">
                <p className="mb-2 text-sm font-bold uppercase tracking-wider">Operational Flow</p>
                <p className="text-[clamp(0.85rem,1.3vw,1.05rem)] leading-relaxed opacity-75">
                  From task assignment to invoice generation, every workflow is connected — no tab-switching, no manual reconciliation, no blind spots.
                </p>
              </div>
            </div>
          </FlowSection>

          <FlowSection aria-label="Our Vision" style={{ backgroundColor: '#0d1117', color: '#fff' }}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">03 — Our Vision</p>
            <hr className="my-[2vw] border-none border-t border-white/10" />
            <div>
              <h2 className="text-[clamp(3.5rem,12vw,13rem)] font-black leading-[0.85] uppercase tracking-tight">
                The Future
                <br />
                Of Work
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Is Unified</span>
              </h2>
            </div>
            <hr className="my-[2vw] border-none border-t border-white/10" />
            <p className="max-w-[55ch] text-[clamp(1rem,2.2vw,1.75rem)] font-normal leading-relaxed text-white/70">
              We envision a world where any business — from a boutique agency to a multi-national firm — operates with the same intelligence and efficiency as a Fortune 500 company. AdminSuite is the equaliser.
            </p>
            <hr className="my-[2vw] border-none border-t border-white/10" />
            <div className="flex flex-wrap gap-[3vw]">
              <div className="min-w-[180px] flex-1">
                <p className="mb-2 text-sm font-bold uppercase tracking-wider text-emerald-400">Workforce Intelligence</p>
                <p className="text-[clamp(0.85rem,1.3vw,1.05rem)] leading-relaxed opacity-60">
                  AI-ready employee analytics, attendance patterns, and performance benchmarks — giving managers the foresight to act before problems arise.
                </p>
              </div>
              <div className="min-w-[180px] flex-1">
                <p className="mb-2 text-sm font-bold uppercase tracking-wider text-indigo-400">Financial Foresight</p>
                <p className="text-[clamp(0.85rem,1.3vw,1.05rem)] leading-relaxed opacity-60">
                  Predictive cash-flow modelling, automated profit/loss summaries, and instant financial snapshots accessible from any device, anywhere.
                </p>
              </div>
              <div className="min-w-[180px] flex-1">
                <p className="mb-2 text-sm font-bold uppercase tracking-wider text-cyan-400">Client Excellence</p>
                <p className="text-[clamp(0.85rem,1.3vw,1.05rem)] leading-relaxed opacity-60">
                  Deep client portfolios with project tracking, retainer management, and transparent communication logs — turning every client relationship into a long-term partnership.
                </p>
              </div>
            </div>
            <hr className="my-[2vw] border-none border-t border-white/10" />
            <p className="mt-auto ml-auto max-w-[50ch] text-right text-[clamp(1rem,2vw,1.5rem)] font-normal leading-relaxed text-white/50">
              Every line of code we write starts with a single question — does this make our users more effective?
            </p>
          </FlowSection>

          <FlowSection aria-label="What We Build" style={{ backgroundColor: '#111827', color: '#fff' }}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">04 — What We Build</p>
            <hr className="my-[2vw] border-none border-t border-white/10" />
            <div>
              <h2 className="text-[clamp(3.5rem,12vw,13rem)] font-black leading-[0.85] uppercase tracking-tight">
                One
                <br />
                Platform.
                <br />
                Total
                <br />
                Control.
              </h2>
            </div>
            <hr className="my-[2vw] border-none border-t border-white/10" />
            <div className="flex flex-wrap gap-[3vw]">
              <div className="min-w-[180px] flex-1">
                <p className="mb-2 text-sm font-bold uppercase tracking-wider">Employee Management</p>
                <p className="text-[clamp(0.85rem,1.3vw,1.05rem)] leading-relaxed opacity-60">
                  Onboard team members, assign roles, track attendance, manage leave, and view payroll history — all within a secure, permission-based environment.
                </p>
              </div>
              <div className="min-w-[180px] flex-1">
                <p className="mb-2 text-sm font-bold uppercase tracking-wider">Client & Project Tracking</p>
                <p className="text-[clamp(0.85rem,1.3vw,1.05rem)] leading-relaxed opacity-60">
                  Maintain detailed client portfolios, coordinate project timelines, and organise deliverables from a unified command centre with visual Kanban boards.
                </p>
              </div>
              <div className="min-w-[180px] flex-1">
                <p className="mb-2 text-sm font-bold uppercase tracking-wider">Financial Command</p>
                <p className="text-[clamp(0.85rem,1.3vw,1.05rem)] leading-relaxed opacity-60">
                  Real-time profit tracking, expense logging, income reporting, and transparent analytics synced directly to your live database with interactive charts.
                </p>
              </div>
            </div>
          </FlowSection>
        </FlowArt>
      </div>

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
                  quote: "AdminSuite has completely transformed how we manage employee workspace roles. The biometric security integration and direct sync give us full confidence.",
                  name: "Dimaro T. Godsgift",
                  designation: "CEO of Dimacode (Tech Company)",
                  src: "/dimaro.jpg"
                },
                {
                  quote: "Tracking client projects and video assets is incredibly simple now. Our cinematography team saves hours of coordination weekly using the unified dashboard.",
                  name: "Eluan Clever",
                  designation: "CEO of Eluan Visuals (Cinematography)",
                  src: "/eluan.jpg"
                },
                {
                  quote: "The real-time database and clean cash flow tracking are absolute lifesavers for managing client deposits and photography project schedules.",
                  name: "Precious Warekereowei",
                  designation: "CEO of Precy_Photos (Photography)",
                  src: "/precious.jpg"
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
            <ParticleButton
              size="lg"
              href="https://adminsuite-api.onrender.com/static/AdminSuite.apk"
              download={true}
              className="rounded-full px-8 bg-zinc-900 text-white dark:bg-white dark:text-black hover:opacity-95 font-semibold flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Android APK</span>
            </ParticleButton>
            <a href="https://adminsuite-web.onrender.com" target="_blank" rel="noreferrer" className="pointer-events-auto">
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
