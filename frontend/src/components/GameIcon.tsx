import { useId, type CSSProperties, type SVGProps } from 'react';

type IconGlyph =
  | 'ticTacToe'
  | 'ticClassic'
  | 'ticDisappearing'
  | 'ticJoker'
  | 'ticGobblet'
  | 'ticGravity'
  | 'ticBidding'
  | 'ticBlind'
  | 'diceTug'
  | 'codeBreaker'
  | 'codeDigits'
  | 'numberRange'
  | 'memoryFlip'
  | 'higherLower'
  | 'higherSprint'
  | 'higherExpert'
  | 'stopClock'
  | 'bluffCard'
  | 'checkers'
  | 'checkersAnti'
  | 'checkersZombie'
  | 'checkersMinefield'
  | 'checkersVip'
  | 'checkersPortal'
  | 'dropFour'
  | 'dropWreckingBall'
  | 'dropPopout'
  | 'dropGravityFlip'
  | 'dropBattleship'
  | 'dropHeavyToken'
  | 'triviaBattle'
  | 'couplesTruthDare';

type IconTheme = {
  glyph: IconGlyph;
  a: string;
  b: string;
  c: string;
};

const ICONS = {
  'tic-tac-toe': { glyph: 'ticTacToe', a: '#8b5cf6', b: '#22d3ee', c: '#f472b6' },
  'tic-tac-toe-classic': { glyph: 'ticClassic', a: '#7c3aed', b: '#06b6d4', c: '#f8fafc' },
  'tic-tac-toe-disappearing': { glyph: 'ticDisappearing', a: '#8b5cf6', b: '#a78bfa', c: '#f472b6' },
  'tic-tac-toe-joker': { glyph: 'ticJoker', a: '#be123c', b: '#f59e0b', c: '#22d3ee' },
  'tic-tac-toe-gobblet': { glyph: 'ticGobblet', a: '#7c3aed', b: '#f97316', c: '#f8fafc' },
  'tic-tac-toe-gravity': { glyph: 'ticGravity', a: '#0ea5e9', b: '#22c55e', c: '#f8fafc' },
  'tic-tac-toe-bidding': { glyph: 'ticBidding', a: '#f59e0b', b: '#f97316', c: '#7c3aed' },
  'tic-tac-toe-blind': { glyph: 'ticBlind', a: '#334155', b: '#818cf8', c: '#22d3ee' },
  'shut-the-box': { glyph: 'diceTug', a: '#f97316', b: '#facc15', c: '#7c2d12' },
  'code-guess': { glyph: 'codeBreaker', a: '#06b6d4', b: '#0891b2', c: '#f8fafc' },
  'code-guess-digits': { glyph: 'codeDigits', a: '#06b6d4', b: '#4f46e5', c: '#f8fafc' },
  'code-guess-number-range': { glyph: 'numberRange', a: '#0891b2', b: '#22d3ee', c: '#f8fafc' },
  'memory-flip': { glyph: 'memoryFlip', a: '#ec4899', b: '#f97316', c: '#f8fafc' },
  'higher-lower': { glyph: 'higherLower', a: '#10b981', b: '#22d3ee', c: '#f8fafc' },
  'higher-lower-sprint': { glyph: 'higherSprint', a: '#22c55e', b: '#facc15', c: '#f8fafc' },
  'higher-lower-classic': { glyph: 'higherLower', a: '#10b981', b: '#22d3ee', c: '#f8fafc' },
  'higher-lower-expert': { glyph: 'higherExpert', a: '#059669', b: '#7c3aed', c: '#f8fafc' },
  'stop-clock': { glyph: 'stopClock', a: '#3b82f6', b: '#22d3ee', c: '#f8fafc' },
  'bluff-card': { glyph: 'bluffCard', a: '#7c3aed', b: '#be123c', c: '#f8fafc' },
  checkers: { glyph: 'checkers', a: '#0369a1', b: '#0ea5e9', c: '#f8fafc' },
  'checkers-classic': { glyph: 'checkers', a: '#0369a1', b: '#0ea5e9', c: '#f8fafc' },
  'checkers-anti': { glyph: 'checkersAnti', a: '#be123c', b: '#fb7185', c: '#f8fafc' },
  'checkers-zombie': { glyph: 'checkersZombie', a: '#15803d', b: '#84cc16', c: '#f8fafc' },
  'checkers-minefield': { glyph: 'checkersMinefield', a: '#b45309', b: '#f59e0b', c: '#111827' },
  'checkers-vip': { glyph: 'checkersVip', a: '#7c3aed', b: '#facc15', c: '#f8fafc' },
  'checkers-portal': { glyph: 'checkersPortal', a: '#0891b2', b: '#a855f7', c: '#f8fafc' },
  'drop-four': { glyph: 'dropFour', a: '#0e7490', b: '#22c55e', c: '#f8fafc' },
  'drop-four-classic': { glyph: 'dropFour', a: '#0ea5e9', b: '#22c55e', c: '#f8fafc' },
  'drop-four-wrecking-ball': { glyph: 'dropWreckingBall', a: '#dc2626', b: '#f97316', c: '#f8fafc' },
  'drop-four-popout': { glyph: 'dropPopout', a: '#ea580c', b: '#facc15', c: '#f8fafc' },
  'drop-four-gravity-flip': { glyph: 'dropGravityFlip', a: '#2563eb', b: '#22d3ee', c: '#f8fafc' },
  'drop-four-battleship-drop': { glyph: 'dropBattleship', a: '#0f766e', b: '#14b8a6', c: '#f8fafc' },
  'drop-four-heavy-token': { glyph: 'dropHeavyToken', a: '#4b5563', b: '#facc15', c: '#f8fafc' },
  'trivia-battle': { glyph: 'triviaBattle', a: '#ec4899', b: '#8b5cf6', c: '#f8fafc' },
  'couples-truth-dare': { glyph: 'couplesTruthDare', a: '#f43f5e', b: '#fb7185', c: '#f8fafc' },
  'row-call': { glyph: 'ticClassic', a: '#a78bfa', b: '#7c3aed', c: '#f472b6' },
} satisfies Record<string, IconTheme>;

