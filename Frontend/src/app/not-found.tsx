import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .anim-1 { animation: fadeUp 0.55s ease-out 0.05s both; }
        .anim-2 { animation: fadeUp 0.55s ease-out 0.18s both; }
        .anim-3 { animation: fadeUp 0.55s ease-out 0.28s both; }
        .anim-4 { animation: fadeUp 0.55s ease-out 0.38s both; }
        .anim-5 { animation: fadeIn 0.6s ease-out 0.52s both; }
        .dot    { animation: pulse 2s ease-in-out infinite; }

        .btn-white {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px; border-radius: 12px;
          background: #ffffff; color: #0f172a;
          font-size: 14px; font-weight: 700;
          border: none; cursor: pointer; text-decoration: none;
          box-shadow: 0 2px 0 rgba(0,0,0,0.35), 0 6px 20px rgba(0,0,0,0.25);
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }
        .btn-white:hover {
          background: #f1f5f9;
          transform: translateY(-2px);
          box-shadow: 0 4px 0 rgba(0,0,0,0.3), 0 10px 28px rgba(0,0,0,0.25);
        }
        .btn-white:active { transform: translateY(0); }

        .btn-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px; border-radius: 12px;
          background: transparent; color: #cbd5e1;
          font-size: 14px; font-weight: 600;
          border: 1.5px solid rgba(255,255,255,0.2); cursor: pointer;
          text-decoration: none;
          transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        .btn-ghost:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.35);
          color: #ffffff;
          transform: translateY(-2px);
        }
        .btn-ghost:active { transform: translateY(0); }

        .quick-link {
          color: #64748b; font-size: 14px; text-decoration: none;
          transition: color 0.15s ease;
        }
        .quick-link:hover { color: #ffffff; }

        .nav-login {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 8px;
          border: 1.5px solid rgba(255,255,255,0.15); color: #94a3b8;
          font-size: 13px; font-weight: 600; text-decoration: none;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        .nav-login:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.3);
          color: #ffffff;
        }
      `}</style>

      {/* Background dot grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
      }} />

      {/* Ambient glows */}
      <div style={{
        position: 'absolute', top: '15%', left: '15%',
        width: 480, height: 480, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '15%', right: '15%',
        width: 380, height: 380, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(5,150,105,0.14) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />

      {/* Navbar */}
      <nav style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: 56,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo-icon.png" alt="VAB" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontWeight: 700, color: '#ffffff', fontSize: 13, letterSpacing: '-0.02em' }}>VAB Informatics</span>
            <span style={{ color: '#475569', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Private Limited</span>
          </div>
        </Link>
        <Link href="/login" className="nav-login">
          Login →
        </Link>
      </nav>

      {/* Main content */}
      <main style={{
        position: 'relative', zIndex: 10,
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px', textAlign: 'center',
      }}>

        {/* 404 number */}
        <div className="anim-1" style={{ position: 'relative', marginBottom: 16, userSelect: 'none' }}>
          <span style={{
            fontSize: 'clamp(120px, 18vw, 200px)',
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: '-0.05em',
            background: 'linear-gradient(135deg, rgba(167,139,250,0.55) 0%, rgba(52,211,153,0.35) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            display: 'block',
          }}>
            404
          </span>
        </div>

        {/* Badge */}
        <div className="anim-2" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', borderRadius: 999,
          border: '1px solid rgba(124,58,237,0.35)',
          background: 'rgba(124,58,237,0.12)',
          color: '#a78bfa', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          marginBottom: 20,
        }}>
          <span className="dot" style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#a78bfa', display: 'inline-block',
          }} />
          Page Not Found
        </div>

        {/* Heading */}
        <h1 className="anim-3" style={{
          fontSize: 'clamp(26px, 4vw, 40px)',
          fontWeight: 800, color: '#f1f5f9',
          margin: '0 0 16px', lineHeight: 1.2, letterSpacing: '-0.02em',
        }}>
          Looks like you&apos;re lost.
        </h1>

        {/* Subtext */}
        <p className="anim-3" style={{
          color: '#64748b', fontSize: 16, maxWidth: 420,
          lineHeight: 1.7, margin: '0 0 40px',
        }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>

        {/* Buttons */}
        <div className="anim-4" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/" className="btn-white">
            🏠 Back to Home
          </Link>
          <Link href="/login" className="btn-ghost">
            Login to your account
          </Link>
        </div>

        {/* Quick links */}
        <div className="anim-5" style={{
          marginTop: 56, display: 'flex',
          flexWrap: 'wrap', alignItems: 'center',
          justifyContent: 'center', gap: '12px 32px',
        }}>
          <span style={{ color: '#334155', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>
            Quick links
          </span>
          {[
            { label: 'Home', href: '/' },
            { label: 'Login', href: '/login' },
            { label: 'Register', href: '/register' },
            { label: 'Dashboard', href: '/dashboard' },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="quick-link">
              {l.label} →
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <div style={{
        position: 'relative', zIndex: 10,
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '20px 24px', textAlign: 'center',
      }}>
        <span style={{ color: '#334155', fontSize: 12 }}>
          © 2025 VAB Enterprise. All rights reserved.
        </span>
      </div>
    </div>
  );
}
