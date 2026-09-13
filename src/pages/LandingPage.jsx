import { useState, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { AmbientBackground } from '../components/common/AmbientBackground'
import { VaultlineLogo } from '../components/common/VaultlineLogo'
import './LandingPage.css'

const SAMPLE_FILES = [
  {
    name: 'Q3_Financial_Audit.pdf',
    size: '3.8 MB',
    type: 'application/pdf',
    plaintextExcerpt: 'CONFIDENTIAL: Q3 Operating Revenue $4.82M. Margin 68.4%. Audit status: Clean.',
    cipherHex: '5f 2d c9 40 8b 17 a3 e2 d1 84 92 f8 3c 1a 77 ee 09 4f 33 bb 81 29 6a 10 9d c4 e5 2a 3f 7b 88 12',
    dek: 'a8f4c2e19034bc7790de3a1f89345bc79012a4e58832aef4890cbe3412567890',
  },
  {
    name: 'source_code_archive.tar.gz',
    size: '14.2 MB',
    type: 'application/gzip',
    plaintextExcerpt: 'export default function decryptFileContent(ciphertext, dek) { return window.crypto.subtle... }',
    cipherHex: '89 31 1a b4 0c f7 e9 23 88 41 9a bc 56 12 77 34 da ef 90 12 bc 34 8a ef 77 12 45 90 ab cd ef 01',
    dek: '419abce578129034f8902345bc781234901245678832aef4890cbe3412567890',
  },
  {
    name: 'patient_mri_scan.dcm',
    size: '28.6 MB',
    type: 'application/dicom',
    plaintextExcerpt: 'PATIENT_ID: 94029-A // SCAN: Cranial Axial T1-Weighted // CONTRAST: None // DIAGNOSIS: Normal',
    cipherHex: '12 8f 7c 33 90 a1 45 ef bc 89 23 45 67 89 0a bc de f0 12 34 56 78 9a bc de f0 12 34 56 78 9a bc',
    dek: 'de3a1f89345bc79012a4e58832aef4890cbe3412567890a8f4c2e19034bc7790',
  },
]

const COMPARISONS = [
  {
    metric: 'Encryption Location',
    traditional: 'On company servers (Provider holds keys)',
    vaultline: 'In browser volatile memory (Before upload)',
  },
  {
    metric: 'Master Password Exposure',
    traditional: 'Sent over wire to auth endpoint',
    vaultline: 'Never transmitted; only HKDF proof is sent',
  },
  {
    metric: 'Subpoena / Insider Defense',
    traditional: 'Provider can decrypt and view documents',
    vaultline: 'Provider holds only opaque AES-GCM noise',
  },
  {
    metric: 'Key Wrapping & Multi-Party',
    traditional: 'Shared ACL table managed by database',
    vaultline: 'Client-side RSA-3072 envelope re-wrapping',
  },
  {
    metric: 'Ciphertext Tamper Detection',
    traditional: 'CRC or basic checksums',
    vaultline: '128-bit Galois Field cryptographic tag',
  },
]

export function LandingPage() {
  const navigate = useNavigate()
  const [activeFile, setActiveFile] = useState(0)
  const [encrypting, setEncrypting] = useState(false)
  const [encryptionDone, setEncryptionDone] = useState(false)
  const [inspectMode, setInspectMode] = useState('client') // 'client' or 'server'
  const [activeFaq, setActiveFaq] = useState(null)
  const fileSelectorId = useId()

  const currentSample = SAMPLE_FILES[activeFile]

  function runSimulatedCrypto() {
    setEncrypting(true)
    setEncryptionDone(false)
    window.setTimeout(() => {
      setEncrypting(false)
      setEncryptionDone(true)
    }, 700)
  }

  return (
    <div className="landing-page">
      <AmbientBackground />

      <header className="landing-nav-wrap">
        <nav className="landing-nav" aria-label="Main navigation">
          <a className="landing-brand" href="#top">
            <VaultlineLogo size={30} />
            <span>Vaultline</span>
          </a>
          <div className="landing-nav__links">
            <a href="#demo-preview">Live Sandbox</a>
            <a href="#security">Architecture</a>
            <a href="#comparison">Compare</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="landing-nav__actions">
            <button className="text-link" onClick={() => navigate('/demo')}>
              Interactive Demo ↗
            </button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/login')}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate('/register')}>
              Get Started
            </Button>
          </div>
        </nav>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="landing-hero" id="top">
          <div className="hero-kicker">
            <span className="hero-badge">ACADEMIC RESEARCH & ENTERPRISE VAULT</span>
            <span className="hero-divider">•</span>
            <span>Zero-Knowledge Envelope Cryptography</span>
          </div>

          <h1 className="hero-title">
            The cloud should store your data.<br />
            <em>Never hold your keys.</em>
          </h1>

          <p className="hero-lead">
            Vaultline brings W3C Web Crypto primitives directly into your browser. Files are
            sealed with AES-256-GCM and enveloped with 3072-bit RSA keys before touching the wire.
            Even with root server access, our backend sees only random mathematical noise.
          </p>

          <div className="hero-actions">
            <Button size="lg" onClick={() => navigate('/register')}>
              Launch Secure Vault <span>→</span>
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate('/demo')}>
              Launch Interactive Simulator ↗
            </Button>
          </div>

          <div className="hero-stats">
            <div className="stat-card">
              <span className="stat-val">0 B</span>
              <span className="stat-label">Plaintext transmitted to server</span>
            </div>
            <div className="stat-card">
              <span className="stat-val">3072-bit</span>
              <span className="stat-label">RSA-OAEP Key Wrapping</span>
            </div>
            <div className="stat-card">
              <span className="stat-val">600,000</span>
              <span className="stat-label">PBKDF2 Derivation Iterations</span>
            </div>
            <div className="stat-card">
              <span className="stat-val">128-bit</span>
              <span className="stat-label">Galois Tamper Verification Tag</span>
            </div>
          </div>
        </section>

        {/* INTERACTIVE CLIENT VS SERVER CRYPTO SIMULATOR */}
        <section className="crypto-sandbox-section" id="demo-preview">
          <div className="section-head">
            <span className="section-eyebrow">IN-BROWSER CRYPTOGRAPHIC TESTBENCH</span>
            <h2>See zero-knowledge encryption in real-time</h2>
            <p>
              Choose a test document and toggle between what remains in your browser’s trusted memory
              versus what the FastAPI storage server actually receives.
            </p>
          </div>

          <div className="sandbox-container">
            <div className="sandbox-controls">
              <div className="control-group">
                <label htmlFor={fileSelectorId}>Select Sample Payload:</label>
                <div className="file-selector" id={fileSelectorId}>
                  {SAMPLE_FILES.map((f, i) => (
                    <button
                      key={f.name}
                      className={`file-btn ${activeFile === i ? 'active' : ''}`}
                      onClick={() => {
                        setActiveFile(i)
                        setEncryptionDone(false)
                      }}
                    >
                      <span className="file-btn__name">{f.name}</span>
                      <span className="file-btn__size">{f.size}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="sandbox-action">
                <Button onClick={runSimulatedCrypto} disabled={encrypting}>
                  {encrypting ? 'Computing AES-256-GCM in RAM…' : 'Encrypt in Browser (Web Crypto)'}
                </Button>
                {encryptionDone && (
                  <span className="crypto-success-indicator">
                    ✓ Sealed with ephemeral DEK in volatile memory
                  </span>
                )}
              </div>
            </div>

            <div className="sandbox-preview">
              <div className="perspective-toggle">
                <button
                  className={inspectMode === 'client' ? 'active' : ''}
                  onClick={() => setInspectMode('client')}
                >
                  <span className="indicator-dot client" /> Client View (Your Browser RAM)
                </button>
                <button
                  className={inspectMode === 'server' ? 'active' : ''}
                  onClick={() => setInspectMode('server')}
                >
                  <span className="indicator-dot server" /> Server View (FastAPI & Database)
                </button>
              </div>

              {inspectMode === 'client' ? (
                <div className="terminal-view client-view">
                  <div className="terminal-head">
                    <span className="circle red" />
                    <span className="circle yellow" />
                    <span className="circle green" />
                    <span className="terminal-title">browser-memory://trusted-execution-environment</span>
                  </div>
                  <div className="terminal-body">
                    <p className="code-comment">// 1. Plaintext File Buffer (Readable only prior to upload)</p>
                    <p className="code-lead">FILENAME: <strong>{currentSample.name}</strong></p>
                    <p className="code-lead">PAYLOAD CONTENT:</p>
                    <pre className="code-snippet">{currentSample.plaintextExcerpt}</pre>

                    <div className="key-derivation-callout">
                      <p className="code-comment">// 2. Ephemeral Data Encryption Key (DEK)</p>
                      <code>DEK: {currentSample.dek.substring(0, 32)}... [AES-GCM-256]</code>
                      <small>Generated in JavaScript memory. Never written to localStorage or cookies.</small>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="terminal-view server-view">
                  <div className="terminal-head">
                    <span className="circle red" />
                    <span className="circle yellow" />
                    <span className="circle green" />
                    <span className="terminal-title">postgresql://vaultline-server/blobs</span>
                  </div>
                  <div className="terminal-body">
                    <p className="code-comment">// What is stored in database & filesystem:</p>
                    <div className="kv-row">
                      <span>storage_name:</span>
                      <code>f9a2e8c1-0b34-4d89-912f.enc</code>
                    </div>
                    <div className="kv-row">
                      <span>encrypted_metadata:</span>
                      <code>eyI5NiI6ICIxMmE... (Filename & MIME masked)</code>
                    </div>
                    <div className="kv-row">
                      <span>wrapped_key:</span>
                      <code>wKey_RSA3072_01Jn89a2bc90fe... (Requires private key)</code>
                    </div>
                    <div className="kv-row full">
                      <span>raw_ciphertext_bytes (first 32B):</span>
                      <pre className="hex-block">{currentSample.cipherHex}</pre>
                    </div>
                    <div className="zero-knowledge-badge">
                      <strong>SERVER VISIBILITY: ZERO</strong>
                      <span>The server administrator or compromised root cannot read this file.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* COMPARISON MATRIX */}
        <section className="landing-comparison" id="comparison">
          <div className="section-head">
            <span className="section-eyebrow">ARCHITECTURAL CONTRAST</span>
            <h2>Why traditional cloud storage falls short</h2>
            <p>
              Most services encrypt &ldquo;at rest&rdquo;, meaning they hold master keys on their own
              servers. Vaultline shifts cryptographic authority entirely to client-side Web Crypto.
            </p>
          </div>

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Security Dimension</th>
                  <th>Commercial Cloud (Dropbox / Google Drive)</th>
                  <th>Vaultline Zero-Knowledge Vault</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISONS.map((row) => (
                  <tr key={row.metric}>
                    <td><strong>{row.metric}</strong></td>
                    <td className="comparison-bad">
                      <span className="icon-bad">✗</span> {row.traditional}
                    </td>
                    <td className="comparison-good">
                      <span className="icon-good">✓</span> {row.vaultline}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CORE FEATURES */}
        <section className="landing-features" id="security">
          <div className="section-head">
            <span className="section-eyebrow">DEFENSE-IN-DEPTH</span>
            <h2>Built on rigorous cryptographic standards</h2>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-card__badge">01 / DUAL-BRANCH HKDF</div>
              <h3>Separated Authentication Proof</h3>
              <p>
                Your master password never leaves your browser. PBKDF2 with 600,000 iterations feeds HKDF
                to derive two independent keys: an <code>authProof</code> for the server and a <code>wrapKey</code>
                that never leaves client RAM.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-card__badge">02 / MULTI-PARTY ENVELOPES</div>
              <h3>Zero-Copy Secure Sharing</h3>
              <p>
                Share documents without re-uploading gigabytes of data. Your browser downloads the recipient’s
                RSA-3072 public key and safely re-wraps the 256-bit file key. The server blindly stores the
                384-byte envelope without learning the file contents.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-card__badge">03 / TAMPER IMMUNITY</div>
              <h3>128-Bit AEAD Integrity</h3>
              <p>
                Every encrypted block carries an AES-GCM Galois authentication tag. If an attacker or compromised
                host flips a single bit in transit or on disk, decryption immediately throws an integrity failure.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-card__badge">04 / ZERO RUNTIME STATE</div>
              <h3>Ephemeral Key Lifetime</h3>
              <p>
                Unwrapped RSA private keys exist strictly in volatile JavaScript heap memory and are wiped on
                tab close or logout. No private keys are ever persisted to localStorage or web cookies.
              </p>
            </div>
          </div>
        </section>

        {/* EVALUATION FAQ */}
        <section className="landing-faq" id="faq">
          <div className="section-head">
            <span className="section-eyebrow">TECHNICAL TRANSPARENCY</span>
            <h2>Frequently Asked Questions</h2>
          </div>

          <div className="faq-accordion">
            {[
              {
                q: 'Can the server read my files if compelled by subpoena?',
                a: 'No. The server stores only raw ciphertext bytes encrypted with AES-256-GCM. The Data Encryption Keys are wrapped under your RSA-3072 public key, and your private key is protected by an Argon2/PBKDF2 wrapping key that never touches the backend. Without your master password, the server cannot recover a single plaintext byte.',
              },
              {
                q: 'How does sharing work without giving away my password?',
                a: 'Vaultline uses envelope encryption. When sharing with Adrian Newey or your colleague, your browser downloads their public key from the API, unwraps the file’s DEK in memory using your private key, re-wraps that DEK using their public key, and uploads the new 384-byte wrapped envelope to the server. The file content never leaves storage and is not re-encrypted.',
              },
              {
                q: 'What prevents server tampering or bit-flip attacks?',
                a: 'AES-256-GCM provides Authenticated Encryption with Associated Data (AEAD). Decryption strictly requires validating a 128-bit Galois authentication tag. If even one bit of ciphertext or metadata is altered in transit or on disk, the Web Crypto API immediately halts decryption and throws an integrity failure.',
              },
              {
                q: 'Why does the app ask for a password again after closing the tab?',
                a: 'This is a deliberate security invariant. Unwrapped RSA private keys exist strictly in volatile JavaScript heap memory and are never persisted to localStorage or sessionStorage, shielding you from cross-site scripting (XSS) and disk extraction.',
              },
            ].map((faq, i) => (
              <div
                key={faq.q}
                className={`faq-item ${activeFaq === i ? 'open' : ''}`}
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
              >
                <div className="faq-question">
                  <span>{faq.q}</span>
                  <span className="faq-toggle">{activeFaq === i ? '−' : '+'}</span>
                </div>
                {activeFaq === i && <p className="faq-answer">{faq.a}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* CALL TO ACTION */}
        <section className="landing-cta">
          <div>
            <p>EVALUATE VAULTLINE TODAY</p>
            <h2>Ready to experience<br /><em>true privacy?</em></h2>
          </div>
          <div className="cta-actions">
            <Button size="lg" onClick={() => navigate('/register')}>
              Create a Free Vault <span>→</span>
            </Button>
            <button className="text-link white-text" onClick={() => navigate('/demo')}>
              Explore Interactive Demo ↗
            </button>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <a className="landing-brand" href="#top">
          <VaultlineLogo size={32} />
          <span>Vaultline</span>
        </a>
        <p>Zero-Knowledge Cryptographic Architecture • Evaluated under MIT License</p>
        <small>© 2026 Ishjaap Singh, Vikramaditya, Sukhansh Mittal</small>
      </footer>
    </div>
  )
}

export default LandingPage
