import { useAuthStore } from "../store/useAuthStore";
import { Button } from "../components/ui/button";
import { LogOut, User, History } from "lucide-react";
import { InputPanel } from "../components/dashboard/InputPanel";
import { ResultsPanel } from "../components/dashboard/ResultsPanel";
import { InsightsPanel } from "../components/dashboard/InsightsPanel";
import { Logo } from "../components/Logo";
import "../App.css";

export function DashboardPage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <Logo />
        </div>
        
        <div className="dashboard-nav">
          <nav className="dashboard-nav">
            <a href="#" className="dash-nav-link">
              <History size={14} />
              Історія
            </a>
          </nav>
          <div className="nav-divider"></div>
          <div className="user-block">
            <div className="user-info">
              <span className="user-name">{user?.full_name || user?.email}</span>
              <span className="user-email">{user?.email}</span>
            </div>
            <div className="user-avatar">
              <User size={16} />
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={logout}
              className="logout-btn"
              title="Вийти"
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-grid">
            <div className="dashboard-column">
                <InputPanel />
            </div>

            <div className="dashboard-column results-column">
                <ResultsPanel />
            </div>

            <div className="dashboard-column">
                <InsightsPanel />
            </div>
        </div>
      </main>
    </div>
  );
}
