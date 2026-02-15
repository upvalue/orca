import { Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TicketListPage } from '@/pages/TicketListPage';
import { TicketDetailPage } from '@/pages/TicketDetailPage';
import { TicketCreatePage } from '@/pages/TicketCreatePage';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function App() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Toaster position="bottom-right" richColors closeButton />
      <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-bold">Scratch</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">Tickets</Link>
            </Button>
          </nav>

          {/* Mobile menu button */}
          <button
            className="sm:hidden p-2 rounded-md hover:bg-[var(--accent)] transition-colors"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Toggle menu"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav dropdown */}
        {mobileNavOpen && (
          <div className="sm:hidden border-t border-[var(--border)] bg-[var(--background)] px-4 py-2">
            <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
              <Link to="/">Tickets</Link>
            </Button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route
            path="/"
            element={
              <ErrorBoundary inline>
                <TicketListPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="/tickets/new"
            element={
              <ErrorBoundary inline>
                <TicketCreatePage />
              </ErrorBoundary>
            }
          />
          <Route
            path="/tickets/:id"
            element={
              <ErrorBoundary inline>
                <TicketDetailPage />
              </ErrorBoundary>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
