import Link from 'next/link';

export default function Navbar() {
  return (
    <nav
      style={{ background: 'var(--bnb-surface)', borderBottom: '1px solid var(--bnb-border)' }}
      className="w-full sticky top-0 z-50 h-14"
    >
      <div className="max-w-screen-2xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <polygon points="12,2 22,7 22,17 12,22 2,17 2,7" fill="#F0B90B" />
            <polygon points="12,6 8,10 12,14 16,10" fill="#0B0E11" />
          </svg>
          <span style={{ color: 'var(--bnb-yellow)', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.3px' }}>
            ArbitragemBot
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-6">
          {['Dashboard', 'Alertas', 'Docs'].map((item) => (
            <span
              key={item}
              style={{ color: item === 'Dashboard' ? 'var(--bnb-yellow)' : 'var(--bnb-muted)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
              className="hover:text-white transition-colors"
            >
              {item}
            </span>
          ))}
        </div>

        {/* Right */}
        <a
          href="https://github.com/DanielCooding/Bot_de_arbitragem_cripto"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--bnb-muted)', fontSize: '12px' }}
          className="flex items-center gap-1.5 hover:text-white transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          GitHub
        </a>
      </div>
    </nav>
  );
}
