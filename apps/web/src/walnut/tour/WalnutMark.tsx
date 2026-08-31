// The Walnut mark. A walnut shell is a sealed capsule whose two halves meet at a visible seam --
// which is exactly what this middleware sells: an immutable Context Capsule, sealed before the
// run, with a hash chain running down the join where anyone can check it. The seam is drawn as a
// chain of linked nodes for that reason; it is the product thesis, not decoration.

export function WalnutMark({
  size = 40,
  title = "Walnut",
}: {
  size?: number;
  title?: string;
}) {
  // Gradient ids must be unique per rendered instance or a second <svg> on the page silently
  // steals the first one's paint server.
  const uid = `walnut-mark-${size}`;

  return (
    <svg
      className="walnut-mark"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      focusable="false"
    >
      <defs>
        <linearGradient id={`${uid}-shell`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#d3ab80" />
          <stop offset="0.55" stopColor="#b0824f" />
          <stop offset="1" stopColor="#7d5733" />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          <path d="M32 5c14 0 24 11.4 24 27.2C56 46.8 45.3 59 32 59S8 46.8 8 32.2C8 16.4 18 5 32 5Z" />
        </clipPath>
      </defs>

      {/* shell */}
      <path
        d="M32 5c14 0 24 11.4 24 27.2C56 46.8 45.3 59 32 59S8 46.8 8 32.2C8 16.4 18 5 32 5Z"
        fill={`url(#${uid}-shell)`}
        stroke="#4a3524"
        strokeWidth="2.4"
      />

      {/* kernel folds -- mirrored halves, clipped to the shell so nothing spills past the rim */}
      <g
        clipPath={`url(#${uid}-clip)`}
        fill="none"
        stroke="#4a3524"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      >
        <g>
          <path d="M24.5 14.5c-8.5 5-12.5 14.5-9.5 24" />
          <path d="M26 24c-5 3.5-7 9.5-5.5 15" />
          <path d="M22.5 44.5c2.5 4 5.5 6.5 8 7.5" />
        </g>
        <g transform="translate(64,0) scale(-1,1)">
          <path d="M24.5 14.5c-8.5 5-12.5 14.5-9.5 24" />
          <path d="M26 24c-5 3.5-7 9.5-5.5 15" />
          <path d="M22.5 44.5c2.5 4 5.5 6.5 8 7.5" />
        </g>
      </g>

      {/* light */}
      <ellipse cx="24" cy="17" rx="9" ry="6" fill="#ffffff" opacity="0.16" transform="rotate(-28 24 17)" />

      {/* the seam: a hash chain sealing the two halves */}
      <path d="M32 15v34" stroke="#6954d9" strokeWidth="2.6" strokeLinecap="round" />
      {[15, 26.3, 37.6, 49].map((cy) => (
        <circle key={cy} cx="32" cy={cy} r="3.5" fill="#6954d9" stroke="#fbfaf7" strokeWidth="1.7" />
      ))}
    </svg>
  );
}
