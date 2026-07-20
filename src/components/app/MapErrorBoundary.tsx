import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Shown in place of the map subtree if it throws while rendering. */
  fallback: ReactNode;
  /** Optional hook for logging/telemetry (never throw from here). */
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render/runtime errors thrown by the native map subtree so a maps
 * failure degrades to a fallback view instead of taking down the whole app —
 * e.g. the Google Maps SDK failing to initialise on an Android release build
 * with a missing/invalid API key.
 *
 * Caveat: a React error boundary only catches JS-level errors. A hard *native*
 * crash inside react-native-maps cannot be caught here, which is why supplying
 * the Android Maps API key (see app.config.js) is the real fix; this boundary
 * is defence-in-depth for the cases that do surface as JS errors.
 */
export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
