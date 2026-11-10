import type { SceneKind } from "@shared/trip";

/**
 * Hand-drawn placeholder artwork shown while a photograph loads, and kept if it fails to load.
 * Each scene is destination-specific so a missing photo never becomes an unrelated picture.
 */
const SKY: Record<SceneKind, [string, string]> = {
  temple: ["#0c1c2a", "#274a57"],
  border: ["#f4c27a", "#d9713c"],
  heritage: ["#f6e6c4", "#e9c58b"],
  bazaar: ["#f8e3bd", "#eeb873"],
  fields: ["#dcebe4", "#f7ecd0"],
  tractor: ["#f9e2b4", "#f1bf7c"],
  garden: ["#e3efe6", "#f8eed8"],
  village: ["#f7dfb6", "#eeb47c"],
  lake: ["#cfe3e6", "#f6e9cf"],
  food: ["#f6ead2", "#ecd6a8"],
  birds: ["#d9ebe2", "#f5edd6"],
};

function Art({ kind, dawn }: { kind: SceneKind; dawn?: boolean }) {
  switch (kind) {
    case "temple":
      return (
        <>
          {[[40, 40], [90, 70], [150, 30], [250, 50], [320, 28], [360, 80], [205, 20], [300, 95]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 ? 1.1 : 1.7} fill="#f5ebd1" opacity={dawn ? 0.25 : 0.8} />
          ))}
          {dawn && <circle cx="312" cy="150" r="30" fill="#fde2b0" opacity="0.9" />}
          <ellipse cx="200" cy="186" rx="170" ry="46" fill="#e8b84a" opacity="0.14" />
          <g id="t">
            <rect x="60" y="182" width="280" height="8" fill="#b8923a" />
            <rect x="130" y="140" width="140" height="44" rx="2" fill="#e3b54a" />
            <rect x="140" y="120" width="120" height="22" fill="#f0c860" />
            <path d="M170 120 q30 -46 60 0z" fill="#f6d778" />
            <rect x="198.500" y="84" width="3" height="14" fill="#f6d778" />
            {[136, 252].map((x) => (
              <g key={x}>
                <rect x={x} y="106" width="12" height="16" fill="#e3b54a" />
                <path d={`M${x - 2} 106 q8 -16 16 0z`} fill="#f6d778" />
              </g>
            ))}
            {[146, 172, 198, 224, 246].map((x) => (
              <path key={x} d={`M${x} 184 v-22 q5 -8 10 0 v22z`} fill="#8a6a1f" opacity="0.75" />
            ))}
          </g>
          <rect x="0" y="190" width="400" height="110" fill={dawn ? "#3a3f5c" : "#0b1a26"} />
          <use href="#t" transform="translate(0 380) scale(1 -1)" opacity="0.32" />
          {[210, 228, 248, 270].map((y, i) => (
            <rect key={y} x={90 + i * 22} y={y} width={220 - i * 44} height="1.5" fill="#f0c860" opacity="0.35" />
          ))}
        </>
      );
    case "border":
      return (
        <>
          <circle cx="200" cy="150" r="46" fill="#fbe3a6" opacity="0.9" />
          <rect x="0" y="212" width="400" height="88" fill="#5a2f1c" />
          <path d="M150 300 L185 212 h30 L250 300z" fill="#7a4428" />
          <g fill="#3d1f13">
            <rect x="112" y="110" width="26" height="104" />
            <rect x="262" y="110" width="26" height="104" />
            <path d="M104 110 h42 l-6 -14 h-30z M254 110 h42 l-6 -14 h-30z" />
            <path d="M138 138 h124 v14 h-124z" />
            <path d="M138 152 q62 -34 124 0 v8 q-62 -30 -124 0z" />
            <rect x="123" y="60" width="2.5" height="40" />
            <rect x="274" y="60" width="2.5" height="40" />
            <path d="M0 212 q40 -22 100 -18 v18z M400 212 q-40 -22 -100 -18 v18z" opacity="0.8" />
          </g>
          <path d="M126 62 h26 v16 h-26z" fill="#e08a1e" />
          <path d="M126 67 h26 v6 h-26z" fill="#fbf7ee" />
          <path d="M277 62 h26 v16 h-26z" fill="#1c4131" />
        </>
      );
    case "heritage":
      return (
        <>
          <circle cx="320" cy="62" r="26" fill="#fbf0d2" opacity="0.8" />
          <rect x="0" y="232" width="400" height="68" fill="#c99a5b" />
          <g fill="#a8643a">
            <rect x="50" y="120" width="300" height="114" />
            <rect x="40" y="110" width="320" height="12" fill="#8f5230" />
            <path d="M170 110 q30 -52 60 0z" />
            <rect x="198" y="48" width="4" height="16" />
            <path d="M62 110 q14 -26 28 0z M310 110 q14 -26 28 0z" />
          </g>
          {[70, 122, 174, 226, 278].map((x) => (
            <path key={x} d={`M${x} 234 v-58 q24 -34 48 0 v58z`} fill="#5d321c" opacity="0.85" />
          ))}
          {[70, 122, 174, 226, 278].map((x) => (
            <rect key={x} x={x + 18} y="130" width="12" height="18" rx="6" fill="#f4dba6" opacity="0.7" />
          ))}
        </>
      );
    case "bazaar":
      return (
        <>
          <rect x="0" y="226" width="400" height="74" fill="#c4874c" />
          <g fill="#7f4526">
            <rect x="20" y="96" width="110" height="132" />
            <rect x="145" y="72" width="110" height="156" />
            <rect x="270" y="104" width="110" height="124" />
          </g>
          {[[20, 150, "#b4412f"], [145, 138, "#1c4131"], [270, 156, "#b8923a"]].map(([x, y, c]) => (
            <path key={x as number} d={`M${(x as number) - 8} ${y} h126 l-10 24 h-106z`} fill={c as string} />
          ))}
          {[30, 62, 94, 156, 188, 220, 280, 312, 344].map((x, i) => (
            <rect key={x} x={x} y={i < 3 ? 110 : i < 6 ? 88 : 118} width="20" height="24" rx="10" fill="#f6dfae" opacity="0.75" />
          ))}
          <path d="M0 60 Q100 96 200 62 T400 60" stroke="#5d321c" strokeWidth="1.5" fill="none" />
          {[30, 70, 110, 150, 190, 230, 270, 310, 350].map((x, i) => (
            <path key={x} d={`M${x} ${66 + Math.sin(i * 0.8) * 10} l8 16 l8 -16z`} fill={["#e08a1e", "#1c4131", "#b4412f", "#b8923a"][i % 4]} />
          ))}
          {[40, 80, 300, 340, 190].map((x, i) => (
            <circle key={x} cx={x} cy={206 + (i % 2) * 6} r="9" fill={["#e08a1e", "#f0c860", "#b4412f", "#f6dfae", "#6f9c84"][i]} />
          ))}
        </>
      );
    case "fields":
    case "tractor":
      return (
        <>
          <circle cx="300" cy="74" r="30" fill="#fbe9b4" />
          <path d="M0 150 Q100 110 200 140 T400 124 V300 H0z" fill="#9dbb8b" />
          <path d="M0 176 Q120 150 240 172 T400 160 V300 H0z" fill="#5f8f55" />
          <path d="M0 204 H400 V300 H0z" fill="#3f7a4a" />
          {[-200, -120, -50, 10, 70, 130, 190, 250, 310, 370, 440, 520, 600].map((x) => (
            <path key={x} d={`M200 196 L${x} 300`} stroke="#c9b03e" strokeWidth="3" opacity="0.55" />
          ))}
          {[[60, 166], [86, 160], [330, 152], [352, 158]].map(([x, y]) => (
            <g key={x}>
              <rect x={x - 1.5} y={y} width="3" height="16" fill="#4a3320" />
              <circle cx={x} cy={y - 4} r="11" fill="#2c5a3d" />
            </g>
          ))}
          {kind === "tractor" && (
            <g transform="translate(118 168)">
              <rect x="34" y="18" width="70" height="30" rx="4" fill="#b4412f" />
              <path d="M40 18 v-30 h34 l8 30z" fill="none" stroke="#3a1c14" strokeWidth="4" />
              <rect x="100" y="6" width="5" height="16" fill="#3a1c14" />
              <circle cx="42" cy="52" r="26" fill="#2a1a14" />
              <circle cx="42" cy="52" r="11" fill="#e3b54a" />
              <circle cx="104" cy="62" r="16" fill="#2a1a14" />
              <circle cx="104" cy="62" r="6" fill="#e3b54a" />
            </g>
          )}
        </>
      );
    case "garden":
      return (
        <>
          <path d="M0 190 Q100 160 200 184 T400 170 V300 H0z" fill="#8fb597" />
          <path d="M0 226 Q140 204 260 224 T400 216 V300 H0z" fill="#4f8a62" />
          {[[60, 150, "#c9534a", 20], [130, 120, "#e08a1e", 24], [205, 146, "#d9677a", 22], [278, 112, "#e8b84a", 25], [345, 152, "#c9534a", 19]].map(([x, y, c, r]) => (
            <g key={x as number}>
              <path d={`M${x} ${y} Q${(x as number) + 6} ${(y as number) + 60} ${x} 290`} stroke="#2c5a3d" strokeWidth="4" fill="none" />
              <ellipse cx={(x as number) + 14} cy={(y as number) + 70} rx="14" ry="6" fill="#2c5a3d" transform={`rotate(-28 ${(x as number) + 14} ${(y as number) + 70})`} />
              {[0, 60, 120, 180, 240, 300].map((a) => (
                <ellipse key={a} cx={x} cy={(y as number) - (r as number) * 0.62} rx={(r as number) * 0.46} ry={(r as number) * 0.7} fill={c as string} opacity="0.9" transform={`rotate(${a} ${x} ${y})`} />
              ))}
              <circle cx={x} cy={y} r={(r as number) * 0.34} fill="#fbe9b4" />
            </g>
          ))}
        </>
      );
    case "village":
      return (
        <>
          <circle cx="92" cy="80" r="30" fill="#fdebb8" opacity="0.9" />
          <path d="M0 216 Q200 196 400 216 V300 H0z" fill="#b98448" />
          <path d="M0 250 Q200 232 400 250 V300 H0z" fill="#9c6a36" />
          <g>
            <rect x="322" y="126" width="7" height="94" fill="#4a3320" />
            <circle cx="326" cy="110" r="40" fill="#2c5a3d" />
            <circle cx="298" cy="130" r="24" fill="#35694a" />
          </g>
          {[[70, 150, 96], [196, 164, 80]].map(([x, y, w]) => (
            <g key={x}>
              <rect x={x} y={y} width={w} height={220 - y} fill="#e7c48d" />
              <path d={`M${x - 14} ${y + 4} L${x + w / 2} ${y - 46} L${x + w + 14} ${y + 4}z`} fill="#8f5a2c" />
              <rect x={x + w / 2 - 10} y={y + 26} width="20" height={220 - y - 26} rx="2" fill="#5d321c" />
              <rect x={x + 10} y={y + 16} width="14" height="14" fill="#5d321c" opacity="0.7" />
            </g>
          ))}
          <g stroke="#3a2416" strokeWidth="3.5" fill="none">
            <circle cx="150" cy="244" r="20" />
            <path d="M150 224 v40 M130 244 h40 M136 230 l28 28 M164 230 l-28 28" strokeWidth="2" />
          </g>
        </>
      );
    case "lake":
      return (
        <>
          <circle cx="290" cy="84" r="28" fill="#fbe9b4" />
          <path d="M0 170 L70 112 L130 150 L200 96 L270 146 L330 118 L400 162 V200 H0z" fill="#8fb0a4" />
          <path d="M0 184 L90 150 L170 176 L260 144 L400 182 V200 H0z" fill="#5f8f7a" />
          <rect x="0" y="196" width="400" height="104" fill="#3d7f8a" />
          {[214, 232, 252, 274].map((y, i) => (
            <path key={y} d={`M${30 + i * 40} ${y} h${90 - i * 10} M${230 - i * 12} ${y + 6} h${120 - i * 14}`} stroke="#d7ecec" strokeWidth="2" opacity="0.5" />
          ))}
          <g transform="translate(150 222)">
            <path d="M0 14 h84 l-12 16 h-60z" fill="#b4412f" />
            <path d="M40 12 v-44 l30 44z" fill="#fbf7ee" />
            <path d="M36 12 v-34 l-22 34z" fill="#f0c860" />
          </g>
        </>
      );
    case "food":
      return (
        <>
          <circle cx="200" cy="150" r="118" fill="#c9a24d" />
          <circle cx="200" cy="150" r="108" fill="#e4c476" />
          <circle cx="200" cy="150" r="100" fill="#d8b45e" opacity="0.6" />
          {[[150, 104, "#c8742c"], [250, 104, "#5f8f55"], [262, 176, "#f3e6c4"], [138, 176, "#b4412f"]].map(([x, y, c]) => (
            <g key={`${x}-${y}`}>
              <circle cx={x} cy={y} r="31" fill="#9a7a2e" />
              <circle cx={x} cy={y} r="25" fill={c as string} />
              <circle cx={(x as number) - 7} cy={(y as number) - 7} r="5" fill="#fff" opacity="0.25" />
            </g>
          ))}
          <circle cx="200" cy="196" r="36" fill="#f0d9a2" />
          <circle cx="200" cy="196" r="30" fill="#e2c07c" />
          {[[190, 188], [208, 200], [196, 208], [212, 184]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="3.2" fill="#a8743a" opacity="0.7" />
          ))}
        </>
      );
    case "birds":
      return (
        <>
          <circle cx="96" cy="76" r="26" fill="#fbe9b4" />
          <path d="M0 210 Q200 180 400 210 V300 H0z" fill="#5f8f55" />
          {[[60, 176, 44], [150, 150, 58], [262, 164, 50], [350, 146, 60]].map(([x, y, r]) => (
            <g key={x}>
              <rect x={x - 4} y={y} width="8" height={230 - y} fill="#4a3320" />
              <circle cx={x} cy={y - r * 0.3} r={r} fill={x % 3 ? "#2c5a3d" : "#3f7a5d"} />
            </g>
          ))}
          {[[150, 70, 1], [210, 52, 1.3], [270, 84, 0.9], [320, 46, 1.1]].map(([x, y, s]) => (
            <path key={x} d="M-14 0 q7 -10 14 0 q7 -10 14 0" transform={`translate(${x} ${y}) scale(${s})`} stroke="#1c4131" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          ))}
          <g transform="translate(232 128)">
            <ellipse cx="0" cy="0" rx="13" ry="9" fill="#e08a1e" />
            <circle cx="11" cy="-7" r="6" fill="#b4412f" />
            <path d="M16 -7 l8 2 l-8 3z" fill="#f0c860" />
            <path d="M-12 0 l-14 8 l12 -1z" fill="#1c4131" />
          </g>
        </>
      );
  }
}

export function Scene({ kind, tone = 0, id }: { kind: SceneKind; tone?: number; id: string }) {
  // Tone 150 on the temple scene means "dawn": a different sky instead of a hue shift.
  const dawn = kind === "temple" && tone === 150;
  const [a, b] = dawn ? ["#2f3a5e", "#f1b98c"] : SKY[kind];
  if (dawn) tone = 0;
  const gid = `sky-${id}`;
  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      style={tone ? { filter: `hue-rotate(${tone * 0.35}deg)` } : undefined}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${gid})`} />
      <Art kind={kind} dawn={dawn} />
    </svg>
  );
}
