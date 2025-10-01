import { useRouteError } from 'react-router-dom';
import { Button } from './button';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { AlertCircle } from 'lucide-react';

export function ErrorBoundary() {
  const error = useRouteError() as any;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error?.statusText || error?.message || 'Something went wrong'}
          </AlertDescription>
        </Alert>
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}