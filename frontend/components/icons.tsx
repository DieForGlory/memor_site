import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const ArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
export const ArrowLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Svg>
);
export const ArrowUpRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 17 17 7M8 7h9v9" />
  </Svg>
);
export const ChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);
export const Close = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
export const Menu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </Svg>
);
export const Phone = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </Svg>
);
export const Mail = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Svg>
);
export const Pin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z" />
    <circle cx="12" cy="9" r="2.5" />
  </Svg>
);
export const Clock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);
export const Check = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12 5 5L20 7" />
  </Svg>
);
export const Grid = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
  </Svg>
);
export const MapIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
    <path d="M9 4v14M15 6v14" />
  </Svg>
);
export const Camera = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </Svg>
);
export const Telegram = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 4 3 11l6 2 2 6 3-4 5 4 2-15Z" />
    <path d="m9 13 8-6" />
  </Svg>
);
export const Instagram = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
  </Svg>
);
export const Facebook = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8Z" />
  </Svg>
);
export const Youtube = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
    <path d="m10 9 5 3-5 3V9Z" />
  </Svg>
);

/* Иконки услуг: ключ совпадает с полем icon в базе. */
const serviceIcons: Record<string, (p: IconProps) => React.ReactNode> = {
  design: (p) => (
    <Svg {...p}>
      <path d="M3 21h18M5 21V9l7-5 7 5v12" />
      <path d="M9 21v-6h6v6M3 9h18" />
    </Svg>
  ),
  crane: (p) => (
    <Svg {...p}>
      <path d="M6 21V4h2v17M3 21h8M7 4h13l-4 3M8 7h12" />
      <path d="M17 7v4M15.5 11h3v2.5h-3z" />
    </Svg>
  ),
  excavator: (p) => (
    <Svg {...p}>
      <path d="M3 17h11M4 17v-4h8l1-4h-3" />
      <rect x="3" y="17" width="12" height="3" rx="1.5" />
      <path d="M12 9l5-5 4 4-2 2M19 10l1 4-3 1" />
    </Svg>
  ),
  network: (p) => (
    <Svg {...p}>
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="12" cy="18" r="2" />
      <path d="M7 6h10M6 8l5 8M18 8l-5 8M12 4v12" />
    </Svg>
  ),
  roller: (p) => (
    <Svg {...p}>
      <rect x="3" y="3" width="15" height="5" rx="1.5" />
      <path d="M18 5.5h2.5V11H12v3" />
      <rect x="10.5" y="14" width="3" height="7" rx="1" />
    </Svg>
  ),
  facade: (p) => (
    <Svg {...p}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M4 9h16M4 15h16M10 3v18M14 3v18" />
    </Svg>
  ),
  tree: (p) => (
    <Svg {...p}>
      <path d="M12 21v-6M7 15h10l-3-4h2l-4-7-4 7h2l-3 4Z" />
      <path d="M4 21h16" />
    </Svg>
  ),
};

export function ServiceIcon({ name, ...rest }: IconProps & { name: string }) {
  const Icon = serviceIcons[name] ?? serviceIcons.crane;
  return <>{Icon(rest)}</>;
}
