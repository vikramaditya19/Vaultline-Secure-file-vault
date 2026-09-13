import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import './ProductDemoPage.css'

const STEPS = [
  { label: 'Overview', title: 'Your private workspace', copy: 'This is what Vaultline looks like after your password unlocks your private key. The server still sees only encrypted records.' },
  { label: 'Encrypt', title: 'Encrypt before upload', copy: 'Watch a file become ciphertext locally. Its contents and filename are protected before anything reaches the API.' },
  { label: 'Share', title: 'Share access, not copies', copy: 'Vaultline wraps the same file key for Maya. The encrypted file never moves and the server never receives the usable key.' },
  { label: 'Open', title: 'Decrypt only when needed', copy: 'Your private key unwraps the file key in memory. AES-GCM also verifies that nobody altered the encrypted file.' },
  { label: 'Proof', title: 'The security story, proven', copy: 'Passwords stay in the browser, private keys stay wrapped at rest, and every recipient gets a different wrapped key.' },
]

const FILES = [
  { type: 'PDF', name: 'Research proposal.pdf', meta: '2.4 MB · encrypted today', tone: 'coral' },
  { type: 'ZIP', name: 'Final submission.zip', meta: '18.7 MB · encrypted yesterday', tone: 'sage' },
  { type: 'PNG', name: 'Architecture map.png', meta: '860 KB · shared with Maya', tone: 'sand' },
]

