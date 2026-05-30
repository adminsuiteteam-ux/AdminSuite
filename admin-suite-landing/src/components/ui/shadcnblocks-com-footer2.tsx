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
    <section className="py-24 border-t border-white/5 bg-zinc-950 text-white relative z-10 px-4">
      <div className="max-w-7xl mx-auto">
        <footer>
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-6">
            <div className="col-span-2 mb-8 lg:mb-0">
              <div className="flex items-center gap-3">
                <a href={logo.url} className="p-2 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
                  <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center text-white font-bold text-xs">
                    A
                  </div>
                </a>
                <p className="text-xl font-bold tracking-tight">{logo.title}</p>
              </div>
              <p className="mt-4 text-sm text-white/50 max-w-sm">{tagline}</p>
            </div>
            {menuItems.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                <h3 className="mb-4 text-sm font-semibold tracking-wider text-white/90 uppercase">{section.title}</h3>
                <ul className="space-y-3 text-xs text-white/40">
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
          <div className="mt-16 flex flex-col justify-between gap-4 border-t border-white/5 pt-8 text-xs text-white/40 md:flex-row md:items-center">
            <p>{copyright}</p>
            <ul className="flex gap-6">
              {bottomLinks.map((link, linkIdx) => (
                <li key={linkIdx} className="hover:text-white transition-colors">
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