export type GameIconKey = keyof typeof ICONS;

const ICON_ALIASES: Record<string, GameIconKey> = {
  'X/O': 'tic-tac-toe',
  'XO': 'tic-tac-toe',
  tic_tac_toe: 'tic-tac-toe',
  shut_the_box: 'shut-the-box',
  code_guess: 'code-guess',
  memory_flip: 'memory-flip',
  higher_lower: 'higher-lower',
  code_breaker_number: 'code-guess-number-range',
  stop_clock: 'stop-clock',
  bluff_card: 'bluff-card',
  drop_four: 'drop-four',
  trivia_battle: 'trivia-battle',
  couples_truth_dare: 'couples-truth-dare',
  row_call: 'row-call',
  CK: 'checkers-classic',
  AC: 'checkers-anti',
  ZC: 'checkers-zombie',
  MC: 'checkers-minefield',
  VC: 'checkers-vip',
  PC: 'checkers-portal',
  D4: 'drop-four-classic',
  WB: 'drop-four-wrecking-ball',
  PO: 'drop-four-popout',
  GF: 'drop-four-gravity-flip',
  BD: 'drop-four-battleship-drop',
  HT: 'drop-four-heavy-token',
};

export function resolveGameIconKey(icon: string | null | undefined): GameIconKey {
  if (icon && icon in ICONS) return icon as GameIconKey;
  if (icon && icon in ICON_ALIASES) return ICON_ALIASES[icon];
  return 'tic-tac-toe';
}

export function isGameIconKey(icon: string | null | undefined): icon is GameIconKey {
  return Boolean(icon && icon in ICONS);
}

export interface GameIconProps extends Omit<SVGProps<SVGSVGElement>, 'color'> {
  icon: string | null | undefined;
  title?: string;
  size?: number | string;
}

