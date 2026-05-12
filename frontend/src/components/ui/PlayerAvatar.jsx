/**
 * PlayerAvatar — displays a player's avatar with status indicators
 */
const AVATARS = ['🐺', '🦊', '🐱', '🐻', '🐸', '🐙', '🦉', '🐲', '🦋', '🎭', '👻', '🤖', '🛸', '🌙', '⭐'];

export default function PlayerAvatar({ avatarIndex = 0, isAlive = true, isConnected = true, size = 'md', showDead = true }) {
  const sizeClass = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-4xl'
  }[size];

  const emoji = AVATARS[avatarIndex % AVATARS.length];

  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center relative
      ${!isAlive && showDead ? 'opacity-40 grayscale' : ''}
      ${!isConnected ? 'opacity-30' : ''}
      bg-surface border border-border`}
    >
      {emoji}
      {!isAlive && showDead && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
          <span className="text-sm">💀</span>
        </div>
      )}
      {!isConnected && (
        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-neon-amber border border-deep" />
      )}
      {isConnected && isAlive && (
        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-neon-green border border-deep" />
      )}
    </div>
  );
}

export { AVATARS };
