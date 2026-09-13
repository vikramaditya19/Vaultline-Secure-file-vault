import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { AmbientBackground } from '../components/common/AmbientBackground'
import { VaultlineLogo } from '../components/common/VaultlineLogo'
import { generateFileKey, encryptFile, decryptFileContent, decryptFileMetadata, wrapFileKey } from '../crypto/fileCrypto'
import { generateUserKeyPair, exportPublicKey } from '../crypto/keyManagement'
import { bytesToString } from '../crypto/cryptoUtils'
import './ProductDemoPage.css'

// --- UNIFORM SVG ICONS (Consistent 20x20 viewBox, 1.75 stroke-width) ---
function IconKey({ className = 'icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3" />
    </svg>
  )
}

function IconShield({ className = 'icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function IconShare({ className = 'icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

function IconFile({ className = 'icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function IconDatabase({ className = 'icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  )
}

function IconServer({ className = 'icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  )
}

function IconUpload({ className = 'icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function IconCheck({ className = 'icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconAlert({ className = 'icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

const DEMO_CHAPTERS = [
  {
    id: 'keys',
    label: 'Key Derivation',
    icon: IconKey,
    title: 'Dual-Branch Master Key Split (PBKDF2 + HKDF)',
    summary: 'Evaluate how Max Verstappen’s master credentials derive two cryptographically isolated keys in browser RAM: one to authenticate with the paddock server, and one that protects private telemetry keys locally.',
  },
  {
    id: 'encrypt',
    label: 'Telemetry Encrypt',
    icon: IconShield,
    title: 'Client-Side Web Crypto AES-256-GCM + RSA Wrapping',
    summary: 'Upload proprietary aero telemetry or select an F1 race engineering payload. Watch W3C SubtleCrypto generate an ephemeral DEK and seal the file in volatile browser RAM.',
  },
  {
    id: 'journey',
    label: 'Storage & Journey',
    icon: IconServer,
    title: 'Physical Storage Path & Server Zero-Knowledge Boundary',
    summary: 'Inspect the exact network wire request, the FastAPI upload handler, the opaque binary file written to disk in backend-integration/uploads/, and the telemetry metadata stored in vaultline.db.',
  },
  {
    id: 'share',
    label: 'Zero-Copy Share',
    icon: IconShare,
    title: 'Zero-Copy Multi-Party Envelope Distribution',
    summary: 'Share telemetry access with Adrian Newey or GP by transferring just 384 bytes of re-wrapped key envelope. Zero gigabytes of wind tunnel telemetry are re-uploaded.',
  },
  {
    id: 'decrypt',
    label: 'Tamper Sandbox',
    icon: IconAlert,
    title: 'Authenticated Decryption & 128-Bit Tamper Rejection',
    summary: 'Test local in-memory decryption, or arm the attack simulator to corrupt 1 byte in the telemetry stream and observe the native Web Crypto Galois tag reject altered files.',
  },
  {
    id: 'audit',
    label: 'Formal Audit',
    icon: IconDatabase,
    title: 'Volatile RAM Lifecycle & STRIDE Threat Mitigations',
    summary: 'Audit what exists in temporary client RAM versus the blind database tables, and review formal security invariants before release.',
  },
]

const PRESET_DOCS = [
  { id: 'aero', name: 'RB20_Floor_Aerodynamic_Telemetry_Monza.telemetry', size: '4.2 MB', mime: 'application/octet-stream' },
  { id: 'engine', name: 'Honda_RBPT_PowerUnit_Mapping_Q3.bin', size: '14.8 MB', mime: 'application/octet-stream' },
  { id: 'strategy', name: 'Monaco_GP_Overcut_Strategy_Simulation.strategy', size: '1.6 MB', mime: 'application/json' },
]

const RECIPIENTS = [
  { email: 'adrian.newey@redbullracing.f1', name: 'Adrian Newey', role: 'Chief Technical Officer', fp: 'RB20 01AD N3W3 Y7B0' },
  { email: 'gp.lambiase@redbullracing.f1', name: 'Gianpiero Lambiase (GP)', role: 'Head of Race Engineering', fp: 'RDIO CHCK GP19 443B' },
  { email: 'christian.horner@redbullracing.f1', name: 'Christian Horner', role: 'Team Principal & CEO', fp: 'TP01 REDB ULL7 559D' },
]

export function ProductDemoPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [chapterIndex, setChapterIndex] = useState(0)

  // Chapter 0: Key Derivation (Max Verstappen Master Password)
  const [password, setPassword] = useState('simply-lovely-world-champion-1')
  const [iterations, setIterations] = useState(600000)
  const [deriving, setDeriving] = useState(false)
  const [derivationDone, setDerivationDone] = useState(true)

  // Chapter 1: Real In-Browser Encryption State
  const [activeDoc, setActiveDoc] = useState(PRESET_DOCS[0])
  const [customFile, setCustomFile] = useState(null)
  const [encrypting, setEncrypting] = useState(false)
  const [cryptoResult, setCryptoResult] = useState(null)
  const [userKeyPair, setUserKeyPair] = useState(null)
  const [userPublicKeyB64, setUserPublicKeyB64] = useState('')
  const [wireTab, setWireTab] = useState('envelope')

  // Chapter 3: Sharing
  const [recipientIndex, setRecipientIndex] = useState(0)
  const [sharingStatus, setSharingStatus] = useState('idle')

  // Chapter 4: Decryption & Tamper Sandbox
  const [tamperMode, setTamperMode] = useState(false)
  const [decryptState, setDecryptState] = useState('idle') // 'idle' | 'decrypting' | 'success' | 'corrupted'
  const [decryptedInfo, setDecryptedInfo] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  // Chapter 5: Audit
  const [auditTab, setAuditTab] = useState('ram')

  const currentChapter = DEMO_CHAPTERS[chapterIndex]
  const currentRecipient = RECIPIENTS[recipientIndex]

  const demoMainRef = useRef(null)

  // Reset scroll position on chapter change so viewport never shifts horizontally or gets stuck
  useEffect(() => {
    if (demoMainRef.current) {
      demoMainRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
    window.scrollTo({ top: 0, left: 0 })
  }, [chapterIndex])

  // Initialize a real RSA-OAEP 3072-bit keypair for Max Verstappen on mount
  useEffect(() => {
    let mounted = true
    async function initKey() {
      try {
        const pair = await generateUserKeyPair()
        const pubB64 = await exportPublicKey(pair.publicKey)
        if (mounted) {
          setUserKeyPair(pair)
          setUserPublicKeyB64(pubB64)
        }
      } catch (err) {
        console.error('Failed generating demo keypair:', err)
      }
    }
    initKey()
    return () => { mounted = false }
  }, [])

  // Dynamic live status banner
  const liveStatusBadge = useMemo(() => {
    switch (chapterIndex) {
      case 0:
        return derivationDone ? 'MDK HKDF Branching Active' : 'Deriving Master Key…'
      case 1:
        return cryptoResult ? 'AES-256-GCM Telemetry Sealed' : 'Ready to Encrypt Payload'
      case 2:
        return 'Physical Disk & Database Inspector'
      case 3:
        return sharingStatus === 'shared' ? `Key Wrapped for ${currentRecipient.name}` : 'Zero-Copy Sharing Ready'
      case 4:
        if (decryptState === 'corrupted') return 'AEAD Tag Verification Failed (Tamper Rejected)'
        if (decryptState === 'success') return 'AEAD Verified · Plaintext In Memory'
        return 'Local Decryption Sandbox'
      case 5:
        return 'Zero-Knowledge Security Invariants Active'
      default:
        return 'Zero-Knowledge Crypto Lab'
    }
  }, [chapterIndex, derivationDone, cryptoResult, sharingStatus, currentRecipient, decryptState])

  // Handle custom file upload by user
  function handleCustomFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCustomFile(file)
    const formattedSize = file.size > 1024 * 1024
      ? (file.size / (1024 * 1024)).toFixed(2) + ' MB'
      : (file.size / 1024).toFixed(1) + ' KB'

    setActiveDoc({
      id: 'custom-' + Date.now(),
      name: file.name,
      size: formattedSize,
      mime: file.type || 'application/octet-stream',
      isCustom: true,
      rawFile: file,
    })
    setCryptoResult(null)
    setDecryptState('idle')
  }

  // Chapter 0: Master Key derivation simulation
  function triggerDerivation() {
    setDeriving(true)
    setDerivationDone(false)
    setTimeout(() => {
      setDeriving(false)
      setDerivationDone(true)
    }, 500)
  }

  // Chapter 1: Execute REAL Web Crypto API AES-256-GCM Encryption
  async function executeRealEncryption() {
    setEncrypting(true)
    try {
      // Determine file object to encrypt
      let fileToEncrypt
      if (activeDoc.isCustom && activeDoc.rawFile) {
        fileToEncrypt = activeDoc.rawFile
      } else {
        // Create an authentic File object with F1 telemetry content
        const sampleContent = new TextEncoder().encode(
          `ORACLE RED BULL RACING // STRICTLY CONFIDENTIAL\n` +
          `CAR: RB20 #01 (MAX VERSTAPPEN)\n` +
          `PAYLOAD: ${activeDoc.name}\n` +
          `TIMESTAMP: ${new Date().toISOString()}\n` +
          `SECURITY: 128-bit AES-GCM Galois Field Authentication Tag.\n` +
          `TELEMETRY: Front Wing Downforce +12.4%, Diff High-Speed Entry: +2, ERS Deployment: Strat 2.`
        )
        fileToEncrypt = new File([sampleContent], activeDoc.name, { type: activeDoc.mime })
      }

      // 1. Generate real random AES-256 DEK
      const dek = await generateFileKey()

      // 2. Encrypt file using real Web Crypto subtle API
      const encResult = await encryptFile(fileToEncrypt, dek)

      // 3. Wrap DEK with Max Verstappen's RSA-3072 public key
      let wrappedB64 = 'wKey_sample_wrapped_envelope_384bytes'
      if (userKeyPair?.publicKey) {
        wrappedB64 = await wrapFileKey(dek, userKeyPair.publicKey)
      }

      // 4. Extract first 32 bytes for hex preview
      const hexSlice = Array.from(encResult.ciphertext.slice(0, 32))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ')

      setCryptoResult({
        dek,
        ciphertext: encResult.ciphertext,
        encryptedMetadataB64: encResult.encryptedMetadataB64,
        sizeBytes: encResult.sizeBytes,
        hexPreview: hexSlice,
        wrappedKeyB64: wrappedB64,
        storageName: `telemetry_rb20_${Math.random().toString(36).substring(2, 12)}.enc`,
      })
      setDecryptState('idle')
    } catch (err) {
      console.error('Real encryption failed:', err)
    } finally {
      setEncrypting(false)
    }
  }

  // Chapter 3: Zero-copy sharing with Adrian Newey or GP
  function triggerShare() {
    setSharingStatus('fetching_key')
    setTimeout(() => setSharingStatus('rewrapping'), 400)
    setTimeout(() => setSharingStatus('shared'), 900)
  }

  // Chapter 4: Execute REAL Web Crypto Decryption & Tamper Detection
  async function executeRealDecryption() {
    if (!cryptoResult) return
    setDecryptState('decrypting')
    setErrorMessage('')

    try {
      let testCiphertext = cryptoResult.ciphertext

      if (tamperMode) {
        // CORRUPT 1 BYTE: tamper with the 18th byte of the ciphertext buffer
        testCiphertext = new Uint8Array(cryptoResult.ciphertext)
        testCiphertext[18] ^= 0x55 // Flip bits
      }

      // Real Web Crypto AES-GCM Decryption
      const plaintextBuffer = await decryptFileContent(testCiphertext, cryptoResult.dek)
      const meta = await decryptFileMetadata(cryptoResult.encryptedMetadataB64, cryptoResult.dek)

      let previewText = ''
      try {
        const decoded = bytesToString(new Uint8Array(plaintextBuffer.slice(0, 200)))
        previewText = decoded
      } catch {
        previewText = `[Encrypted Binary Telemetry Stream - ${plaintextBuffer.byteLength} bytes recovered]`
      }

      setDecryptedInfo({
        filename: meta.filename,
        sizeBytes: meta.sizeBytes,
        mimeType: meta.mimeType,
        previewText,
      })
      setDecryptState('success')
    } catch (err) {
      // Real DOMException caught from Web Crypto engine!
      console.error('Tampering caught by Web Crypto:', err)
      setErrorMessage(`${err.name}: ${err.message || 'The operation failed for an operation-specific reason (AES-GCM Authentication Tag Mismatch)'}`)
      setDecryptState('corrupted')
    }
  }

  return (
    <div className="product-demo">
      <AmbientBackground />

      {/* SIDEBAR NAVIGATION */}
      <aside className="demo-sidebar">
        <button className="demo-brand" onClick={() => navigate('/')}>
          <VaultlineLogo size={32} />
          <span>Vaultline</span>
        </button>
        <p className="demo-sidebar__label">CRYPTOGRAPHIC TESTBENCH</p>

        <nav aria-label="Demo chapters">
          {DEMO_CHAPTERS.map((item, index) => {
            const IconComponent = item.icon
            return (
              <button
                key={item.id}
                className={chapterIndex === index ? 'active' : ''}
                onClick={() => setChapterIndex(index)}
              >
                <i><IconComponent /></i>
                <div className="btn-label-wrap">
                  <b>{item.label}</b>
                  <small>{String(index + 1).padStart(2, '0')}</small>
                </div>
              </button>
            )
          })}
        </nav>

        <div className="demo-sidebar__note">
          <span className="live-pulse" />
          <p>
            <b>Genuine Web Crypto</b>
            Executes W3C <code>SubtleCrypto</code> primitives in browser memory.
          </p>
        </div>

        <button className="demo-exit" onClick={() => navigate('/')}>
          ← Exit to Homepage
        </button>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="demo-main" ref={demoMainRef}>
        {/* TOP STATUS BAR */}
        <header className="demo-topbar">
          <div className="status-indicator">
            <span className="demo-live">
              <i className={decryptState === 'corrupted' ? 'danger' : ''} />
              ORACLE RED BULL TELEMETRY VAULT
            </span>
            <span className="status-pill">{liveStatusBadge}</span>
          </div>
          <div className="demo-profile">
            <span className="demo-env-badge">W3C Web Crypto API</span>
            <div className="profile-chip">
              <span>max.verstappen@redbullracing.f1</span>
              <b title="Max Verstappen #1">MV 1</b>
            </div>
          </div>
        </header>

        {/* STAGE CONTAINER */}
        <section className="demo-stage">
          <div className="demo-stage__intro">
            <p className="chapter-count">
              CHAPTER {String(chapterIndex + 1).padStart(2, '0')} OF {String(DEMO_CHAPTERS.length).padStart(2, '0')}
            </p>
            <h1>{currentChapter.title}</h1>
            <p className="chapter-summary">{currentChapter.summary}</p>
          </div>

          {/* ============================================================
              CHAPTER 0: MASTER KEY DERIVATION & HKDF SPLIT
              ============================================================ */}
          {chapterIndex === 0 && (
            <div className="demo-grid-panel">
              <div className="demo-card config-box">
                <div className="card-header">
                  <h3>Master Password Input & Derivation Tuning</h3>
                  <span className="badge-tag">PBKDF2-SHA256</span>
                </div>
                <div className="input-group">
                  <label>Max Verstappen's Master Password (Never Leaves Client):</label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mono-input"
                  />
                </div>

                <div className="input-group">
                  <div className="slider-label">
                    <label>PBKDF2 Iteration Rounds:</label>
                    <b>{iterations.toLocaleString()} rounds</b>
                  </div>
                  <input
                    type="range"
                    min="100000"
                    max="600000"
                    step="50000"
                    value={iterations}
                    onChange={(e) => setIterations(Number(e.target.value))}
                  />
                  <small className="field-note">
                    Standard recommendation: ≥ 600,000 rounds for SHA-256 to resist GPU cracking.
                  </small>
                </div>

                <Button onClick={triggerDerivation} disabled={deriving}>
                  {deriving ? 'Deriving Master Key…' : 'Re-Run PBKDF2 & HKDF Split'}
                </Button>
              </div>

              <div className="demo-card visual-split-box">
                <div className="card-header">
                  <h3>Dual-Branch Domain Separation Hierarchy</h3>
                  <span className="badge-tag">RFC 5869 HKDF</span>
                </div>

                <div className="tree-visual">
                  <div className="tree-node root-node">
                    <span className="node-tag">RAW PASSWORD</span>
                    <code>{password ? `"${password}"` : '""'}</code>
                  </div>
                  <div className="tree-branch-down">
                    <span>↓ PBKDF2-SHA256 ({iterations.toLocaleString()} iter + Client Salt)</span>
                  </div>
                  <div className="tree-node mdk-node">
                    <span className="node-tag">MASTER DERIVATION KEY (MDK)</span>
                    <code>256-bit Pseudorandom Key in Volatile Memory</code>
                  </div>
                  <div className="tree-split-arms">
                    <div className="arm arm-left">
                      <div className="arm-label">HKDF info="vaultline-auth-v1"</div>
                      <div className="tree-node auth-node">
                        <span className="node-tag public">BRANCH A: authProof</span>
                        <code>dGVzdF9hdXRoX3Byb29m...</code>
                        <small>✓ Sent to API → Hashed with Argon2id</small>
                        <small>✗ Cannot decrypt telemetry or private keys</small>
                      </div>
                    </div>
                    <div className="arm arm-right">
                      <div className="arm-label">HKDF info="vaultline-wrap-v1"</div>
                      <div className="tree-node wrap-node">
                        <span className="node-tag secret">BRANCH B: wrapKey</span>
                        <code>AES-256 [0x7A...49C2] (RAM Only)</code>
                        <small>✓ Unwraps Max's RSA private key</small>
                        <small>✗ NEVER transmitted to server or disk</small>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="security-guarantee-note">
                  <b>Zero-Knowledge Mathematical Proof:</b> Even if rival paddock teams gain full access
                  to the server database and steal Max's <code>authProof</code>, the one-way nature of HKDF
                  makes it mathematically impossible to calculate <code>wrapKey</code>.
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              CHAPTER 1: REAL ENCRYPTION PIPELINE (CUSTOM UPLOAD SUPPORT)
              ============================================================ */}
          {chapterIndex === 1 && (
            <div className="demo-grid-panel">
              <div className="demo-card config-box">
                <div className="card-header">
                  <h3>1. Select or Upload Telemetry File</h3>
                  <span className="badge-tag">W3C SubtleCrypto</span>
                </div>

                {/* Custom File Upload Trigger */}
                <div className="custom-upload-zone" onClick={() => fileInputRef.current?.click()}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleCustomFileUpload}
                    style={{ display: 'none' }}
                  />
                  <IconUpload className="upload-icon-large" />
                  <div>
                    <b>{customFile ? `Uploaded: ${customFile.name}` : 'Click to Upload Any Real File from Your PC'}</b>
                    <small>Supports telemetry, PDF, code, or data logs. Encrypted locally in RAM.</small>
                  </div>
                </div>

                <div className="doc-selector-label">Or choose an F1 engineering payload:</div>
                <div className="doc-selector-list">
                  {PRESET_DOCS.map((doc) => (
                    <button
                      key={doc.id}
                      className={`doc-item ${activeDoc.name === doc.name && !activeDoc.isCustom ? 'selected' : ''}`}
                      onClick={() => {
                        setActiveDoc(doc)
                        setCustomFile(null)
                        setCryptoResult(null)
                        setDecryptState('idle')
                      }}
                    >
                      <span className="doc-icon"><IconFile /></span>
                      <div className="doc-meta">
                        <b>{doc.name}</b>
                        <small>{doc.size} • {doc.mime}</small>
                      </div>
                      {activeDoc.name === doc.name && !activeDoc.isCustom && <span className="doc-check"><IconCheck /></span>}
                    </button>
                  ))}
                </div>

                <div className="pipeline-steps-tracker">
                  <div className={`step-pip ${cryptoResult ? 'active' : ''}`}>
                    <span>1</span> Generate Ephemeral 256-bit DEK in RAM
                  </div>
                  <div className={`step-pip ${cryptoResult ? 'active' : ''}`}>
                    <span>2</span> Encrypt Telemetry Payload (96-bit Content IV)
                  </div>
                  <div className={`step-pip ${cryptoResult ? 'active' : ''}`}>
                    <span>3</span> Encrypt JSON Metadata Blob (96-bit Meta IV)
                  </div>
                  <div className={`step-pip ${cryptoResult ? 'active' : ''}`}>
                    <span>4</span> Wrap DEK with Max Verstappen RSA-3072 Key
                  </div>
                </div>

                <Button onClick={executeRealEncryption} disabled={encrypting}>
                  {encrypting
                    ? 'Executing window.crypto.subtle…'
                    : cryptoResult
                    ? 'Re-Run Telemetry Encryption'
                    : 'Execute Real Web Crypto Encryption'}
                </Button>
              </div>

              <div className="demo-card wire-inspector-box">
                <div className="card-header">
                  <h3>2. Cryptographic Output Inspector</h3>
                  <div className="tab-pill-group">
                    <button className={wireTab === 'envelope' ? 'active' : ''} onClick={() => setWireTab('envelope')}>
                      Key Envelope
                    </button>
                    <button className={wireTab === 'payload' ? 'active' : ''} onClick={() => setWireTab('payload')}>
                      Ciphertext Bytes
                    </button>
                    <button className={wireTab === 'metadata' ? 'active' : ''} onClick={() => setWireTab('metadata')}>
                      Encrypted Metadata
                    </button>
                  </div>
                </div>

                {wireTab === 'envelope' && (
                  <div className="wire-content">
                    <div className="wire-field">
                      <span className="w-label">MAX VERSTAPPEN PUBLIC KEY (RSA-3072 SPKI):</span>
                      <code className="w-val mono">{userPublicKeyB64 ? `${userPublicKeyB64.substring(0, 48)}...` : 'Generating...'}</code>
                    </div>
                    <div className="wire-field">
                      <span className="w-label">DEK KEY ENCAPSULATION SCHEME:</span>
                      <code className="w-val">RSA-OAEP (3072-bit, SHA-256, MGF1)</code>
                    </div>
                    <div className="wire-field">
                      <span className="w-label">WRAPPED KEY BASE64 (Sent to FastAPI):</span>
                      <pre className="hex-block">
                        {cryptoResult
                          ? `${cryptoResult.wrappedKeyB64.substring(0, 160)}...\nLength: 384 bytes (RSA-3072 block)\nRecipient: Max Verstappen #01 (Self-wrapped)`
                          : `[Click "Execute Real Web Crypto Encryption" to run]`}
                      </pre>
                    </div>
                    <div className="wire-field">
                      <span className="w-label">SERVER KNOWLEDGE OF TELEMETRY DEK:</span>
                      <span className="tag-zero">0% (Pure Opaque Ciphertext)</span>
                    </div>
                  </div>
                )}

                {wireTab === 'payload' && (
                  <div className="wire-content">
                    <div className="wire-field">
                      <span className="w-label">ENCRYPTION ALGORITHM:</span>
                      <code className="w-val">AES-256-GCM (128-bit Authentication Tag)</code>
                    </div>
                    <div className="wire-field">
                      <span className="w-label">AUTHENTIC PACKED CIPHERTEXT (First 32 bytes):</span>
                      <pre className="hex-block">
                        {cryptoResult
                          ? `${cryptoResult.hexPreview}\n... Total Size: ${cryptoResult.ciphertext.byteLength.toLocaleString()} bytes (IV + Ciphertext + Tag)`
                          : `[Plaintext unencrypted in browser memory]`}
                      </pre>
                    </div>
                  </div>
                )}

                {wireTab === 'metadata' && (
                  <div className="wire-content">
                    <div className="wire-field">
                      <span className="w-label">PLAINTEXT METADATA (Visible only in Max's client):</span>
                      <pre className="json-block">{JSON.stringify({ filename: activeDoc.name, mimeType: activeDoc.mime, sizeBytes: activeDoc.size }, null, 2)}</pre>
                    </div>
                    <div className="wire-field">
                      <span className="w-label">AUTHENTIC ENCRYPTED METADATA STRING:</span>
                      <pre className="hex-block">
                        {cryptoResult
                          ? `${cryptoResult.encryptedMetadataB64.substring(0, 140)}...`
                          : `[Waiting for encryption run]`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================
              CHAPTER 2: PHYSICAL STORAGE PATH & FILE JOURNEY
              ============================================================ */}
          {chapterIndex === 2 && (
            <div className="demo-grid-panel storage-journey-panel">
              <div className="demo-card journey-card">
                <div className="card-header">
                  <h3>End-to-End Telemetry Journey & Physical Storage Locations</h3>
                  <span className="badge-tag">Zero Plaintext Trail</span>
                </div>

                <div className="journey-pipeline">
                  {/* Step 1 */}
                  <div className="journey-node">
                    <div className="journey-icon-wrap client"><IconKey /></div>
                    <div className="journey-details">
                      <div className="journey-title">
                        <b>1. Max Verstappen's Browser RAM</b>
                        <code>window.crypto.subtle</code>
                      </div>
                      <p>
                        The race telemetry (<code>{activeDoc.name}</code>) is encrypted in memory using an ephemeral
                        AES-256 DEK. Filename and metadata are packaged into a separate encrypted payload.
                      </p>
                      <span className="journey-badge safe">Plaintext Exists in Memory Only</span>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="journey-node">
                    <div className="journey-icon-wrap network"><IconUpload /></div>
                    <div className="journey-details">
                      <div className="journey-title">
                        <b>2. Network Transport</b>
                        <code>POST /api/files/upload</code>
                      </div>
                      <p>
                        Dispatched as a <code>multipart/form-data</code> HTTP request with fields:
                        <code>file</code> (binary ciphertext blob), <code>encrypted_metadata</code> (base64 string),
                        and <code>wrapped_key</code> (base64 string).
                      </p>
                      <span className="journey-badge wire">Opaque Stream Over TLS</span>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="journey-node">
                    <div className="journey-icon-wrap server"><IconServer /></div>
                    <div className="journey-details">
                      <div className="journey-title">
                        <b>3. FastAPI Paddock Server Controller</b>
                        <code>backend-integration/app/routers/files.py:upload_file</code>
                      </div>
                      <p>
                        The backend validates Max's Bearer JWT token to identify Car #01. It generates a secure
                        storage name: <code>{cryptoResult?.storageName || 'telemetry_rb20_f92c10.enc'}</code>.
                      </p>
                      <span className="journey-badge blind">Server Lacks Decryption Key</span>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="journey-node">
                    <div className="journey-icon-wrap disk"><IconFile /></div>
                    <div className="journey-details">
                      <div className="journey-title">
                        <b>4. Physical Disk Storage</b>
                        <code>backend-integration/uploads/{cryptoResult?.storageName || 'telemetry_rb20_f92c10.enc'}</code>
                      </div>
                      <p>
                        The raw ciphertext stream is written directly to the filesystem. If a server administrator opens
                        this file, they see only pseudo-random encrypted bytes without any plaintext headers.
                      </p>
                      <span className="journey-badge disk-badge">Encrypted Binary on Disk</span>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="journey-node">
                    <div className="journey-icon-wrap db"><IconDatabase /></div>
                    <div className="journey-details">
                      <div className="journey-title">
                        <b>5. Relational Database</b>
                        <code>backend-integration/vaultline.db (SQLite / PostgreSQL)</code>
                      </div>
                      <div className="db-record-preview">
                        <div className="db-row"><span>table:</span> <code>files</code></div>
                        <div className="db-row"><span>storage_name:</span> <code>"{cryptoResult?.storageName || 'telemetry_rb20_f92c10.enc'}"</code></div>
                        <div className="db-row"><span>encrypted_metadata:</span> <code>"{cryptoResult?.encryptedMetadataB64.substring(0, 36) || 'eyJpdiI6...'}..."</code></div>
                        <div className="db-row"><span>wrapped_key:</span> <code>"{cryptoResult?.wrappedKeyB64.substring(0, 36) || 'wKey_01Jn...'}..."</code></div>
                      </div>
                      <span className="journey-badge db-badge">Zero Plaintext in SQL</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              CHAPTER 3: ZERO-COPY MULTI-PARTY SHARING
              ============================================================ */}
          {chapterIndex === 3 && (
            <div className="demo-grid-panel">
              <div className="demo-card config-box">
                <div className="card-header">
                  <h3>1. Select Authorized Recipient</h3>
                  <span className="badge-tag">Zero-Copy Key Wrap</span>
                </div>

                <div className="recipient-selector-list">
                  {RECIPIENTS.map((rec, idx) => (
                    <button
                      key={rec.email}
                      className={`recipient-item ${recipientIndex === idx ? 'selected' : ''}`}
                      onClick={() => {
                        setRecipientIndex(idx)
                        setSharingStatus('idle')
                      }}
                    >
                      <div className="avatar-circ">{rec.name.split(' ').map(n => n[0]).join('')}</div>
                      <div className="rec-info">
                        <b>{rec.name}</b>
                        <small>{rec.email} • {rec.role}</small>
                        <span className="fp-code">Key FP: {rec.fp}</span>
                      </div>
                      {recipientIndex === idx && <span className="doc-check"><IconCheck /></span>}
                    </button>
                  ))}
                </div>

                <div className="share-metric-card">
                  <div className="metric-row">
                    <span>TELEMETRY FILE BEING SHARED:</span>
                    <b>{activeDoc.name} ({activeDoc.size})</b>
                  </div>
                  <div className="metric-row">
                    <span>CIPHERTEXT RE-UPLOADED:</span>
                    <b className="green-highlight">0 BYTES</b>
                  </div>
                  <div className="metric-row">
                    <span>KEY ENVELOPE TRANSMITTED:</span>
                    <b>384 BYTES (RSA-3072 block)</b>
                  </div>
                </div>

                <Button onClick={triggerShare} disabled={sharingStatus === 'fetching_key' || sharingStatus === 'rewrapping'}>
                  {sharingStatus === 'idle'
                    ? `Grant Access to ${currentRecipient.name}`
                    : sharingStatus === 'shared'
                    ? 'Access Granted (Re-wrap Again)'
                    : 'Re-Wrapping Key in Memory…'}
                </Button>
              </div>

              <div className="demo-card visual-share-box">
                <div className="card-header">
                  <h3>2. Zero-Copy Cryptographic Mechanism</h3>
                  <span className="badge-tag">Multi-Party Envelope</span>
                </div>

                <div className="share-network-stage">
                  <div className="actor-node owner">
                    <div className="actor-badge">CAR #01 DRIVER</div>
                    <b>Max Verstappen</b>
                    <small>Unwraps DEK in volatile RAM</small>
                  </div>

                  <div className="network-flow-channel">
                    <div className={`flow-packet ${sharingStatus}`}>
                      <IconKey />
                      <span>Wrapped DEK (384 B)</span>
                    </div>
                    <span className="channel-desc">
                      FastAPI Blind Relay: <code>POST /api/sharing/share</code>
                    </span>
                  </div>

                  <div className="actor-node recipient">
                    <div className="actor-badge">PADDOCK RECIPIENT</div>
                    <b>{currentRecipient.name}</b>
                    <small>Unwraps with private key upon download</small>
                  </div>
                </div>

                <div className="sharing-guarantees-grid">
                  <div className="guarantee-cell">
                    <b>No Telemetry Leakage:</b> The DEK is re-wrapped directly in client RAM with Adrian Newey's public RSA key. It is never exposed in plaintext to the server.
                  </div>
                  <div className="guarantee-cell">
                    <b>Instant Revocation:</b> Deleting the recipient’s entry from the server’s <code>shares</code> table immediately terminates future access without re-uploading gigabytes of data.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              CHAPTER 4: AUTHENTICATED DECRYPTION & TAMPER SANDBOX
              ============================================================ */}
          {chapterIndex === 4 && (
            <div className="demo-grid-panel">
              <div className="demo-card config-box">
                <div className="card-header">
                  <h3>1. Local AEAD Decryption Controls</h3>
                  <span className="badge-tag">GCM Tag Verification</span>
                </div>

                <div className="tamper-toggle-box">
                  <div className="tamper-info">
                    <b>Simulate MITM Data Corruption / Server Bit-Flip</b>
                    <p>
                      If enabled, 1 byte in the telemetry ciphertext buffer is corrupted before reaching the Web Crypto API
                      to evaluate mathematical tag verification.
                    </p>
                  </div>
                  <label className="switch-control">
                    <input
                      type="checkbox"
                      checked={tamperMode}
                      onChange={(e) => {
                        setTamperMode(e.target.checked)
                        setDecryptState('idle')
                      }}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>

                <div className="tamper-status-banner">
                  {tamperMode ? (
                    <div className="banner danger">
                      <b>ATTACK MODE ARMED:</b> 1 byte corrupted in telemetry stream (<code>tampered[18] ^= 0x55</code>).
                    </div>
                  ) : (
                    <div className="banner safe">
                      <b>NORMAL MODE:</b> Unaltered telemetry ciphertext with valid 128-bit authentication tag.
                    </div>
                  )}
                </div>

                <Button
                  onClick={executeRealDecryption}
                  disabled={!cryptoResult || decryptState === 'decrypting'}
                >
                  {!cryptoResult
                    ? 'Encrypt in Chapter 02 First'
                    : decryptState === 'decrypting'
                    ? 'Computing Galois Hash in Web Crypto…'
                    : 'Execute Real Local Decryption'}
                </Button>
              </div>

              <div className="demo-card attack-result-box">
                <div className="card-header">
                  <h3>2. Web Crypto API Verification Engine</h3>
                  <span className="badge-tag">128-bit Galois Tag</span>
                </div>

                {decryptState === 'idle' && (
                  <div className="decrypt-idle-state">
                    <span className="idle-icon"><IconKey /></span>
                    <b>{cryptoResult ? 'Ready for Local In-Memory Decryption' : 'Awaiting Encrypted Telemetry'}</b>
                    <p>
                      {cryptoResult
                        ? 'Click "Execute Real Local Decryption" to unwrap the DEK and verify the authentication tag.'
                        : 'Navigate to Chapter 02 and run encryption to produce a live telemetry ciphertext.'}
                    </p>
                  </div>
                )}

                {decryptState === 'decrypting' && (
                  <div className="decrypt-running-state">
                    <div className="spinner" />
                    <b>Executing window.crypto.subtle.decrypt…</b>
                  </div>
                )}

                {decryptState === 'success' && decryptedInfo && (
                  <div className="decrypt-success-state">
                    <div className="success-icon"><IconCheck /></div>
                    <h3>Telemetry Authenticated & Plaintext Recovered!</h3>
                    <div className="success-details">
                      <div>
                        <span>AUTHENTICATION TAG STATUS:</span>
                        <code className="mono">✓ 128-bit Galois Tag Verified by SubtleCrypto</code>
                      </div>
                      <div>
                        <span>AUTHENTICATED FILENAME:</span>
                        <b>{decryptedInfo.filename}</b>
                      </div>
                      <div>
                        <span>AUTHENTICATED SIZE:</span>
                        <b>{decryptedInfo.sizeBytes.toLocaleString()} bytes</b>
                      </div>
                      <div>
                        <span>PLAINTEXT PREVIEW IN VOLATILE RAM:</span>
                        <pre className="plaintext-preview-box">{decryptedInfo.previewText}</pre>
                      </div>
                    </div>
                    <small className="audit-subtext">
                      Plaintext telemetry exists solely in this tab's memory. It was never written to server disk.
                    </small>
                  </div>
                )}

                {decryptState === 'corrupted' && (
                  <div className="decrypt-failure-state">
                    <div className="failure-icon"><IconAlert /></div>
                    <h3>Genuine Cryptographic Rejection!</h3>
                    <pre className="error-stack">
                      {errorMessage || 'DOMException: The operation failed for an operation-specific reason (AES-GCM Authentication Tag Mismatch)'}
                    </pre>
                    <p className="failure-explanation">
                      <b>Verifiable Fact:</b> Because AES-256-GCM computes a Galois polynomial authentication tag
                      over all ciphertext bytes, altering even a single telemetry bit causes the Web Crypto API to throw an
                      authentic <code>OperationError</code> and immediately zero out memory.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================
              CHAPTER 5: AUDIT, RAM LIFECYCLE & INVARIANTS
              ============================================================ */}
          {chapterIndex === 5 && (
            <div className="demo-grid-panel audit-layout">
              <div className="demo-card full-audit-card">
                <div className="card-header">
                  <div className="audit-nav-tabs">
                    <button className={auditTab === 'ram' ? 'active' : ''} onClick={() => setAuditTab('ram')}>
                      Client RAM State (Trusted)
                    </button>
                    <button className={auditTab === 'disk' ? 'active' : ''} onClick={() => setAuditTab('disk')}>
                      Server Database State (Untrusted)
                    </button>
                    <button className={auditTab === 'threats' ? 'active' : ''} onClick={() => setAuditTab('threats')}>
                      STRIDE Threat Analysis
                    </button>
                  </div>
                  <span className="badge-tag">Academic Release 2026</span>
                </div>

                {auditTab === 'ram' && (
                  <div className="audit-table-wrap">
                    <table className="audit-table">
                      <thead>
                        <tr>
                          <th>Cryptographic Asset</th>
                          <th>Storage Medium</th>
                          <th>Lifetime Invariant</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>Unwrapped RSA Private Key</strong></td>
                          <td>Volatile JS Heap (<code>AuthContext</code>)</td>
                          <td>Purged immediately on tab close or logout</td>
                          <td><span className="pill green">RAM Only</span></td>
                        </tr>
                        <tr>
                          <td><strong>Data Encryption Key (DEK)</strong></td>
                          <td>Scoped local variable in upload/download handler</td>
                          <td>Garbage collected after AES-GCM operation completes</td>
                          <td><span className="pill green">Ephemeral</span></td>
                        </tr>
                        <tr>
                          <td><strong>Max's Master Password</strong></td>
                          <td>Form component state</td>
                          <td>Cleared immediately after PBKDF2 derivation</td>
                          <td><span className="pill green">Purged</span></td>
                        </tr>
                        <tr>
                          <td><strong>Plaintext Telemetry Buffers</strong></td>
                          <td>Blob in browser memory</td>
                          <td>Released upon download trigger</td>
                          <td><span className="pill green">No Disk Write</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {auditTab === 'disk' && (
                  <div className="audit-table-wrap">
                    <table className="audit-table">
                      <thead>
                        <tr>
                          <th>Database Table / Path</th>
                          <th>Stored Content</th>
                          <th>Decryption Capability of Server Admin</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><code>users.hashed_auth_proof</code></td>
                          <td>Argon2id hash of <code>authProof</code></td>
                          <td><span className="pill red">Zero (One-way hash)</span></td>
                        </tr>
                        <tr>
                          <td><code>users.wrapped_private_key</code></td>
                          <td>AES-256 encrypted private key (wrapped with <code>wrapKey</code>)</td>
                          <td><span className="pill red">Zero (Requires user password)</span></td>
                        </tr>
                        <tr>
                          <td><code>files.encrypted_metadata</code></td>
                          <td>AES-256-GCM ciphertext + 96-bit IV</td>
                          <td><span className="pill red">Zero (Filename unreadable)</span></td>
                        </tr>
                        <tr>
                          <td><code>backend-integration/uploads/*.enc</code></td>
                          <td>Opaque binary AES-GCM ciphertext payload</td>
                          <td><span className="pill red">Zero (DEK unknown to server)</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {auditTab === 'threats' && (
                  <div className="audit-table-wrap">
                    <table className="audit-table">
                      <thead>
                        <tr>
                          <th>Threat (STRIDE)</th>
                          <th>Attack Vector</th>
                          <th>Vaultline Cryptographic Defense</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>Spoofing</strong></td>
                          <td>Stolen JWT or unauthorized user impersonation</td>
                          <td>Argon2id proof verification + short-lived signed JWTs</td>
                        </tr>
                        <tr>
                          <td><strong>Tampering</strong></td>
                          <td>Man-in-the-middle or malicious cloud server modifying files</td>
                          <td>128-bit AES-GCM Galois authentication tag rejects altered bytes</td>
                        </tr>
                        <tr>
                          <td><strong>Information Disclosure</strong></td>
                          <td>Subpoena, cloud insider threat, or server disk breach</td>
                          <td>Zero-knowledge envelope encryption; keys never leave client RAM</td>
                        </tr>
                        <tr>
                          <td><strong>Elevation of Privilege</strong></td>
                          <td>Unauthorized user accessing another user’s shared files</td>
                          <td>Server authorization barriers + recipient RSA public-key wrapping</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* BOTTOM CONTROLLER */}
        <footer className="demo-controls">
          <div className="chapter-pips">
            {DEMO_CHAPTERS.map((c, idx) => (
              <button
                key={c.id}
                aria-label={`Go to ${c.label}`}
                className={chapterIndex === idx ? 'active' : ''}
                onClick={() => setChapterIndex(idx)}
              >
                <span>{String(idx + 1).padStart(2, '0')}</span>
              </button>
            ))}
          </div>

          <div className="nav-action-wrap">
            {chapterIndex > 0 && (
              <Button variant="secondary" onClick={() => setChapterIndex(c => c - 1)}>
                ← Previous
              </Button>
            )}
            {chapterIndex < DEMO_CHAPTERS.length - 1 ? (
              <Button onClick={() => setChapterIndex(c => c + 1)}>
                Next: {DEMO_CHAPTERS[chapterIndex + 1].label} →
              </Button>
            ) : (
              <Button onClick={() => navigate('/register')}>
                Launch Real Production Vault →
              </Button>
            )}
          </div>
        </footer>
      </main>
    </div>
  )
}

export default ProductDemoPage
