import React, { Component, ErrorInfo, ReactNode } from "react";

interface ModuleGuardProps {
  children?: ReactNode;
  moduleName: string;
}

interface ModuleGuardState {
  hasError: boolean;
  error: Error | null;
}

export class ModuleGuard extends Component<ModuleGuardProps, ModuleGuardState> {
  constructor(props: ModuleGuardProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ModuleGuardState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in module: ${this.props.moduleName}`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isRegionError = this.state.error?.message?.includes("REGION_LOCKED") || this.state.error?.toString().includes("403");

      return (
        <div className={`h-full w-full flex flex-col items-center justify-center p-8 text-center border-2 m-4 rounded-xl relative overflow-hidden ${isRegionError ? 'bg-zinc-900 border-yellow-600' : 'bg-black border-red-900'}`}>
          {/* Glitch Overlay */}
          <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/7/76/Noise.png')] opacity-10 pointer-events-none"></div>
          
          <h2 className={`text-4xl font-bold font-mono mb-4 tracking-tighter ${isRegionError ? 'text-yellow-500' : 'text-red-500'}`}>
             {isRegionError ? "GEO-RESTRICTION DETECTED" : "MODULE FAILURE"}
          </h2>
          
          <div className="bg-black/50 p-6 rounded text-left font-mono text-sm max-w-lg overflow-auto mb-8 border border-white/10">
            {isRegionError ? (
                <div className="text-zinc-300">
                    <p className="mb-4 font-bold text-yellow-500">ACCESS DENIED: 403 Forbidden</p>
                    <p>The AI Model requested by this module is currently geofenced and unavailable in your region (e.g., EU/UK/Canada).</p>
                    <p className="mt-4 text-xs text-zinc-500">ERROR: {this.state.error?.message}</p>
                </div>
            ) : (
                <div className="text-red-300">
                    {this.state.error?.toString()}
                </div>
            )}
          </div>
          
          <div className="flex gap-4 z-10">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className={`px-6 py-3 text-white font-bold font-mono rounded uppercase tracking-widest ${isRegionError ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-red-600 hover:bg-red-500'}`}
              >
                {isRegionError ? 'Retry Connection' : 'Reboot Module'}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold font-mono rounded uppercase tracking-widest"
              >
                System Restart
              </button>
          </div>
          
          <p className="mt-8 text-zinc-600 font-mono text-xs uppercase">
             {isRegionError ? "Secure Uplink Required (Check VPN/Region)" : "The Sovereign Hull remains intact. Isolate and repair."}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}