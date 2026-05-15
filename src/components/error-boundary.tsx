"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type ErrorBoundaryProps = {
  children: ReactNode;
  title?: string;
  onReset?: () => void;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  private handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-[1.35rem] border border-border/60 bg-card/50 px-6 py-10 text-center dark:border-white/10 dark:bg-white/[0.03]">
          <p className="font-heading text-lg font-semibold text-foreground">
            {this.props.title ?? "Something went wrong"}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This section hit an unexpected error. You can try again without leaving the app.
          </p>
          {process.env.NODE_ENV !== "production" && (
            <p className="max-w-full truncate text-xs text-muted-foreground/80">{this.state.error.message}</p>
          )}
          <Button type="button" className="rounded-full" onClick={this.handleReset}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