export default function GameIcon({ icon, title, size, style, ...props }: GameIconProps) {
  const key = resolveGameIconKey(icon);
  const theme = ICONS[key];
  const iconId = useId().replace(/:/g, '');
  const ids = {
    bg: `${iconId}-${key}-icon-bg`,
    glass: `${iconId}-${key}-icon-glass`,
    glow: `${iconId}-${key}-icon-glow`,
  };
  const nextStyle: CSSProperties | undefined = size ? { width: size, height: size, ...style } : style;

  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      style={nextStyle}
      {...props}
    >
      <defs>
        <linearGradient id={ids.bg} x1="13" y1="8" x2="86" y2="91" gradientUnits="userSpaceOnUse">
          <stop stopColor={theme.a} />
          <stop offset="0.58" stopColor={theme.b} />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <radialGradient id={ids.glow} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(30 21) rotate(48) scale(66 52)">
          <stop stopColor="#ffffff" stopOpacity="0.74" />
          <stop offset="0.42" stopColor={theme.c} stopOpacity="0.22" />
          <stop offset="1" stopColor="#020617" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ids.glass} x1="18" y1="14" x2="75" y2="82" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.54" />
          <stop offset="0.42" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="84" height="84" rx="24" fill={`url(#${ids.bg})`} />
      <rect x="6" y="6" width="84" height="84" rx="24" fill={`url(#${ids.glow})`} />
      <path d="M20 18H76C80.4 18 84 21.6 84 26V52C64.8 46.2 46.2 39.6 12 48V26C12 21.6 15.6 18 20 18Z" fill={`url(#${ids.glass})`} opacity="0.5" />
      <rect x="10" y="10" width="76" height="76" rx="20" stroke="#ffffff" strokeOpacity="0.32" strokeWidth="1.5" />
      <rect x="18" y="18" width="60" height="60" rx="16" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="1" />
      {renderGlyph(theme)}
    </svg>
  );
}

