export default function Logo({
  size = 36,
  withWordmark = true,
}: { size?: number; withWordmark?: boolean }) {
  return (
    <div className="flex items-center gap-3" style={{ lineHeight: 1 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        role="img"
        aria-labelledby="logoTitle logoDesc"
      >
        <title id="logoTitle">Βυζαντινή Χορωδία</title>
        <desc id="logoDesc">Σήμα με λύρα (τρία σύρματα) σε μπλε και χρυσό</desc>

        {/* White tile background */}
        <rect x="0" y="0" width="64" height="64" fill="#ffffff" rx="12" />

        {/* Blue roundel */}
        <circle cx="32" cy="32" r="26" fill="#1E40AF" />

        {/* Gold ring */}
        <circle cx="32" cy="32" r="24" fill="none" stroke="#C69200" strokeWidth="2.5" />

        {/* Gold lyre outline */}
        <path
          d="M20 38c0 6.5 5.4 12 12 12s12-5.5 12-12V22
             m-24 0v16
             M20 22c0-3 2.5-5.5 5.5-5.5h0.5
             M44 22c0-3-2.5-5.5-5.5-5.5h-0.5"
          fill="none"
          stroke="#C69200"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Three white strings */}
        <path d="M28 22v18" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M32 18v26" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M36 22v18" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />

        {/* Small gold cross on top */}
        <path d="M32 10v6 M29 13h6" stroke="#C69200" strokeWidth="2.5" strokeLinecap="round" />
      </svg>

      {withWordmark && (
        <span
          className="font-heading font-semibold text-blue wordmark"
          style={{ fontWeight: 700, fontSize: "clamp(14px, 1.8vw, 18px)" }}
        >
          Βυζαντινή Χορωδία Αγ. Αθανασίου <br />&amp; Ευαγγελισμού Ευόσμου
        </span>
      )}
    </div>
  );
}
