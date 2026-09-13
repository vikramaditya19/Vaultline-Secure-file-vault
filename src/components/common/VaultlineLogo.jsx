export function VaultlineLogo({ size = 32, className = '' }) {
  return (
    <svg
      className={`vaultline-logo ${className}`}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Vaultline Logo"
    >
      <defs>
        <linearGradient id="vl-grad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d47d67" />
          <stop offset="1" stopColor="#a84332" />
        </linearGradient>
        <linearGradient id="vl-inner" x1="12" y1="10" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#f4ece1" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Hexagonal Shield Vault Perimeter */}
      <path
        d="M20 3L35 9V20C35 29.5 28.5 35.8 20 38C11.5 35.8 5 29.5 5 20V9L20 3Z"
        fill="url(#vl-grad)"
      />

      {/* Subtle Inner Bevel / Rim */}
      <path
        d="M20 5.2L33 10.4V20C33 28 27.5 33.7 20 35.8C12.5 33.7 7 28 7 20V10.4L20 5.2Z"
        stroke="rgba(255, 255, 255, 0.25)"
        strokeWidth="1.2"
        fill="none"
      />

      {/* Stylized Interlocking Monogram 'V' */}
      <path
        d="M13 13.5L20 28L27 13.5H23.2L20 20.8L16.8 13.5H13Z"
        fill="url(#vl-inner)"
      />

      {/* Cryptographic Keyhole Centerpiece */}
      <circle cx="20" cy="15" r="2" fill="#292520" />
      <path d="M19.2 15H20.8L21.2 18.2H18.8L19.2 15Z" fill="#292520" />

      {/* Apex Security Accent Dot */}
      <circle cx="20" cy="32" r="1.5" fill="rgba(255, 255, 255, 0.9)" />
    </svg>
  )
}

export default VaultlineLogo
