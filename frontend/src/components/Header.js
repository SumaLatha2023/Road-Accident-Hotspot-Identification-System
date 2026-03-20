import { NavLink } from "react-router-dom";
import "./Header.css";

const navItems = [
  { to: "/",         label: "Home"     },
  { to: "/map",      label: "Live Map" },
  { to: "/analysis", label: "Analysis" },
  { to: "/about",    label: "About"    },
];

export default function Header() {
  return (
    <header className="header">
      {/* Logo */}
      <NavLink to="/" className="logo">
        <span className="logo-text">
          Spot<span className="logo-accent">Safe</span>
        </span>
      </NavLink>

      {/* Nav */}
      <nav className="nav">
        {navItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              "nav-link" + (isActive ? " nav-link--active" : "")
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* CTA */}
      <NavLink to="/map" className="header-cta">
        Explore Map →
      </NavLink>
    </header>
  );
}