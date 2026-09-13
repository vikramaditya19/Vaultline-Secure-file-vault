import './AmbientBackground.css'

export function AmbientBackground() {
  return (
    <div className="ambient-backdrop" aria-hidden="true">
      <div className="ambient-orb ambient-orb--terracotta" />
      <div className="ambient-orb ambient-orb--sage" />
      <div className="ambient-orb ambient-orb--amber" />
      <div className="ambient-grid-mesh" />
      <div className="ambient-particles">
        <span className="particle p1">⚿</span>
        <span className="particle p2">AES-256</span>
        <span className="particle p3">⊕</span>
        <span className="particle p4">HKDF</span>
        <span className="particle p5">RSA-3072</span>
        <span className="particle p6">⌘</span>
        <span className="particle p7">GCM</span>
        <span className="particle p8">✧</span>
      </div>
    </div>
  )
}

export default AmbientBackground
