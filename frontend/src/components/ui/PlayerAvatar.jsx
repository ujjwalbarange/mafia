/**
 * PlayerAvatar — displays a player's avatar in Among Us style
 */

const AMONG_US_COLORS = [
  { id: 'red', hex: '#C51111' },
  { id: 'blue', hex: '#132ED1' },
  { id: 'green', hex: '#117F2D' },
  { id: 'pink', hex: '#ED54BA' },
  { id: 'orange', hex: '#EF7D0D' },
  { id: 'yellow', hex: '#F5F557' },
  { id: 'black', hex: '#3F474E' },
  { id: 'white', hex: '#D6E0F0' },
  { id: 'purple', hex: '#6B2FBB' },
  { id: 'brown', hex: '#71491E' },
  { id: 'cyan', hex: '#38FEDC' },
  { id: 'lime', hex: '#50EF39' }
];

export default function PlayerAvatar({ avatarIndex = 0, isAlive = true, isConnected = true, size = 'md', showDead = true, className = '' }) {
  const sizeClass = {
    xs: 'w-6 h-6',
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20'
  }[size];

  const colorInfo = AMONG_US_COLORS[avatarIndex % AMONG_US_COLORS.length];
  const colorHex = colorInfo ? colorInfo.hex : '#C51111';

  return (
    <div className={`${sizeClass} relative flex justify-center items-end ${className}
      ${!isAlive && showDead ? 'opacity-50 grayscale' : ''}
      ${!isConnected ? 'opacity-40' : ''}`}
    >
      <svg viewBox="0 0 100 120" className="w-full h-full overflow-visible drop-shadow-md">
        {/* Backpack */}
        <rect x="5" y="45" width="25" height="40" rx="8" fill={colorHex} stroke="#000" strokeWidth="6" strokeLinejoin="round" />
        
        {/* Body */}
        {(!isAlive && showDead) ? (
          // Dead body (bone showing)
          <g>
            <path d="M 25 110 L 25 80 C 25 70, 75 70, 75 80 L 75 110 C 75 118, 60 118, 60 110 L 60 95 L 40 95 L 40 110 C 40 118, 25 118, 25 110 Z" fill={colorHex} stroke="#000" strokeWidth="6" strokeLinejoin="round" />
            <path d="M 45 75 L 45 60 C 40 60, 40 50, 50 50 C 60 50, 60 60, 55 60 L 55 75" fill="#e2e8f0" stroke="#000" strokeWidth="5" strokeLinejoin="round" />
          </g>
        ) : (
          // Alive body
          <g>
            <path d="M 25 50 C 25 15, 75 15, 75 50 L 75 110 C 75 118, 60 118, 60 110 L 60 95 L 40 95 L 40 110 C 40 118, 25 118, 25 110 Z" fill={colorHex} stroke="#000" strokeWidth="6" strokeLinejoin="round" />
            {/* Visor */}
            <path d="M 35 45 C 35 30, 85 30, 90 45 C 92 55, 85 65, 70 65 C 50 65, 35 60, 35 45 Z" fill="#90cddb" stroke="#000" strokeWidth="5" />
            {/* Visor reflection */}
            <path d="M 45 40 C 45 35, 75 35, 80 40 C 82 45, 75 50, 65 50 C 55 50, 45 45, 45 40 Z" fill="#ffffff" opacity="0.6" />
          </g>
        )}
      </svg>
      
      {!isConnected && (
        <div className="absolute top-0 right-0 w-3 h-3 rounded-full bg-neon-amber border border-deep animate-ping" />
      )}
    </div>
  );
}

export { AMONG_US_COLORS };
