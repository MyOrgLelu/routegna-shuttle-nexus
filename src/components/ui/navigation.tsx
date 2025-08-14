import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export const Navigation = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="container mx-auto px-4 md:px-8 py-4 md:py-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="brand-logo text-2xl md:text-3xl font-bold tracking-wider">
              Routegna
            </h1>
          </div>

          {/* Theme Toggle */}
          <button
            aria-label="Toggle dark mode"
            className="h-10 w-10 rounded-xl flex items-center justify-center bg-accent hover:bg-accent/80 text-foreground transition-colors"
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </nav>
  );
};