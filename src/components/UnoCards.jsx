/**
 * UnoCards — self-contained UNO card component system.
 * All styles are inline; no external CSS required.
 */

const SIZES = {
  sm: { w: 46,  h: 68,  pad: 4, cornerFs: 8,  centerFs: 13, ovalW: 28, ovalH: 42, radius: 6  },
  md: { w: 65,  h: 96,  pad: 5, cornerFs: 11, centerFs: 19, ovalW: 40, ovalH: 60, radius: 8  },
  lg: { w: 90,  h: 132, pad: 7, cornerFs: 15, centerFs: 26, ovalW: 56, ovalH: 82, radius: 11 },
};

const PALETTE = {
  red:    { bg: '#E8192C', text: '#E8192C' },
  yellow: { bg: '#FFD700', text: '#b89700' },
  green:  { bg: '#1AA833', text: '#1AA833' },
  blue:   { bg: '#0A57BE', text: '#0A57BE' },
  wild:   { bg: '#1a1a1a', text: '#1a1a1a' },
};

const CORNER_LABEL = {
  skip:    '⊘',
  reverse: '⇄',
  draw2:   '+2',
  wild4:   '+4',
  wild:    '',
};

function getCornerLabel(type, value) {
  if (type === 'number') return String(value ?? 0);
  return CORNER_LABEL[type] ?? '';
}

// --- Wild oval: 4-quadrant color burst ---
function WildOval({ size, label }) {
  const s = SIZES[size];
  return (
    <div style={{
      width: s.ovalW,
      height: s.ovalH,
      borderRadius: '50%',
      transform: 'rotate(-20deg)',
      overflow: 'hidden',
      position: 'relative',
      flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'conic-gradient(#E8192C 0 25%, #0A57BE 25% 50%, #FFD700 50% 75%, #1AA833 75%)',
      }} />
      {label && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            transform: 'rotate(20deg)',
            color: '#fff',
            fontSize: s.centerFs * 0.85,
            fontWeight: 900,
            fontFamily: "'Arial Black', Impact, sans-serif",
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            lineHeight: 1,
          }}>
            {label}
          </span>
        </div>
      )}
    </div>
  );
}

// --- Colored oval: white ellipse with symbol ---
function ColorOval({ type, value, color, size }) {
  const s = SIZES[size];
  const palette = PALETTE[color] || PALETTE.wild;
  const label = type === 'number' ? String(value ?? 0) : (CORNER_LABEL[type] || '?');

  return (
    <div style={{
      width: s.ovalW,
      height: s.ovalH,
      borderRadius: '50%',
      background: '#fff',
      transform: 'rotate(-20deg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{
        transform: 'rotate(20deg)',
        color: palette.text,
        fontSize: s.centerFs,
        fontWeight: 900,
        fontFamily: "'Arial Black', Impact, sans-serif",
        lineHeight: 1,
        userSelect: 'none',
      }}>
        {label}
      </span>
    </div>
  );
}

// --- UnoCard ---
export function UnoCard({
  color = 'red',
  type = 'number',
  value = 0,
  size = 'md',
  faceDown = false,
  style: styleProp,
  onClick,
}) {
  const s = SIZES[size];
  const palette = PALETTE[color] || PALETTE.red;
  const cornerLabel = getCornerLabel(type, value);
  const isWild = type === 'wild' || type === 'wild4';

  const base = {
    position: 'relative',
    width: s.w,
    height: s.h,
    borderRadius: s.radius,
    flexShrink: 0,
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: onClick ? 'pointer' : 'default',
    ...styleProp,
  };

  // Face-down: UNO card back
  if (faceDown) {
    return (
      <div
        style={{
          ...base,
          background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0828 50%, #0a160a 100%)',
          border: '2px solid rgba(255,255,255,0.15)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
        }}
        onClick={onClick}
      >
        {/* red oval */}
        <div style={{
          width: s.ovalW,
          height: s.ovalH,
          borderRadius: '50%',
          background: '#E8192C',
          transform: 'rotate(-20deg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
        }}>
          <span style={{
            transform: 'rotate(20deg)',
            color: '#FFD700',
            fontSize: s.cornerFs * 1.5,
            fontWeight: 900,
            fontFamily: "'Arial Black', Impact, sans-serif",
            letterSpacing: -0.5,
            lineHeight: 1,
          }}>
            UNO
          </span>
        </div>
      </div>
    );
  }

  // Face-up
  return (
    <div
      style={{
        ...base,
        background: palette.bg,
        border: '2px solid rgba(255,255,255,0.25)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
      }}
      onClick={onClick}
    >
      {/* Inner rim */}
      <div style={{
        position: 'absolute',
        inset: s.pad - 2,
        borderRadius: s.radius - 2,
        border: '1.5px solid rgba(255,255,255,0.2)',
        pointerEvents: 'none',
      }} />

      {/* Top-left corner label */}
      {cornerLabel && (
        <div style={{
          position: 'absolute',
          top: s.pad,
          left: s.pad + 1,
          color: '#fff',
          fontSize: s.cornerFs,
          fontWeight: 900,
          fontFamily: "'Arial Black', Impact, sans-serif",
          lineHeight: 1,
          textShadow: '0 1px 2px rgba(0,0,0,0.4)',
        }}>
          {cornerLabel}
        </div>
      )}

      {/* Center oval */}
      {isWild
        ? <WildOval size={size} label={type === 'wild4' ? '+4' : ''} />
        : <ColorOval type={type} value={value} color={color} size={size} />
      }

      {/* Bottom-right corner label */}
      {cornerLabel && (
        <div style={{
          position: 'absolute',
          bottom: s.pad,
          right: s.pad + 1,
          color: '#fff',
          fontSize: s.cornerFs,
          fontWeight: 900,
          fontFamily: "'Arial Black', Impact, sans-serif",
          lineHeight: 1,
          transform: 'rotate(180deg)',
          textShadow: '0 1px 2px rgba(0,0,0,0.4)',
        }}>
          {cornerLabel}
        </div>
      )}
    </div>
  );
}

