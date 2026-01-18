import React, { ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  moduleName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ModuleGuard extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in module: ${this.props.moduleName}`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-black p-8 text-center border-2 border-red-900 m-4 rounded-xl relative overflow-hidden">
          {/* Glitch Overlay */}
          <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/7/76/Noise.png')] opacity-10 pointer-events-none"></div>
          
          <h2 className="text-4xl font-bold text-red-500 font-mono mb-4 tracking-tighter">MODULE FAILURE</h2>
          <div className="bg-zinc-900 p-4 rounded text-left font-mono text-xs text-red-300 max-w-lg overflow-auto mb-8 border border-red-900/50">
            {this.state.error?.toString()}
          </div>
          
          <div className="flex gap-4 z-10">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold font-mono rounded uppercase tracking-widest"
              >
                Reboot Module
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold font-mono rounded uppercase tracking-widest"
              >
                System Restart
              </button>
          </div>
          
          <p className="mt-8 text-zinc-600 font-mono text-xs uppercase">
             The Sovereign Hull remains intact. Isolate and repair.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}