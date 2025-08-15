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
      <div className="content-overlay min-h-screen flex items-center">
        <div className="container mx-auto px-4 md:px-8 pt-20 md:pt-24">
          {/* Left-aligned content block */}
          <div className="max-w-4xl text-left">
            {/* Main Headline - Left Aligned */}
            <h1 className="hero-headline mb-6 md:mb-8 animate-fade-in text-left">
              <span className="text-foreground">Enterprise Fleet</span><br />
              <span className="block text-brand-primary">Management</span>
              <span className="block text-4xl md:text-6xl bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent font-bold">Revolution</span>
            </h1>
            
            {/* Subheading */}
            <p className="hero-subtext mb-8 md:mb-12 animate-fade-in text-left" style={{ animationDelay: "0.3s" }}>
              Adaptive Routing • Dynamic Passenger Pooling • Predictive Forecasting
            </p>

            {/* Call-to-Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-start gap-3 md:gap-4 mb-10 md:mb-14 animate-fade-in" style={{ animationDelay: "0.5s" }}>
              <Button variant="default" size="lg">
                Access Platform
              </Button>
              <Button variant="outline" size="lg">
                Discover More
              </Button>
            </div>

            {/* Enterprise Features - Centered */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in justify-items-center items-stretch max-w-5xl mx-auto" style={{ animationDelay: "0.7s" }}>
              <div className="bg-card/50 backdrop-blur-sm border border-card-border rounded-xl p-6 shadow-soft hover:shadow-brand transition-all duration-300 text-center">
                <div className="w-12 h-12 bg-brand-gradient rounded-lg mb-4 mx-auto flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Adaptive Routing</h3>
                <p className="text-muted-foreground text-sm">Real-time optimization algorithms for efficient fleet management</p>
              </div>

              <div className="bg-card/50 backdrop-blur-sm border border-card-border rounded-xl p-6 shadow-soft hover:shadow-brand transition-all duration-300 text-center">
                <div className="w-12 h-12 bg-brand-gradient rounded-lg mb-4 mx-auto flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Dynamic Pooling</h3>
                <p className="text-muted-foreground text-sm">Smart passenger matching for maximum efficiency and cost savings</p>
              </div>

              <div className="bg-card/50 backdrop-blur-sm border border-card-border rounded-xl p-6 shadow-soft hover:shadow-brand transition-all duration-300 text-center">
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
