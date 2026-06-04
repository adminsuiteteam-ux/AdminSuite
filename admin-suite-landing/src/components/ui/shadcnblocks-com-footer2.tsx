interface MenuItem {
  title: string;
  links: {
    text: string;
    url: string;
  }[];
}

interface Footer2Props {
  logo?: {
    url: string;
    src: string;
    alt: string;
    title: string;
  };
  tagline?: string;
  menuItems?: MenuItem[];
  copyright?: string;
  bottomLinks?: {
    text: string;
    url: string;
  }[];
}

const Footer2 = ({
  logo = {
    src: "https://www.shadcnblocks.com/images/block/block-1.svg",
    alt: "blocks for shadcn/ui",
    title: "AdminSuite",
    url: "#",
  },
  tagline = "Premium management workspace made easy.",
  menuItems = [
    {
      title: "Product",
      links: [
        { text: "Overview", url: "#" },
        { text: "Features", url: "#" },
        { text: "Security", url: "#" },
        { text: "Integrations", url: "#" },
      ],
    },
    {
      title: "Company",
      links: [
        { text: "About Us", url: "#" },
        { text: "Blog", url: "#" },
        { text: "Careers", url: "#" },
        { text: "Contact", url: "#" },
      ],
    },
    {
      title: "Resources",
      links: [
        { text: "Documentation", url: "#" },
        { text: "Help Center", url: "#" },
        { text: "System Status", url: "#" },
      ],
    },
    {
      title: "Developers",
      links: [
        { text: "API Reference", url: "#" },
        { text: "GitHub", url: "#" },
        { text: "SDKs", url: "#" },
      ],
    },
  ],
  copyright = "© 2026 AdminSuite Workspace. All rights reserved.",
  bottomLinks = [
    { text: "Terms and Conditions", url: "#" },
    { text: "Privacy Policy", url: "#" },
  ],
}: Footer2Props) => {
  return (
    <section className="py-24 border-t border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white relative z-10 px-4 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <footer>
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-6">
            <div className="col-span-2 mb-8 lg:mb-0">
              <div className="flex items-center gap-4">
                <a href={logo.url} className="p-4 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl flex items-center justify-center hover:scale-105 transition-transform duration-200">
                  <img src="/logo.png" alt="AdminSuite" className="w-16 h-16 object-contain dark:invert" />
                </a>
                <p className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-zinc-950 to-zinc-600 dark:from-white dark:to-white/70 select-none">{logo.title}</p>
              </div>
              <p className="mt-4 text-sm text-zinc-500 dark:text-white/50 max-w-sm">{tagline}</p>
            </div>
            {menuItems.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                <h3 className="mb-4 text-sm font-semibold tracking-wider text-zinc-700 dark:text-white/90 uppercase">{section.title}</h3>
                <ul className="space-y-3 text-xs text-zinc-400 dark:text-white/40">
                  {section.links.map((link, linkIdx) => (
                    <li
                      key={linkIdx}
                      className="hover:text-accent transition-colors"
                    >
                      <a href={link.url}>{link.text}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-16 flex flex-col justify-between gap-4 border-t border-zinc-200 dark:border-white/5 pt-8 text-xs text-zinc-400 dark:text-white/40 md:flex-row md:items-center">
            <p>{copyright}</p>
            <ul className="flex gap-6">
              {bottomLinks.map((link, linkIdx) => (
                <li key={linkIdx} className="hover:text-zinc-900 dark:hover:text-white transition-colors">
                  <a href={link.url}>{link.text}</a>
                </li>
              ))}
            </ul>
          </div>
        </footer>
      </div>
    </section>
  );
};

export { Footer2 };