export function ProductDemoPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [uploadState, setUploadState] = useState('ready')
  const [shared, setShared] = useState(false)
  const [opened, setOpened] = useState(false)
  const current = STEPS[step]

  const status = useMemo(() => {
    if (step === 1 && uploadState === 'encrypted') return 'Encrypted locally · ready to store'
    if (step === 2 && shared) return 'Access granted to maya@vaultline.demo'
    if (step === 3 && opened) return 'Integrity verified · decrypted in memory'
    return 'End-to-end encryption active'
  }, [step, uploadState, shared, opened])

  function next() {
    setStep((value) => Math.min(value + 1, STEPS.length - 1))
  }

  function runEncryption() {
    setUploadState('encrypting')
    window.setTimeout(() => setUploadState('encrypted'), 900)
  }

  return <div className="product-demo">
    <aside className="demo-sidebar">
      <button className="demo-brand" onClick={() => navigate('/')}><span>V</span> Vaultline</button>
      <p className="demo-sidebar__label">INTERACTIVE DEMO</p>
      <nav aria-label="Demo chapters">
        {STEPS.map((item, index) => <button key={item.label} className={step === index ? 'active' : ''} onClick={() => setStep(index)}><i>{String(index + 1).padStart(2, '0')}</i>{item.label}</button>)}
      </nav>
      <div className="demo-sidebar__note"><span>●</span><p><b>Safe to explore</b>This demo uses sample data and never uploads a real file.</p></div>
      <button className="demo-exit" onClick={() => navigate('/')}>← Exit demo</button>
    </aside>

    <main className="demo-main">
      <header className="demo-topbar">
        <div><span className="demo-live"><i /> LIVE PRODUCT WALKTHROUGH</span><small>{status}</small></div>
        <div className="demo-profile"><span>demo@vaultline.app</span><b>DV</b></div>
      </header>

      <section className="demo-stage">
        <div className="demo-stage__intro"><p>STEP {String(step + 1).padStart(2, '0')} OF 05</p><h1>{current.title}</h1><span>{current.copy}</span></div>

        {step === 0 && <div className="demo-dashboard demo-panel">
          <div className="demo-welcome"><div><p>YOUR VAULT</p><h2>Good morning, Demo.</h2></div><button onClick={() => setStep(1)}>+ Add encrypted file</button></div>
          <div className="demo-stats"><article><span>FILES STORED</span><b>12</b><small>All encrypted</small></article><article><span>SHARED SAFELY</span><b>3</b><small>Wrapped keys only</small></article><article className="sage"><span>SECURITY STATUS</span><b>100%</b><small>No plaintext stored</small></article></div>
          <div className="demo-list-heading"><b>Recent files</b><span>Encrypted metadata unlocked locally</span></div>
          <div className="demo-files">{FILES.map(file => <div className="demo-file" key={file.name}><i className={file.tone}>{file.type}</i><span><b>{file.name}</b><small>{file.meta}</small></span><em>Protected</em><button>•••</button></div>)}</div>
        </div>}

        {step === 1 && <div className="demo-action-grid">
          <div className="demo-panel demo-drop"><div className={`demo-drop__icon ${uploadState}`}>{uploadState === 'encrypted' ? '✓' : '↑'}</div><p>{uploadState === 'ready' ? 'Drop a file to encrypt' : uploadState === 'encrypting' ? 'Encrypting in your browser…' : 'Coursework.pdf is protected'}</p><span>{uploadState === 'ready' ? 'Sample file · 1.8 MB' : uploadState === 'encrypting' ? 'AES-256-GCM · generating a fresh key' : 'Content + filename encrypted · 1.8 MB'}</span><Button onClick={runEncryption} disabled={uploadState === 'encrypting'}>{uploadState === 'encrypted' ? 'Encrypt again' : 'Run encryption demo'}</Button></div>
          <div className="demo-panel demo-explainer"><p>WHAT JUST HAPPENS</p><ol><li><b>01</b><span><strong>Fresh file key</strong><small>A random 256-bit DEK is created.</small></span></li><li><b>02</b><span><strong>Two encrypted payloads</strong><small>File bytes and metadata use separate IVs.</small></span></li><li><b>03</b><span><strong>Key wrapped for you</strong><small>Only your RSA private key can recover it.</small></span></li></ol></div>
        </div>}

        {step === 2 && <div className="demo-action-grid">
          <div className="demo-panel share-visual"><div className="share-person owner"><b>DV</b><span>You<small>Owner</small></span></div><div className={`share-line ${shared ? 'complete' : ''}`}><i>Encrypted key</i></div><div className="share-person"><b>MK</b><span>Maya K.<small>Recipient</small></span></div><div className="share-file-card"><i>PNG</i><span><b>Architecture map.png</b><small>The file remains encrypted</small></span></div></div>
          <div className="demo-panel demo-share-form"><p>GRANT ACCESS</p><h2>Share securely</h2><label>Recipient</label><div className="demo-input">maya@vaultline.demo <span>Public key found ✓</span></div><div className="demo-share-check"><span>⌁</span><p><b>Re-wrapping the file key</b><small>No file content will be copied or decrypted.</small></p></div><Button onClick={() => setShared(true)}>{shared ? 'Access granted ✓' : 'Share encrypted access'}</Button></div>
        </div>}

        {step === 3 && <div className="demo-panel demo-open">
          <div className={`open-orbit ${opened ? 'opened' : ''}`}><span className="orbit-key">⌁</span><div className="open-file"><i>PDF</i><b>{opened ? 'Research proposal.pdf' : '••••••••••••.enc'}</b><small>{opened ? '2.4 MB · integrity verified' : 'Ciphertext · unreadable at rest'}</small></div></div>
          <div><p>LOCAL DECRYPTION</p><h2>{opened ? 'Ready to open.' : 'Still encrypted.'}</h2><span>{opened ? 'The authenticated file passed its integrity check. Plaintext exists only in this browser tab.' : 'Vaultline will unwrap the file key and verify the ciphertext before revealing anything.'}</span><Button onClick={() => setOpened(true)}>{opened ? 'Decrypted securely ✓' : 'Decrypt sample file'}</Button></div>
        </div>}

        {step === 4 && <div className="demo-proof-grid">
          <article className="demo-panel"><span>01</span><i>◎</i><h3>Password separation</h3><p>PBKDF2 and HKDF create unrelated authentication and key-wrapping material.</p></article><article className="demo-panel sage"><span>02</span><i>⌁</i><h3>Envelope encryption</h3><p>Every file receives a unique AES key, wrapped separately for each person.</p></article><article className="demo-panel"><span>03</span><i>◇</i><h3>Tamper detection</h3><p>AES-GCM refuses to open altered content or metadata.</p></article><div className="demo-fingerprint demo-panel"><span>PUBLIC KEY FINGERPRINT</span><code>9af2 8c10 44de 7b03 91ad 02f8 77c1 e6aa</code><small>Compare this fingerprint before sharing sensitive material.</small></div></div>}
      </section>

      <footer className="demo-controls"><div>{STEPS.map((_, index) => <button aria-label={`Go to step ${index + 1}`} className={step === index ? 'active' : ''} onClick={() => setStep(index)} key={index} />)}</div><span>{current.label}</span>{step < STEPS.length - 1 ? <Button onClick={next}>Next: {STEPS[step + 1].label} →</Button> : <Button onClick={() => navigate('/register')}>Create your real vault →</Button>}</footer>
    </main>
  </div>
}
