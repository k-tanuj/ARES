import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ShieldAlert, Compass, Users, GitFork, CheckSquare, FileText } from "lucide-react";

interface NavbarProps {
  activeEventId?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ activeEventId }) => {
  const location = useLocation();
  
  const navItems = [
    { name: "Mission Control", path: "/dashboard", icon: Compass },
    { name: "Disruptions", path: "/history", icon: ShieldAlert },
    { name: "Suppliers", path: "/supplier", icon: Users },
    { name: "Scenarios", path: activeEventId ? `/scenarios/${activeEventId}` : "/dashboard", icon: GitFork, disabled: !activeEventId },
    { name: "Decisions", path: activeEventId ? `/decisions/${activeEventId}` : "/dashboard", icon: CheckSquare, disabled: !activeEventId },
    { name: "Audit Trail", path: activeEventId ? `/audit/${activeEventId}` : "/dashboard", icon: FileText, disabled: !activeEventId },
  ];

  return (
    <header className="border-b border-navy-700 bg-navy-900/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-wider text-offwhite-50">ARES</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-navy-700 text-offwhite-300 tracking-widest uppercase">RESILIENCE</span>
            </Link>
          </div>
          
          {/* Nav Links */}
          <nav className="flex space-x-1 sm:space-x-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path) && item.path !== "/dashboard" || (location.pathname === "/dashboard" && item.path === "/dashboard");
              
              if (item.disabled) {
                return (
                  <span
                    key={item.name}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-navy-600 cursor-not-allowed select-none"
                    title="Select a disruption event to unlock this analysis page"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden md:inline">{item.name}</span>
                  </span>
                );
              }
              
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-navy-800 text-offwhite-50 border border-navy-600"
                      : "text-offwhite-300 hover:text-offwhite-50 hover:bg-navy-800/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
