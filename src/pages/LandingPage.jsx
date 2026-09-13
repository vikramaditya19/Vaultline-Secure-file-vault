import { useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import './LandingPage.css'

const features = [
  { number: '01', title: 'Private by design', copy: 'Files and filenames are encrypted in your browser before they move.' },
  { number: '02', title: 'Share the key, not the file', copy: 'Grant access without creating another copy of your encrypted content.' },
  { number: '03', title: 'Tamper evident', copy: 'Authenticated encryption rejects altered files before they are opened.' },
]

export function LandingPage() {
  const navigate = useNavigate()
  return (
    <div className="landing-page">
      <nav className="landing-nav" aria-label="Main navigation">
        <a className="landing-brand" href="#top"><span>V</span> Vaultline</a>
        <div className="landing-nav__links">
          <a href="#security">Security</a><a href="#how">How it works</a><a href="#principles">Principles</a>
        </div>
        <Button size="sm" onClick={() => navigate('/login')}>Open your vault <span aria-hidden="true">→</span></Button>
      </nav>

      <main id="top" className="landing-shell">
        <section className="landing-hero">
          <div className="landing-hero__copy">
            <p className="eyebrow">A PRIVATE PLACE FOR IMPORTANT THINGS</p>
            <h1>Your files.<br/><em>Beautifully</em> private.</h1>
            <p className="landing-hero__lede">A calm, end-to-end encrypted vault that keeps the keys where they belong: with you.</p>
            <div className="landing-hero__actions">
              <Button size="lg" onClick={() => navigate('/register')}>Create your vault <span>→</span></Button>
              <button className="text-link" onClick={() => navigate('/demo')}>Start guided demo <span>↗</span></button>
            </div>
            <div className="trust-row"><span>● Encrypted before upload</span><span>● Private keys stay with you</span></div>
          </div>

          <div className="vault-art" aria-label="A preview of an encrypted Vaultline workspace">
            <div className="vault-art__halo" />
            <div className="vault-window">
              <div className="vault-window__top"><span className="mini-brand">V.</span><span className="vault-pill">Protected</span><span>•••</span></div>
              <p className="vault-window__kicker">YOUR VAULT</p>
              <h2>Good morning.</h2>
              <div className="vault-window__stats"><div><b>12</b><span>Files</span></div><div><b>3</b><span>Shared</span></div><div><b>100%</b><span>Encrypted</span></div></div>
              <div className="vault-file"><span className="vault-file__icon">PDF</span><span><b>Thesis notes.pdf</b><small>Encrypted moments ago</small></span><i>•••</i></div>
              <div className="vault-file"><span className="vault-file__icon sage">ZIP</span><span><b>Project archive.zip</b><small>Only you can open this</small></span><i>•••</i></div>
            </div>
            <div className="floating-card floating-card--lock"><span>⌁</span><b>AES-256</b><small>Locked locally</small></div>
            <div className="floating-card floating-card--share"><span>↗</span><b>Shared safely</b><small>One wrapped key</small></div>
          </div>
        </section>

        <section className="landing-metrics" aria-label="Product guarantees">
          <div><span className="metric-icon">◇</span><b>Zero</b><small>plaintext files on server</small></div>
          <div><span className="metric-icon">⌁</span><b>256-bit</b><small>AES-GCM encryption</small></div>
          <div><span className="metric-icon">◎</span><b>600k</b><small>password derivation rounds</small></div>
          <div><span className="metric-icon">↗</span><b>One</b><small>key wrap per recipient</small></div>
        </section>

        <section id="security" className="feature-section">
          <div className="section-heading"><p className="eyebrow">WHAT MAKES IT DIFFERENT</p><h2>Security that feels<br/><em>effortless.</em></h2></div>
          <div className="feature-grid">{features.map((feature, index) => <article key={feature.number} className={`feature-card feature-card--${index + 1}`}><span>{feature.number}</span><div className="feature-card__symbol">{['⌁','↗','◇'][index]}</div><h3>{feature.title}</h3><p>{feature.copy}</p></article>)}</div>
        </section>

        <section id="how" className="process-section">
          <div><p className="eyebrow">HOW IT WORKS</p><h2>Complex cryptography.<br/><em>Three simple steps.</em></h2></div>
          <ol><li><b>01</b><span><strong>Choose a file</strong><small>Your browser creates a unique encryption key.</small></span></li><li><b>02</b><span><strong>Encrypt locally</strong><small>Content and filename become unreadable ciphertext.</small></span></li><li><b>03</b><span><strong>Store or share</strong><small>Only authorized private keys can unlock it.</small></span></li></ol>
        </section>

        <section id="principles" className="landing-cta"><div><p>READY WHEN YOU ARE</p><h2>Keep something<br/><em>worth protecting.</em></h2></div><Button size="lg" onClick={() => navigate('/register')}>Create a free vault <span>→</span></Button></section>
      </main>
      <footer className="landing-footer"><a className="landing-brand" href="#top"><span>V</span> Vaultline</a><p>Encrypted in your browser. Built with care.</p><small>© 2026 Vaultline</small></footer>
    </div>
  )
}

export default LandingPage
