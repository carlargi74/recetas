import type { CSSProperties } from "react";

interface IconProps {
  className?: string;
  style?: CSSProperties;
}

function svgProps(className?: string, style?: CSSProperties) {
  return {
    className,
    style,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

export function LogoIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" fill="#c8502e" />
      <circle cx="24" cy="24" r="13" fill="#faf6ef" />
      <circle cx="24" cy="24" r="7" fill="#f0b429" />
      <path d="M10 6v9M13 6v9M11.5 6v14" stroke="#faf6ef" strokeWidth="2" strokeLinecap="round" />
      <path d="M37 6c-2.5 1-3.5 3-3.5 6v8" stroke="#faf6ef" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function SearchIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function ClockIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function ServingsIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function FlameIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

export function PlusIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ShareIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

export function DownloadIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

export function TrashIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  );
}

export function EditIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

export function BackIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <path d="m12 19-7-7 7-7M5 12h14" />
    </svg>
  );
}

export function LinkIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function BasketIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <path d="m5 11 4-7M19 11l-4-7M2 11h20l-1.6 7.4a2 2 0 0 1-2 1.6H5.6a2 2 0 0 1-2-1.6Z" />
      <path d="M9 15v2M15 15v2" />
    </svg>
  );
}

export function ChefHatIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
      <path d="M6 17h12" />
    </svg>
  );
}

export function LightbulbIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <path d="M9 18h6M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5" />
    </svg>
  );
}

export function VideoIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  );
}

export function LogoutIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function DishIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

export function CalendarIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function UserIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  );
}

export function BookIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}

export function PrintIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

export function LeafIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

export function CopyIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

export function CheckIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function RetryIcon({ className, style }: IconProps) {
  return (
    <svg {...svgProps(className, style)}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
