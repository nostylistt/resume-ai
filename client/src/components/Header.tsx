import { Button } from "./ui/button";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";


export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header className="header">
        <div className="container header-content">
          <Logo />
          
          <nav className="nav-links">
            <a href="/#how" className="nav-link">Як це працює</a>
            <a href="/#features" className="nav-link">Що входить в аналіз</a>
            <a href="/#example" className="nav-link">Приклад</a>
          </nav>
          
          <div className="header-actions">
            <Link to="/login">
              <Button variant="ghost" className="btn btn-ghost">Увійти</Button>
            </Link>
            <Link to="/register">
              <Button className="btn btn-primary">Спробувати безкоштовно</Button>
            </Link>
          </div>

          <div className="header-mobile-right">
            <button 
              className="burger-btn"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {isMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-actions">
            <Link to="/login" onClick={() => setIsMenuOpen(false)}>
              <Button variant="ghost" className="btn btn-ghost mobile-btn">Увійти</Button>
            </Link>
            <Link to="/register" onClick={() => setIsMenuOpen(false)}>
              <Button className="btn btn-primary mobile-btn">Спробувати безкоштовно</Button>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
