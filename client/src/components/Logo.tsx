import { FileBadge2 } from "lucide-react";
import { Link } from "react-router-dom";

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = "", size = 24 }: LogoProps) {
  return (
    <Link to="/" className={`logo ${className}`}>
      <FileBadge2 className="logo-icon" size={size} />
      <span>Resu<span className="logo-highlight">match</span></span>
    </Link>
  );
}
