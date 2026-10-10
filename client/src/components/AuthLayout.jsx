import { BookOpen, Cloud, LineChart, Sparkles } from 'lucide-react';

export default function AuthLayout({ children, variant }) {
  const isRegister = variant === 'register';

  return (
    <main className={`mbu-auth-page${isRegister ? ' is-register' : ''}`}>
      <section className="mbu-auth-story" aria-label="Mohan Babu University Digital Library">
        <img className="mbu-auth-campus" src="/assets/library-building-hero-crop.png" alt="" />
        <div className="mbu-auth-story-tint" />
        <div className="mbu-auth-brand">
          <img src="/images/mbu-logo.png" alt="Mohan Babu University" />
          <span />
          <em>Learners Today<br />Leaders Tomorrow</em>
        </div>
        <div className="mbu-auth-story-copy">
          <span className="mbu-auth-kicker">WELCOME TO</span>
          <h2>DATA SCIENCE<br /><strong>DIGITAL LIBRARY</strong></h2>
          <p>Your Academic Space, All in One Place</p>
        </div>
        <span className="mbu-auth-slogan">Learn<br />Practice<br />Grow</span>
        <div className="mbu-auth-story-footer">
          <span><BookOpen size={15} /> Study Materials</span>
          <i />
          <span><LineChart size={15} /> Data Science Resources</span>
          <i />
          <span><Cloud size={15} /> Learn&nbsp; | &nbsp;Practice&nbsp; | &nbsp;Grow</span>
        </div>
        <Sparkles className="mbu-auth-sparkle" size={22} aria-hidden="true" />
      </section>

      <section className="mbu-auth-panel">
        <div className="mbu-auth-card">
          {children}
        </div>
        <p className="mbu-auth-university">MOHAN BABU UNIVERSITY <span>·</span> DIGITAL LIBRARY</p>
      </section>
    </main>
  );
}
