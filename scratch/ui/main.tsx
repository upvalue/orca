import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { toast } from 'sonner';
import { trpc, trpcClient } from './lib/trpc';
import { ErrorBoundary } from './components/ErrorBoundary';
import { App } from './App';
import './index.css';

/**
 * Translate tRPC/server errors into user-friendly messages.
 */
function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof TRPCClientError) {
    const code = error.data?.code;
    switch (code) {
      case 'NOT_FOUND':
        return 'The requested item was not found.';
      case 'BAD_REQUEST':
      case 'PARSE_ERROR':
        return 'Invalid request. Please check your input.';
      case 'UNAUTHORIZED':
        return 'You are not authorized to perform this action.';
      case 'FORBIDDEN':
        return 'You do not have permission for this action.';
      case 'CONFLICT':
        return 'A conflict occurred. The item may have been modified.';
      case 'INTERNAL_SERVER_ERROR':
        return 'An unexpected server error occurred. Please try again.';
      case 'TIMEOUT':
        return 'The request timed out. Please try again.';
      default:
        // Use the message if it's reasonably short, otherwise generic
        if (error.message && error.message.length < 200) {
          return error.message;
        }
        return 'An unexpected error occurred.';
    }
  }
  if (error instanceof Error) {
    if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
      return 'Unable to connect to the server. Please check your connection.';
    }
    if (error.message.length < 200) {
      return error.message;
    }
  }
  return 'An unexpected error occurred.';
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 5000,
      refetchIntervalInBackground: false,
      staleTime: 2000,
      retry: (failureCount, error) => {
        // Don't retry NOT_FOUND errors
        if (error instanceof TRPCClientError && error.data?.code === 'NOT_FOUND') {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      onError: (error) => {
        toast.error(getUserFriendlyMessage(error));
      },
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  </StrictMode>,
);
