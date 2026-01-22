import * as React from "react";
import { cn } from "@/lib/utils";
import { Bell, Settings, User, Menu, X, Home, FileText, Camera, Shield, FlaskConical, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ModernDashboardLayoutProps {
    children: React.ReactNode;
    title?: string;
    showSidebar?: boolean;
    notificationCount?: number;
    headerContent?: React.ReactNode;
}

const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/records", label: "Records", icon: FileText },
    { path: "/camera-settings", label: "Camera", icon: Camera },
];

export function ModernDashboardLayout({
    children,
    title,
    showSidebar = false,
    notificationCount = 0,
    headerContent,
}: ModernDashboardLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [isScrolled, setIsScrolled] = React.useState(false);

    // Handle scroll effect for sticky header
    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleSignOut = () => {
        navigate("/");
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Top Navigation Bar */}
            <header
                className={cn(
                    "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                    isScrolled
                        ? "bg-nav/95 backdrop-blur-md shadow-nav"
                        : "bg-nav"
                )}
            >
                <div className="container-dashboard">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-4">
                            <button
                                className="lg:hidden p-2 text-nav-foreground hover:bg-nav-hover rounded-lg transition-colors"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            >
                                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>

                            <div
                                className="flex items-center gap-3 cursor-pointer"
                                onClick={() => navigate("/dashboard")}
                            >
                                <img
                                    src="/Embsys%20Intelligence%20logo.png"
                                    alt="Embsys Intelligence"
                                    className="h-10 w-auto brightness-0 invert"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />

                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden lg:flex items-center gap-1">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <button
                                        key={item.path}
                                        onClick={() => navigate(item.path)}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                            isActive
                                                ? "bg-nav-accent text-nav-accent-foreground shadow-sm"
                                                : "text-nav-foreground/80 hover:text-nav-foreground hover:bg-nav-hover"
                                        )}
                                    >
                                        <item.icon className="w-4 h-4" />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2">
                            {/* Notification Bell */}
                            <button className="relative p-2 text-nav-foreground hover:bg-nav-hover rounded-lg transition-colors">
                                <Bell className="w-5 h-5" />
                                {notificationCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-secondary text-secondary-foreground rounded-full badge-notify">
                                        {notificationCount > 9 ? "9+" : notificationCount}
                                    </span>
                                )}
                            </button>

                            {/* Settings */}
                            <button
                                className="p-2 text-nav-foreground hover:bg-nav-hover rounded-lg transition-colors"
                                onClick={() => navigate("/camera-settings")}
                            >
                                <Settings className="w-5 h-5" />
                            </button>

                            {/* User Menu */}
                            <div className="hidden sm:flex items-center gap-3 ml-2 pl-3 border-l border-nav-foreground/20">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground font-semibold text-sm">
                                    A
                                </div>
                                <span className="text-nav-foreground text-sm font-medium">Appraiser</span>
                            </div>

                            {/* Sign Out */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSignOut}
                                className="hidden sm:flex text-nav-foreground hover:bg-nav-hover hover:text-nav-foreground gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden md:inline">Sign Out</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="lg:hidden bg-nav border-t border-nav-foreground/10">
                        <div className="container-dashboard py-4 space-y-2">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <button
                                        key={item.path}
                                        onClick={() => {
                                            navigate(item.path);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={cn(
                                            "flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-all",
                                            isActive
                                                ? "bg-nav-accent text-nav-accent-foreground"
                                                : "text-nav-foreground/80 hover:text-nav-foreground hover:bg-nav-hover"
                                        )}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        {item.label}
                                    </button>
                                );
                            })}
                            <button
                                onClick={handleSignOut}
                                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-nav-foreground/80 hover:text-nav-foreground hover:bg-nav-hover transition-all"
                            >
                                <LogOut className="w-5 h-5" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="pt-16">
                {headerContent ? (
                    <div className="bg-gradient-to-b from-muted/50 to-background border-b border-border/50">
                        <div className="container-dashboard py-2">
                            {headerContent}
                        </div>
                    </div>
                ) : title && (
                    <div className="bg-gradient-to-b from-muted/50 to-background border-b border-border/50">
                        <div className="container-dashboard py-6">
                            <h1 className="text-2xl font-bold text-foreground font-poppins">{title}</h1>
                        </div>
                    </div>
                )}
                <div className="container-dashboard py-6">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default ModernDashboardLayout;
