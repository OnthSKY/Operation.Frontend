"use client";

import type { ReactNode } from "react";
import { Component } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AppShellErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("AppShell crashed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[100dvh] items-center justify-center px-4 text-sm text-zinc-600">
          Navigation unavailable. Please refresh.
        </div>
      );
    }
    return this.props.children;
  }
}