function renderGlyph(theme: IconTheme) {
  const common = { strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  const soft = '#e2e8f0';
  const white = '#ffffff';
  const dark = '#020617';

  switch (theme.glyph) {
    case 'ticTacToe':
    case 'ticClassic':
      return (
        <g {...common} stroke={white} strokeWidth="4">
          <path d="M34 24V72M62 24V72M24 34H72M24 62H72" opacity="0.7" />
          <path d="M31 29L43 41M43 29L31 41" stroke={theme.c} />
          <circle cx="59" cy="59" r="8" stroke={white} />
          <path d="M55 29L67 41M67 29L55 41" stroke={theme.c} opacity={theme.glyph === 'ticClassic' ? 1 : 0.64} />
        </g>
      );
    case 'ticDisappearing':
      return (
        <g {...common} stroke={white} strokeWidth="4">
          <path d="M34 24V72M62 24V72M24 34H72M24 62H72" opacity="0.58" />
          <path d="M31 29L43 41M43 29L31 41" stroke={theme.c} strokeDasharray="3 5" opacity="0.48" />
          <circle cx="59" cy="59" r="8" stroke={white} />
          <path d="M53 31H69" stroke={theme.c} />
          <path d="M61 23V39" stroke={theme.c} />
        </g>
      );
    case 'ticJoker':
      return (
        <g {...common}>
          <rect x="30" y="22" width="36" height="52" rx="8" fill="#fff7ed" stroke={white} strokeOpacity="0.72" strokeWidth="2" transform="rotate(8 48 48)" />
          <path d="M45 33L51 43L63 45L54 53L56 65L45 59L34 65L36 53L27 45L39 43L45 33Z" fill={theme.b} stroke={dark} strokeOpacity="0.18" strokeWidth="1.5" />
          <circle cx="63" cy="30" r="5" fill={theme.c} />
          <circle cx="30" cy="67" r="4" fill={theme.a} />
        </g>
      );
    case 'ticGobblet':
      return (
        <g {...common} stroke={white} strokeWidth="3">
          <path d="M28 64C28 51 35 42 48 42C61 42 68 51 68 64" fill={theme.a} fillOpacity="0.44" />
          <path d="M36 62C36 53 41 48 48 48C55 48 60 53 60 62" fill={theme.b} fillOpacity="0.54" />
          <path d="M43 60C43 55 45 53 48 53C51 53 53 55 53 60" fill={theme.c} fillOpacity="0.72" />
          <path d="M25 66H71M35 63H61M42 60H54" />
        </g>
      );
    case 'ticGravity':
      return (
        <g {...common}>
          <path d="M28 24V70M48 24V70M68 24V70" stroke={white} strokeOpacity="0.55" strokeWidth="3" />
          <circle cx="28" cy="62" r="7" fill={theme.c} />
          <circle cx="48" cy="52" r="7" fill={white} />
          <circle cx="68" cy="64" r="7" fill={theme.c} />
          <path d="M48 24V39M40 33L48 41L56 33" stroke={white} strokeWidth="4" />
        </g>
      );
    case 'ticBidding':
      return (
        <g {...common}>
          <circle cx="36" cy="57" r="15" fill="#fde68a" stroke={white} strokeWidth="3" />
          <path d="M36 47V67M28 57H44" stroke="#92400e" strokeWidth="3" />
          <path d="M51 30L68 47M58 23L75 40" stroke={white} strokeWidth="6" />
          <path d="M50 55L69 74" stroke={theme.c} strokeWidth="5" />
          <path d="M27 74H56" stroke={white} strokeWidth="4" />
        </g>
      );
    case 'ticBlind':
      return (
        <g {...common} stroke={white} strokeWidth="4">
          <path d="M20 48C29 34 39 28 48 28C57 28 67 34 76 48C67 62 57 68 48 68C39 68 29 62 20 48Z" fill={theme.a} fillOpacity="0.3" />
          <circle cx="48" cy="48" r="10" fill={theme.c} stroke={white} />
          <path d="M24 72L72 24" stroke={theme.b} />
        </g>
      );
    case 'diceTug':
      return (
        <g {...common}>
          <rect x="22" y="27" width="30" height="30" rx="7" fill={white} fillOpacity="0.92" stroke={dark} strokeOpacity="0.2" strokeWidth="2" />
          <circle cx="32" cy="37" r="3" fill={theme.a} /><circle cx="42" cy="47" r="3" fill={theme.a} />
          <rect x="48" y="41" width="26" height="26" rx="6" fill="#fff7ed" stroke={white} strokeWidth="2" />
          <circle cx="56" cy="49" r="2.8" fill={theme.a} /><circle cx="66" cy="49" r="2.8" fill={theme.a} /><circle cx="61" cy="59" r="2.8" fill={theme.a} />
          <path d="M22 68H73M29 68V75M48 68V75M67 68V75" stroke={white} strokeWidth="3" />
        </g>
      );
    case 'codeBreaker':
    case 'codeDigits':
      return (
        <g {...common}>
          <rect x="25" y="42" width="46" height="32" rx="8" fill={white} fillOpacity="0.92" stroke={theme.c} strokeWidth="2" />
          <path d="M34 42V35C34 26 40 20 48 20C56 20 62 26 62 35V42" stroke={white} strokeWidth="5" />
          <circle cx="38" cy="58" r="4" fill={theme.a} /><circle cx="48" cy="58" r="4" fill={theme.b} /><circle cx="58" cy="58" r="4" fill={theme.a} />
          <path d="M34 67H62" stroke={dark} strokeOpacity="0.28" strokeWidth="3" />
        </g>
      );
    case 'numberRange':
      return (
        <g {...common}>
          <path d="M23 62H68" stroke={white} strokeWidth="5" />
          <path d="M30 62V54M47 62V47M64 62V37" stroke={theme.c} strokeWidth="4" />
          <circle cx="48" cy="42" r="16" fill={theme.a} fillOpacity="0.35" stroke={white} strokeWidth="4" />
          <path d="M59 53L72 66" stroke={white} strokeWidth="5" />
        </g>
      );
    case 'memoryFlip':
      return (
        <g {...common}>
          <rect x="27" y="26" width="28" height="38" rx="7" fill={white} fillOpacity="0.18" stroke={white} strokeWidth="3" transform="rotate(-9 41 45)" />
          <rect x="42" y="30" width="28" height="38" rx="7" fill="#fff7ed" stroke={white} strokeWidth="3" transform="rotate(8 56 49)" />
          <path d="M53 44H61M57 40V58" stroke={theme.a} strokeWidth="4" />
          <path d="M31 39H48M31 49H48" stroke={theme.c} strokeOpacity="0.75" strokeWidth="3" />
        </g>
      );
    case 'higherLower':
      return (
        <g {...common} stroke={white} strokeWidth="5">
          <path d="M27 59L39 47L49 57L68 34" />
          <path d="M58 34H68V44" />
          <path d="M29 70H68" stroke={theme.c} />
          <path d="M30 32H58" stroke={theme.c} opacity="0.7" />
        </g>
      );
    case 'higherSprint':
      return (
        <path d="M54 18L27 52H45L39 78L70 40H51L54 18Z" fill={theme.c} stroke="#ffffff" strokeWidth="4" strokeLinejoin="round" />
      );
    case 'higherExpert':
      return (
        <g {...common} stroke={white} strokeWidth="4">
          <path d="M25 31H71M25 48H71M25 65H71M31 25V71M48 25V71M65 25V71" opacity="0.58" />
          <path d="M31 65L48 48L65 31" stroke={theme.c} />
          <circle cx="31" cy="65" r="5" fill={theme.c} stroke={white} /><circle cx="65" cy="31" r="5" fill={theme.c} stroke={white} />
        </g>
      );
    case 'stopClock':
      return (
        <g {...common} stroke={white} strokeWidth="4">
          <path d="M39 20H57M48 20V28" />
          <circle cx="48" cy="53" r="25" fill={theme.a} fillOpacity="0.26" />
          <path d="M48 36V53L60 62" />
          <path d="M31 35L24 28M65 35L72 28" stroke={theme.c} />
          <path d="M35 75H61" stroke={theme.c} />
        </g>
      );
    case 'bluffCard':
      return (
        <g {...common}>
          <rect x="27" y="28" width="30" height="42" rx="7" fill={theme.a} fillOpacity="0.72" stroke={white} strokeWidth="3" transform="rotate(-10 42 49)" />
          <rect x="42" y="24" width="30" height="42" rx="7" fill="#fff7ed" stroke={white} strokeWidth="3" transform="rotate(8 57 45)" />
          <path d="M53 38C57 32 67 34 67 42C67 50 55 54 52 62" stroke={theme.a} strokeWidth="4" />
          <circle cx="52" cy="68" r="3" fill={theme.a} />
        </g>
      );
    case 'checkers':
    case 'checkersAnti':
    case 'checkersZombie':
    case 'checkersMinefield':
    case 'checkersVip':
    case 'checkersPortal':
      return renderCheckersGlyph(theme);
    case 'dropFour':
    case 'dropWreckingBall':
    case 'dropPopout':
    case 'dropGravityFlip':
    case 'dropBattleship':
    case 'dropHeavyToken':
      return renderDropGlyph(theme);
    case 'triviaBattle':
      return (
        <g {...common}>
          <rect x="24" y="26" width="48" height="40" rx="10" fill={white} fillOpacity="0.2" stroke={white} strokeWidth="3" />
          <path d="M39 42C39 35 45 32 50 34C56 36 57 43 51 47C47 50 47 51 47 55" stroke={white} strokeWidth="5" />
          <circle cx="47" cy="63" r="3.5" fill={theme.c} />
          <path d="M30 72H66" stroke={theme.c} strokeWidth="4" />
        </g>
      );
    case 'couplesTruthDare':
      return (
        <g {...common}>
          <rect x="24" y="31" width="30" height="38" rx="8" fill={white} fillOpacity="0.18" stroke={white} strokeWidth="3" transform="rotate(-7 39 50)" />
          <rect x="43" y="27" width="30" height="38" rx="8" fill={white} fillOpacity="0.24" stroke={white} strokeWidth="3" transform="rotate(8 58 46)" />
          <path d="M48 64C37 56 33 50 36 44C39 38 46 40 48 45C50 40 57 38 60 44C63 50 59 56 48 64Z" fill={theme.c} stroke={white} strokeWidth="2" />
        </g>
      );
  }
}

function renderCheckersGlyph(theme: IconTheme) {
  const glyph = theme.glyph;
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 25H72V73H24V25Z" fill="#020617" fillOpacity="0.24" stroke="#ffffff" strokeOpacity="0.82" strokeWidth="3" />
      {Array.from({ length: 4 }).map((_, row) =>
        Array.from({ length: 4 }).map((__, col) => (
          <rect key={`${row}-${col}`} x={24 + col * 12 + (row % 2) * 6} y={25 + row * 12} width="6" height="6" fill="#ffffff" opacity="0.2" />
        )),
      )}
      <circle cx="36" cy="60" r="9" fill={theme.c} stroke="#ffffff" strokeWidth="3" />
      <circle cx="60" cy="38" r="9" fill={theme.a} stroke="#ffffff" strokeWidth="3" />
      {glyph === 'checkersAnti' && <path d="M64 57L54 67L44 57" stroke="#ffffff" strokeWidth="5" />}
      {glyph === 'checkersZombie' && <path d="M30 39C37 30 52 29 60 39M66 48C59 58 43 59 35 49" stroke="#bbf7d0" strokeWidth="4" />}
      {glyph === 'checkersMinefield' && <path d="M45 33L51 45L64 47L54 55L57 68L45 61L33 68L36 55L26 47L39 45L45 33Z" fill={theme.b} stroke="#ffffff" strokeWidth="2" opacity="0.94" />}
      {glyph === 'checkersVip' && <path d="M50 31L55 40L63 34L61 49H37L35 34L43 40L48 31H50Z" fill="#fde68a" stroke="#ffffff" strokeWidth="2" />}
      {glyph === 'checkersPortal' && <><ellipse cx="33" cy="38" rx="10" ry="13" stroke="#c4b5fd" strokeWidth="4" /><ellipse cx="63" cy="61" rx="10" ry="13" stroke="#67e8f9" strokeWidth="4" /></>}
    </g>
  );
}

