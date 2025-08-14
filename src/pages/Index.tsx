import { ShuttleNetwork3D } from "@/components/ShuttleNetwork3D";
import { Navigation } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Navigation */}
      <Navigation />

      {/* 3D Background Scene */}
      <ShuttleNetwork3D />

      {/* Content Overlay */}
      <div className="content-overlay min-h-screen flex items-center justify-center">
        <div className="container mx-auto px-6 pt-20">
          <div className="text-center max-w-4xl mx-auto">
            {/* Main Headline */}
            <h1 className="hero-headline mb-6 animate-fade-in">
              An Enterprise Cloud Fleet Management Platform
            </h1>
            
            {/* Subheading */}
            <p className="hero-subtext mb-8 mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
              with Adaptive Routing, Dynamic Passenger Pooling & Predictive Forecasting
            </p>

            {/* Call-to-Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <Button variant="hero" size="hero" className="w-full sm:w-auto">
                Login
              </Button>
              <Button variant="outline" size="hero" className="w-full sm:w-auto">
                Learn More
              </Button>
            </div>

            {/* Enterprise Features */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in" style={{ animationDelay: "0.6s" }}>
              <div className="bg-card/50 backdrop-blur-sm border border-card-border rounded-xl p-6 shadow-soft hover:shadow-brand transition-all duration-300">
                <div className="w-12 h-12 bg-brand-gradient rounded-lg mb-4 mx-auto flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Adaptive Routing</h3>
                <p className="text-muted-foreground text-sm">Real-time optimization algorithms for efficient fleet management</p>
              </div>

              <div className="bg-card/50 backdrop-blur-sm border border-card-border rounded-xl p-6 shadow-soft hover:shadow-brand transition-all duration-300">
                <div className="w-12 h-12 bg-brand-gradient rounded-lg mb-4 mx-auto flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Dynamic Pooling</h3>
                <p className="text-muted-foreground text-sm">Smart passenger matching for maximum efficiency and cost savings</p>
              </div>

              <div className="bg-card/50 backdrop-blur-sm border border-card-border rounded-xl p-6 shadow-soft hover:shadow-brand transition-all duration-300">
                <div className="w-12 h-12 bg-brand-gradient rounded-lg mb-4 mx-auto flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Predictive Analytics</h3>
                <p className="text-muted-foreground text-sm">AI-powered forecasting for proactive fleet optimization</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
