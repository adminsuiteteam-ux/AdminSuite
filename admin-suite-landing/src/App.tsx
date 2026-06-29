import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
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
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  // Fade the Financial Control card out while the story-scroll section is overhead,
  // then scrub it back to full opacity as the FlowArt block exits upward.
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '#financial-control-card',
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: '#about-section',
            start: 'bottom 75%',
            end: 'bottom 5%',
            scrub: 0.8,
          },
        },
      );
    });
    return () => ctx.revert();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      setFormError(t('support.form.errorRequired'));
      return;
    }
    setFormError('');
    setIsSubmitting(true);
    
    // Simulate API request
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 1500);
  };

  // Real mockup pictures from our workspace assets/app mockups
  const appImages = [
    {
      src: '/phone_mockup_financial.png',
      alt: t('alt.financialDashboard')
    },
    {
      src: '/phone_mockup_verified.png',
      alt: t('alt.verificationFlow')
    },
    {
      src: '/phone_mockup_setup.png',
      alt: t('alt.profilesSetup')
    },
    {
      src: '/phone_mockup_verification_code.png',
      alt: t('alt.verificationPrefill')
    },
    {
      src: '/phone_mockup_role.png',
      alt: t('alt.rolesSelection')
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">{t('about.section1.number')}</p>
            <hr className="my-4 md:my-[2vw] border-none border-t border-white/10" />
            <div>
              <h2 className="text-4xl sm:text-6xl md:text-8xl lg:text-[clamp(4.5rem,10vw,12rem)] font-black leading-[0.85] uppercase tracking-tight">
                {t('about.section1.builtFor')}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">{t('about.section1.leaders')}</span>
              </h2>
            </div>
            <hr className="my-4 md:my-[2vw] border-none border-t border-white/10" />
            <p className="mt-6 md:mt-auto max-w-[55ch] text-sm sm:text-base md:text-lg lg:text-[clamp(1.1rem,1.8vw,1.6rem)] font-normal leading-relaxed text-white/70">
              {t('about.section1.body')}
            </p>
          </FlowSection>

          <FlowSection aria-label="Our Mission" style={{ backgroundColor: '#5e6ad2', color: '#fff' }}>
            <p className="text-xs font-bold uppercase tracking-[0.2em]">{t('about.section2.number')}</p>
            <hr className="my-4 md:my-[2vw] border-none border-t border-white/30" />
            <div>
              <h2 className="text-4xl sm:text-6xl md:text-8xl lg:text-[clamp(4.5rem,10vw,12rem)] font-black leading-[0.85] uppercase tracking-tight">
                {t('about.section2.title').split('\n').map((line, idx) => (
                  <span key={idx}>
                    {line}
                    <br />
                  </span>
                ))}
              </h2>
            </div>
            <hr className="my-4 md:my-[2vw] border-none border-t border-white/30" />
            <p className="max-w-[55ch] text-sm sm:text-base md:text-lg lg:text-[clamp(1.1rem,1.8vw,1.6rem)] font-normal leading-relaxed text-white/80">
              {t('about.section2.body')}
            </p>
            <hr className="my-4 md:my-[2vw] border-none border-t border-white/30" />
            <div className="flex flex-wrap gap-[3vw] gap-y-6">
              <div className="min-w-[180px] flex-1">
                <p className="mb-2 text-sm font-bold uppercase tracking-wider">{t('about.section2.peopleFirst.title')}</p>
                <p className="text-sm leading-relaxed opacity-75">
                  {t('about.section2.peopleFirst.description')}
                </p>
              </div>
              <div className="min-w-[180px] flex-1">
                <p className="mb-2 text-sm font-bold uppercase tracking-wider">{t('about.section2.dataIntegrity.title')}</p>
                <p className="text-sm leading-relaxed opacity-75">
                  {t('about.section2.dataIntegrity.description')}
                </p>
              </div>
              <div className="min-w-[180px] flex-1">
                <p className="mb-2 text-sm font-bold uppercase tracking-wider">{t('about.section2.operationalFlow.title')}</p>
                <p className="text-sm leading-relaxed opacity-75">
                  {t('about.section2.operationalFlow.description')}
                </p>
              </div>
            </div>
          </FlowSection>

          <FlowSection aria-label="Our Vision" style={{ backgroundColor: '#0d1117', color: '#fff' }}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">{t('about.section3.number')}</p>
            <hr className="my-4 md:my-[2vw] border-none border-t border-white/10" />
            <div>
              <h2 className="text-4xl sm:text-6xl md:text-8xl lg:text-[clamp(4.5rem,10vw,12rem)] font-black leading-[0.85] uppercase tracking-tight">
                {t('about.section3.titleBefore').split('\n').map((line, idx) => (
                  <span key={idx}>
                    {line}
                    <br />
                  </span>
                ))}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">{t('about.section3.titleHighlight')}</span>
              </h2>
            </div>
            <hr className="my-4 md:my-[2vw] border-none border-t border-white/10" />
            <p className="max-w-[55ch] text-sm sm:text-base md:text-lg lg:text-[clamp(1.1rem,1.8vw,1.6rem)] font-normal leading-relaxed text-white/70">
              {t('about.section3.body')}
            </p>
            <hr className="my-4 md:my-[2vw] border-none border-t border-white/10" />
            <div className="flex flex-wrap gap-[3vw] gap-y-6">
              <div className="min-w-[180px] flex-1">
                <p className="mb-2 text-sm font-bold uppercase tracking-wider text-emerald-400">{t('about.section3.workforceIntelligence.title')}</p>
                <p className="text-sm leading-relaxed opacity-60">
                  {t('about.section3.workforceIntelligence.description')}
                </p>
              </div>
              <div className="min-w-[180px] flex-1">
                <p className="mb-2 text-sm font-bold uppercase tracking-wider text-indigo-400">{t('about.section3.financialForesight.title')}</p>
                <p className="text-sm leading-relaxed opacity-60">
                  {t('about.section3.financialForesight.description')}
                </p>
              </div>
              <div className="min-w-[180px] flex-1">
                <p className="mb-2 text-sm font-bold uppercase tracking-wider text-cyan-400">{t('about.section3.clientExcellence.title')}</p>
                <p className="text-sm leading-relaxed opacity-60">
                  {t('about.section3.clientExcellence.description')}
                </p>
              </div>
            </div>
            <hr className="my-4 md:my-[2vw] border-none border-t border-white/10" />
            <p className="mt-6 md:mt-auto ml-auto max-w-[50ch] text-left md:text-right text-sm sm:text-base md:text-lg lg:text-[clamp(1.1rem,1.8vw,1.6rem)] font-normal leading-relaxed text-white/50">
              {t('about.section3.quote')}
            </p>
          </FlowSection>

          <FlowSection aria-label="What We Build" style={{ backgroundColor: '#111827', color: '#fff' }}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">{t('about.section4.number')}</p>
            <hr className="my-4 md:my-[2vw] border-none border-t border-white/10" />
            <div>
              <h2 className="text-4xl sm:text-6xl md:text-8xl lg:text-[clamp(4.5rem,10vw,12rem)] font-black leading-[0.85] uppercase tracking-tight">
                {t('about.section4.title').split('\n').map((line, idx) => (
                  <span key={idx}>
                    {line}
                    <br />
                  </span>
                ))}
              </h2>
            </div>
            <hr className="my-4 md:my-[2vw] border-none border-t border-white/10" />
            <div className="flex flex-wrap gap-[3vw] gap-y-6">
              <div className="min-w-[180px] flex-1">
                <p className="mb-2 text-sm font-bold uppercase tracking-wider">{t('about.section4.employeeManagement.title')}</p>
                <p className="text-sm leading-relaxed opacity-60">
                  {t('about.section4.employeeManagement.description')}
                </p>
              </div>
              <div className="min-w-[180px] flex-1">
                <p className="mb-2 text-sm font-bold uppercase tracking-wider">{t('about.section4.clientProjectTracking.title')}</p>
                <p className="text-sm leading-relaxed opacity-60">
                  {t('about.section4.clientProjectTracking.description')}
                </p>
              </div>
              <div className="min-w-[180px] flex-1">
                <p className="mb-2 text-sm font-bold uppercase tracking-wider">{t('about.section4.financialCommand.title')}</p>
                <p className="text-sm leading-relaxed opacity-60">
                  {t('about.section4.financialCommand.description')}
                </p>
              </div>
            </div>
          </FlowSection>
        </FlowArt>
      </div>

      {/* Storytelling Visual Experience */}
      <div className="relative z-10 max-w-7xl mx-auto py-32 space-y-32">
        <div className="text-center px-4 space-y-4 max-w-3xl mx-auto pb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-xs font-semibold tracking-wider text-accent uppercase select-none mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('story.badge')}</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight text-zinc-900 dark:text-white">
            {t('story.title')}
          </h2>
          <p className="text-zinc-500 dark:text-white/50 text-sm md:text-base">
            {t('story.subtitle')}
          </p>
        </div>

        {/* Step 1: Verification */}
        <StoryCard 
          step={t('story.step1.step')}
          title={t('story.step1.title')}
          description={t('story.step1.description')}
          icon={ShieldAlert}
          imageSrc="/phone_mockup_verified.png"
          alignment="left"
          glowColor="rgba(94, 106, 210, 0.12)"
        />

        {/* Step 2: Track Clients & Projects */}
        <StoryCard 
          step={t('story.step2.step')}
          title={t('story.step2.title')}
          description={t('story.step2.description')}
          icon={UserCheck}
          imageSrc="/phone_mockup_role.png"
          alignment="right"
          glowColor="rgba(52, 211, 153, 0.1)"
        />

        {/* Step 3: Financial Control */}
        <div id="financial-control-card">
          <StoryCard 
            step={t('story.step3.step')}
            title={t('story.step3.title')}
            description={t('story.step3.description')}
            icon={TrendingUp}
            imageSrc="/phone_mockup_financial.png"
            alignment="left"
            glowColor="rgba(94, 106, 210, 0.15)"
          />
        </div>
      </div>

      {/* Scroll-linked text reveal section */}
      <section className="relative z-10 w-full min-h-[150vh] flex items-center justify-center py-24 bg-white dark:bg-black transition-colors duration-300">
        <div className="w-full max-w-6xl mx-auto px-4">
          <TextRevealByWord text={t('reveal.text')} />
        </div>
      </section>

      {/* 3D Mockup Rotation Carousel */}
      <FeatureCarousel 
        title={
          <>
            {t('carousel.titlePrefix')}<span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-emerald-400">{t('carousel.titleHighlight')}</span>{t('carousel.titleSuffix')}
          </>
        }
        subtitle={t('carousel.subtitle')}
        images={appImages}
      />

      {/* Testimonials Section */}
      <section className="relative z-10 py-24 px-4 bg-zinc-50/50 dark:bg-zinc-950/30 border-t border-b border-zinc-200 dark:border-white/5 transition-colors duration-300">
        <div className="max-w-4xl mx-auto space-y-12 text-center">
          <div className="space-y-4">
            <div className="flex justify-center mb-2">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase select-none">
                <UserCheck className="w-3.5 h-3.5" />
                <span>{t('testimonials.badge')}</span>
              </div>
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight text-zinc-900 dark:text-white">
              {t('testimonials.title')}
            </h2>
            <p className="text-zinc-500 dark:text-white/40 text-sm md:text-base max-w-lg mx-auto">
              {t('testimonials.subtitle')}
            </p>
          </div>
          
          <div className="flex items-center justify-center relative w-full pt-10">
            <CircularTestimonials 
              testimonials={[
                {
                  quote: t('testimonials.items.dimaro.quote'),
                  name: t('testimonials.items.dimaro.name'),
                  designation: t('testimonials.items.dimaro.designation'),
                  src: "/dimaro.jpg"
                },
                {
                  quote: t('testimonials.items.eluan.quote'),
                  name: t('testimonials.items.eluan.name'),
                  designation: t('testimonials.items.eluan.designation'),
                  src: "/eluan.jpg"
                },
                {
                  quote: t('testimonials.items.precious.quote'),
                  name: t('testimonials.items.precious.name'),
                  designation: t('testimonials.items.precious.designation'),
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
            <div className="flex justify-center mb-2">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#5e6ad2]/10 border border-[#5e6ad2]/20 text-xs font-semibold tracking-wider text-[#5e6ad2] dark:text-[#a5b4fc] uppercase select-none">
                <Cpu className="w-3.5 h-3.5" />
                <span>{t('tech.badge')}</span>
              </div>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">{t('tech.title')}</h2>
            <p className="text-zinc-500 dark:text-white/40 text-xs md:text-sm">{t('tech.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tech 1 */}
            <GlowCard glowColor="purple" customSize={true} className="p-8 rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/5 space-y-4 text-left shadow-lg dark:shadow-none transition-colors duration-300">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{t('tech.expo.title')}</h3>
              <p className="text-sm text-zinc-500 dark:text-white/50 leading-relaxed">
                {t('tech.expo.description')}
              </p>
            </GlowCard>

            {/* Tech 2 */}
            <GlowCard glowColor="green" customSize={true} className="p-8 rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/5 space-y-4 text-left shadow-lg dark:shadow-none transition-colors duration-300">
              <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{t('tech.python.title')}</h3>
              <p className="text-sm text-zinc-500 dark:text-white/50 leading-relaxed">
                {t('tech.python.description')}
              </p>
            </GlowCard>

            {/* Tech 3 */}
            <GlowCard glowColor="blue" customSize={true} className="p-8 rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/5 space-y-4 text-left shadow-lg dark:shadow-none transition-colors duration-300">
              <div className="w-12 h-12 rounded-2xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center text-blue-400">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{t('tech.supabase.title')}</h3>
              <p className="text-sm text-zinc-500 dark:text-white/50 leading-relaxed">
                {t('tech.supabase.description')}
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
              <span>{t('support.badge')}</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">{t('support.title')}</h2>
            <p className="text-zinc-500 dark:text-white/40 text-xs md:text-sm">{t('support.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left">
            {/* Left Column: Contact info */}
            <div className="lg:col-span-5 p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-white/5 backdrop-blur-xl space-y-6 shadow-xl dark:shadow-none transition-colors duration-300">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Mail className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{t('support.left.title')}</h3>
                <p className="text-sm text-zinc-500 dark:text-white/60 leading-relaxed">
                  {t('support.left.description')}
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-white/5">
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-400 dark:text-white/40 font-bold mb-1">{t('support.left.directEmail')}</p>
                  <p className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white selection:bg-accent selection:text-white break-all">
                    adminsuiteteam@gmail.com
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-400 dark:text-white/40 font-bold mb-1">{t('support.left.responseGuarantee')}</p>
                  <p className="text-sm text-zinc-500 dark:text-white/60">
                    {t('support.left.responseGuaranteeValue')}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <a 
                  href="mailto:adminsuiteteam@gmail.com" 
                  className="px-5 py-2.5 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-white/90 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{t('support.left.sendEmail')}</span>
                </a>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText('adminsuiteteam@gmail.com');
                    alert(t('support.left.copiedAlert'));
                  }}
                  className="px-5 py-2.5 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-700 dark:text-white border border-zinc-200 dark:border-white/10 text-xs font-semibold transition-all"
                >
                  {t('support.left.copyAddress')}
                </button>
              </div>
            </div>

            {/* Right Column: Contact form */}
            <div className="lg:col-span-7 p-8 md:p-10 rounded-3xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-white/5 backdrop-blur-xl shadow-xl dark:shadow-none transition-colors duration-300">
              {submitted ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-[fadeSlideIn_0.3s_ease-out]">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 animate-[pulse_2s_infinite]">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">{t('support.form.success')}</h3>
                  <p className="text-sm text-zinc-500 dark:text-white/60 max-w-sm leading-relaxed">
                    {t('support.form.successDesc')}
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-6 px-6 py-2.5 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-700 dark:text-white border border-zinc-200 dark:border-white/10 text-xs font-semibold transition-all"
                  >
                    {t('support.form.sendAnother')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-white/40">{t('support.form.nameLabel')}</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-500/30 transition-all text-sm"
                        placeholder={t('support.form.namePlaceholder')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-white/40">{t('support.form.emailLabel')}</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-500/30 transition-all text-sm"
                        placeholder={t('support.form.emailPlaceholder')}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="subject" className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-white/40">{t('support.form.subjectLabel')}</label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-500/30 transition-all text-sm"
                      placeholder={t('support.form.subjectPlaceholder')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="message" className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-white/40">{t('support.form.messageLabel')}</label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-500/30 transition-all text-sm resize-none"
                      placeholder={t('support.form.messagePlaceholder')}
                    />
                  </div>

                  {formError && (
                    <p className="text-xs text-red-500 font-semibold">{formError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-white/90 font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="inline-block w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{t('support.form.submit')}</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section id="cta-section" className="relative z-10 py-24 px-4 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(94,106,210,0.15),transparent_60%)] pointer-events-none" />
        <div className="max-w-xl mx-auto space-y-8 relative z-10">
          <div className="flex justify-center mb-2">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase select-none">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('cta.badge')}</span>
            </div>
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white">{t('cta.title')}</h2>
          <p className="text-zinc-500 dark:text-white/60 text-sm md:text-base leading-relaxed">
            {t('cta.description')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <ParticleButton
              size="lg"
              href="https://expo.dev/artifacts/eas/KI7RkfuEVfKjc0UofLomSfDUPKIL5-Qpm9_IBg4NgAo.apk"
              download={true}
              className="rounded-full px-8 bg-zinc-900 text-white dark:bg-white dark:text-black hover:opacity-95 font-semibold flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{t('cta.downloadApk')}</span>
            </ParticleButton>
            <a href="https://adminsuite-web.onrender.com" target="_blank" rel="noreferrer" className="pointer-events-auto">
              <Button size="lg" variant="outline" className="rounded-full px-8 border-zinc-300 dark:border-white/10 text-zinc-700 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/5">
                {t('cta.useWeb')}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div id="footer-section">
        <Footer tagline={t('footer.tagline')} />
      </div>
    </div>
  );
}
