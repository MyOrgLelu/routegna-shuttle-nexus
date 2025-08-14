export const Navigation = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="container mx-auto px-8 py-6">
        <div className="flex items-center">
          {/* Logo Only */}
          <div className="flex items-center">
            <h1 className="brand-logo text-3xl font-bold tracking-wider">
              Routegna
            </h1>
          </div>
        </div>
      </div>
    </nav>
  );
};