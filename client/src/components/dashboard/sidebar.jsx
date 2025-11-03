import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { LayoutDashboard, CheckSquare, Network, Users, Sparkles, Settings, LogOut, CheckCircle, BarChart, Airplay, LayoutDashboardIcon, Target, Monitor, DollarSign, Calendar, Clock, UserCog, UserCheck, ShoppingCart, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../../context/auth-context";

export function DashboardSidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const baseRoutes = [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "Tasks", href: "/tasks", icon: CheckSquare },
    { title: "Dependencies", href: "/dependencies", icon: Network },
    { title: "Departments", href: "/departments", icon: Users },
    { title: "AI Optimization", href: "/optimization", icon: Sparkles },
     { title: "All Aims", href: "/all-aims", icon: Target },
    { title: "Completed Tasks", href: "/completedtask", icon: CheckCircle },
     { title: "Leaderboard", href: "/leaderboard", icon: Sparkles },
  ];

  // Admin-only routes
  const adminRoutes = [
    { title: "Employee Monitoring", href: "/monitoring", icon: Monitor },
    { title: "User Management", href: "/user-management", icon: UserCog },
    { title: "Live Attendance", href: "/attendance-dashboard", icon: UserCheck },
    { title: "Attendance Analytics", href: "/attendance-analytics", icon: Clock },
    { title: "Salary Management", href: "/salary-management", icon: DollarSign },
    { title: "Individual Salaries", href: "/individual-salary-management", icon: UserCog },
    { title: "Procurement Dashboard", href: "/procurement-dashboard", icon: ShoppingCart },
    { title: "EMS Dashboard", href: "/ems-dashboard", icon: Mail },
  ];

  // Procurement Agent routes
  const procurementRoutes = [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "Procurement Dashboard", href: "/procurement-dashboard", icon: ShoppingCart },
    { title: "Tasks", href: "/tasks", icon: CheckSquare },
    { title: "All Aims", href: "/all-aims", icon: Target },
    { title: "Completed Tasks", href: "/completedtask", icon: CheckCircle },
    { title: "Leaderboard", href: "/leaderboard", icon: Sparkles },
  ];

  // User-specific routes
  const userRoutes = [
    { title: "Dashboard", href: "/userdashboard", icon: LayoutDashboardIcon },
    { title: "Progress", href: "/progress", icon: BarChart },
    { title: "Set Aims", href: "/aims", icon: Airplay },
    // { title: "Leave Requests", href: "/leave-request", icon: Calendar },
    { title: "Leaderboard", href: "/leaderboard", icon: Sparkles },
  ];

  // Determine which routes to show based on user role
  let renderRoutes;
  if (user?.role === "User") {
    renderRoutes = userRoutes;
  } else if (user?.role === "Admin") {
    renderRoutes = [...baseRoutes, ...adminRoutes];
  } else if (user?.role === "Procurement Agent") {
    renderRoutes = procurementRoutes;
  } else {
    renderRoutes = baseRoutes; // For other roles like Manager, etc.
  }

  return (
    <aside className={`h-screen flex flex-col bg-card/95 backdrop-blur-sm border-r border-border shadow-xl transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Premium Header with Logo & Toggle */}
      <div className="border-b border-border bg-gradient-to-br from-card to-card/50 relative flex-shrink-0">
        <div className={`flex items-center justify-between py-4 relative z-10 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <div className="relative group">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-glow-primary transition-all duration-300 group-hover:scale-110 group-hover:rotate-12">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            {!isCollapsed && (
              <span className="text-xl font-heading font-bold tracking-tight text-foreground transition-opacity duration-300">
                Infiverse
              </span>
            )}
          </div>
          
          {/* Collapse Toggle Button - Desktop Only */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground items-center justify-center shadow-lg hover:scale-110 hover:shadow-glow-primary transition-all duration-300 z-20 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Navigation Section - Scrollable */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent hover:scrollbar-thumb-border">
        <div className={`${isCollapsed ? 'p-2' : 'p-4'} space-y-6`}>
          {/* Main Navigation */}
          <div>
            {!isCollapsed && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                Navigation
              </h3>
            )}
            <div className="space-y-1">
              {renderRoutes.map((route) => {
                const isActive = location.pathname === route.href;
                return (
                  <Link
                    key={route.href}
                    to={route.href}
                    className={`group flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-3 rounded-lg text-sm font-medium transition-all duration-300 relative overflow-hidden ${
                      isActive
                        ? "gradient-primary text-primary-foreground shadow-glow-primary"
                        : "hover:bg-primary/5 hover:text-primary text-foreground/70"
                    }`}
                    title={isCollapsed ? route.title : undefined}
                  >
                    {/* Active indicator */}
                    {isActive && !isCollapsed && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-foreground rounded-r-full"></div>
                    )}

                    {/* Icon Container */}
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 flex-shrink-0 ${
                      isActive
                        ? 'bg-primary-foreground/20'
                        : 'bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110'
                    }`}>
                      <route.icon className="h-4 w-4" />
                    </div>

                    {/* Text Label */}
                    {!isCollapsed && (
                      <span className="flex-1 truncate transition-opacity duration-300">
                        {route.title}
                      </span>
                    )}

                    {/* Hover tooltip for collapsed state */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50">
                        {route.title}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Workspace Section - Hidden when collapsed */}
          {!isCollapsed && (
            <div className="pt-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                Workspace
              </h3>
              <div className="px-3 py-3 rounded-xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10 hover:border-primary/20 transition-colors duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                    <svg className="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">Default Workspace</div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Footer Section - User Profile & Settings */}
      <footer className={`border-t border-border ${isCollapsed ? 'p-2' : 'p-4'} bg-gradient-to-br from-card to-card/50 flex-shrink-0`}>
        <div className="space-y-2">
          {/* Settings Link */}
          <Link
            to="/settings"
            className={`group flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2 rounded-lg text-sm font-medium hover:bg-primary/5 hover:text-primary text-foreground/70 transition-all duration-300`}
            title={isCollapsed ? "Settings" : undefined}
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <Settings className="h-4 w-4" />
            </div>
            {!isCollapsed && <span className="flex-1">Settings</span>}
            
            {/* Tooltip for collapsed */}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50">
                Settings
              </div>
            )}
          </Link>

          {/* User Profile Card */}
          <div className={`${isCollapsed ? 'p-2' : 'p-3'} rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 shadow-lg`}>
            {isCollapsed ? (
              /* Collapsed User Avatar */
              <div className="relative group">
                <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground font-heading font-semibold shadow-glow-primary cursor-pointer">
                  {user?.name?.charAt(0) || "U"}
                </div>
                
                {/* User Info Tooltip */}
                <div className="absolute left-full ml-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50 bottom-0">
                  <div className="font-semibold">{user?.name || "User"}</div>
                  <div className="text-muted-foreground">{user?.role || "User"}</div>
                </div>
              </div>
            ) : (
              /* Expanded User Profile */
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground font-heading font-semibold shadow-glow-primary flex-shrink-0">
                    {user?.name?.charAt(0) || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{user?.name || "User"}</div>
                    <div className="text-xs text-muted-foreground truncate">{user?.role || "User"}</div>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-300 hover:shadow-lg hover:scale-105"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </>
            )}
            
            {/* Collapsed Sign Out Button */}
            {isCollapsed && (
              <button
                onClick={logout}
                className="w-full flex items-center justify-center mt-2 p-2 rounded-lg text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-300 group relative"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
                
                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50">
                  Sign Out
                </div>
              </button>
            )}
          </div>
        </div>
      </footer>
    </aside>
  );
}