function renderDropGlyph(theme: IconTheme) {
  const glyph = theme.glyph;
  const cells = Array.from({ length: 12 }, (_, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const filled = [1, 5, 6, 9].includes(index);
    const hidden = glyph === 'dropBattleship' && row > 0;
    return (
      <circle
        key={index}
        cx={30 + col * 12}
        cy={32 + row * 13}
        r="4.8"
        fill={hidden ? '#020617' : filled ? (index % 2 ? theme.c : '#ffffff') : 'transparent'}
        stroke="#ffffff"
        strokeOpacity={hidden ? 0.38 : 0.76}
        strokeWidth="2"
      />
    );
  });
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <rect x="23" y="24" width="50" height="51" rx="10" fill="#020617" fillOpacity="0.24" stroke="#ffffff" strokeWidth="3" />
      {cells}
      {glyph === 'dropWreckingBall' && <path d="M48 48L35 35M48 48L61 35M48 48L35 61M48 48L61 61" stroke="#ffffff" strokeWidth="4" />}
      {glyph === 'dropPopout' && <path d="M31 76H65M48 68V80M40 73L48 81L56 73" stroke={theme.c} strokeWidth="4" />}
      {glyph === 'dropGravityFlip' && <path d="M28 20C40 13 58 14 68 25M68 25H56M68 25V13M68 78C56 85 38 84 28 73M28 73H40M28 73V85" stroke={theme.c} strokeWidth="4" />}
      {glyph === 'dropBattleship' && <path d="M23 48H73V75H23V48Z" fill="#020617" opacity="0.42" />}
      {glyph === 'dropHeavyToken' && <><circle cx="48" cy="31" r="9" fill={theme.b} stroke="#ffffff" strokeWidth="3" /><path d="M37 67H59M41 59H55" stroke="#ffffff" strokeWidth="4" /></>}
    </g>
  );
}