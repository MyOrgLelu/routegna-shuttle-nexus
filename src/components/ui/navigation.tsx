import { Button } from "./button";

export const Navigation = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="brand-logo text-2xl font-bold">
              Routegna
            </h1>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#home" className="nav-link">
              Home
            </a>
            <a href="#about" className="nav-link">
              About Us
            </a>
            <a href="#contact" className="nav-link">
              Contact Us
            </a>
          </div>

          {/* Login Button */}
          <div className="flex items-center">
            <Button variant="outline" size="sm" className="mr-3">
              Learn More
            </Button>
            <Button variant="default" size="sm">
              Login
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};