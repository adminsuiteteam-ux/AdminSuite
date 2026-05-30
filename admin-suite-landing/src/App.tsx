import React from 'react';
import { Component as HorizonHero } from './components/ui/horizon-hero-section';
import { FeatureCarousel } from './components/ui/feature-carousel';
import { Footer2 as Footer } from './components/ui/shadcnblocks-com-footer2';
import { StoryCard } from './components/ui/story-card';
import { Button } from './components/ui/button';

import { 
  ShieldAlert, 
  UserCheck, 
  TrendingUp, 
  Smartphone, 
  Cpu, 
  Database,
  ArrowRight,
  Sparkles
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
    <div className="relative min-h-screen bg-black text-white select-none">
      {/* Dynamic Horizon Three.js & GSAP Parallax background Hero */}
      <HorizonHero />

      {/* Storytelling Visual Experience */}
      <div className="relative z-10 max-w-7xl mx-auto py-24 divide-y divide-white/5 space-y-12">
        <div className="text-center px-4 space-y-4 max-w-3xl mx-auto pb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-xs font-semibold tracking-wider text-accent uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Storytelling</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            How AdminSuite Empowers Your Business
          </h2>
          <p className="text-white/50 text-sm md:text-base">
            Take a visual walk through the dynamic workflow of AdminSuite. A unified environment built from the ground up to solve collaboration and transparency.
          </p>
        </div>

        {/* Step 1: Verification */}
        <StoryCard 
          step="01 / Setup"
          title="Secure, Instant Email Onboarding"
          description="Enter your email and instantly receive a secure, 8-digit verification code. Verify your admin identity in milliseconds using keyboard prefilled overlays and seamless biometric-ready security."
          icon={ShieldAlert}
          imageSrc="/phone_mockup_verified.png"
          alignment="left"
          glowColor="rgba(94, 106, 210, 0.12)"
        />

        {/* Step 2: Role selection */}
        <StoryCard 
          step="02 / Customization"
          title="Roles Tailored for Real Collaboration"
          description="Choose your primary role in the workspace. Whether you are a Company Administrator overseeing finances, an HR & People Manager handling staff onboarding, or a Project Lead coordinating clients—AdminSuite adapts its dashboard layout specifically for your focus."
          icon={UserCheck}
          imageSrc="/phone_mockup_role.png"
          alignment="right"
          glowColor="rgba(52, 211, 153, 0.1)"
        />

        {/* Step 3: Metrics pulse */}
        <StoryCard 
          step="03 / Absolute Control"
          title="Real-Time Financial Pulse"
          description="Access a fully transparent financial health dashboard. Track your monthly net profit, log outgoing expenses, monitor active retainer clients, and view visual charts synced directly with your database."
          icon={TrendingUp}
          imageSrc="/phone_mockup_financial.png"
          alignment="left"
          glowColor="rgba(94, 106, 210, 0.15)"
        />
      </div>

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

      {/* Tech Specifications Stack Showcase */}
      <section className="relative z-10 py-24 bg-zinc-950/60 border-t border-white/5 px-4">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Built on Modern Architecture</h2>
            <p className="text-white/40 text-xs md:text-sm">High performance, native capabilities, and secure client-server databases.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tech 1 */}
            <div className="p-8 rounded-3xl bg-zinc-900/40 border border-white/5 space-y-4 hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Expo Mobile Core</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Powered by React Native, offering standard hardware biometric login, offline secure token stores, and dynamic layouts optimized for both iOS and Android.
              </p>
            </div>

            {/* Tech 2 */}
            <div className="p-8 rounded-3xl bg-zinc-900/40 border border-white/5 space-y-4 hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Python Python Backend</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Robust and scalable Python REST APIs handling transaction metrics calculations, worker roles routing, and token authorization logs.
              </p>
            </div>

            {/* Tech 3 */}
            <div className="p-8 rounded-3xl bg-zinc-900/40 border border-white/5 space-y-4 hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center text-blue-400">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Supabase Realtime DB</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Instant synchronization of metrics, live updates, and secure database encryption keys to keep corporate data fully isolated.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="relative z-10 py-24 px-4 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(94,106,210,0.15),transparent_60%)] pointer-events-none" />
        <div className="max-w-xl mx-auto space-y-8 relative z-10">
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight">Ready to Elevate Your Workflow?</h2>
          <p className="text-white/60 text-sm md:text-base leading-relaxed">
            Deploy AdminSuite to your organization today. Streamline role allocation, secure transaction ledgers, and manage your workforce with premium UI/UX interfaces.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="rounded-full px-8 bg-white text-black hover:bg-white/95 font-semibold group flex items-center gap-2">
              <span>Deploy Workspace</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8 border-white/10 text-white hover:bg-white/5">
              Request Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer tagline="AdminSuite Workspace — Absolute control over personnel resources and financial pulse metrics." />
    </div>
  );
}