// --- CardStack ---
export function CardStack({
  cards = [],
  spread = 'fan',
  maxVisible = 7,
  size = 'md',
  onCardClick,
}) {
  const s = SIZES[size];
  const visible = cards.slice(-maxVisible);
  const count = visible.length;

  if (count === 0) return null;

  if (spread === 'stack') {
    return (
      <div style={{ position: 'relative', width: s.w + count * 1.5, height: s.h + count * 1.5 }}>
        {visible.map((card, i) => (
          <div key={i} style={{ position: 'absolute', top: i * 1.5, left: i * 1.5, zIndex: i }}>
            <UnoCard
              {...card}
              size={size}
              onClick={onCardClick ? () => onCardClick(card, i) : undefined}
            />
          </div>
        ))}
      </div>
    );
  }

  if (spread === 'cascade') {
    const overlap = Math.min(Math.round(s.w * 0.5), 26);
    const step = s.w - overlap;
    const totalW = s.w + (count - 1) * step;
    return (
      <div style={{ position: 'relative', width: totalW, height: s.h }}>
        {visible.map((card, i) => (
          <div key={i} style={{ position: 'absolute', left: i * step, top: 0, zIndex: i }}>
            <UnoCard
              {...card}
              size={size}
              onClick={onCardClick ? () => onCardClick(card, i) : undefined}
            />
          </div>
        ))}
      </div>
    );
  }

  // fan spread
  const maxAngle = Math.min(count * 5, 36);
  const angleStep = count > 1 ? maxAngle / (count - 1) : 0;
  const startAngle = -maxAngle / 2;
  const fanOverlap = Math.round(s.w * 0.42);
  const step = s.w - fanOverlap;
  const totalW = s.w + (count - 1) * step;

  return (
    <div style={{ position: 'relative', width: totalW, height: s.h + 60 }}>
      {visible.map((card, i) => {
        const angle = startAngle + i * angleStep;
        return (
          <div key={i} style={{
            position: 'absolute',
            left: i * step,
            bottom: 0,
            transformOrigin: 'bottom center',
            transform: `rotate(${angle}deg)`,
            zIndex: i,
            transition: 'transform 0.15s ease',
          }}>
            <UnoCard
              {...card}
              size={size}
              onClick={onCardClick ? () => onCardClick(card, i) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}

// --- buildDeck (UnoCard format) ---
export function buildDeck() {
  const colors = ['red', 'yellow', 'green', 'blue'];
  const deck = [];

  for (const color of colors) {
    deck.push({ color, type: 'number', value: 0 });
    for (let v = 1; v <= 9; v++) {
      deck.push({ color, type: 'number', value: v });
      deck.push({ color, type: 'number', value: v });
    }
    for (const type of ['skip', 'reverse', 'draw2']) {
      deck.push({ color, type });
      deck.push({ color, type });
    }
  }

  for (let i = 0; i < 4; i++) {
    deck.push({ color: 'wild', type: 'wild' });
    deck.push({ color: 'wild', type: 'wild4' });
  }

  return deck;
}

export default UnoCard;
