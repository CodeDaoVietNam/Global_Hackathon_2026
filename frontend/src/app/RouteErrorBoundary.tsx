import React from "react";
import { useRouteError, Link } from "react-router-dom";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export const RouteErrorBoundary: React.FC = () => {
  const error: any = useRouteError();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Something unexpected occurred</h2>
        <p className="text-xs text-slate-500 mb-6">
          {error?.statusText || error?.message || "An unexpected navigation error occurred."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
};
