import { useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useRef, useState } from "react";

import { ApiError } from "../api/client";
import { initiatePaidPurchase, verifyPayment } from "../api/tickets";
import { ticketKeys } from "../queries/keys";

// Mobile paid flow (differs from web — no return URL): open the gateway in an
// in-app browser; when it's dismissed, poll verify. The webhook is the source
// of truth, so we NEVER assume success just because the browser closed.
export type CheckoutPhase =
  | "idle"
  | "initiating" // creating the payment
  | "awaiting-payment" // gateway browser is open
  | "confirming" // polling verify
  | "success"
  | "failed"
  | "pending-timeout" // still processing after max tries
  | "error";

export type CheckoutResult = "success" | "failed" | "pending" | "error";

export interface CheckoutState {
  phase: CheckoutPhase;
  attempt: number;
  maxAttempts: number;
  reference?: string;
  error?: string;
}

const POLL_INTERVAL_MS = 3000;
const MAX_TRIES = 20;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function friendlyError(err: unknown): string {
  if (err instanceof ApiError) return err.message || "We couldn't start the payment.";
  return "Network error. Please check your connection and try again.";
}

export function usePaidCheckout() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<CheckoutState>({
    phase: "idle",
    attempt: 0,
    maxAttempts: MAX_TRIES,
  });
  const running = useRef(false);

  const reset = useCallback(
    () => setState({ phase: "idle", attempt: 0, maxAttempts: MAX_TRIES }),
    [],
  );

  const start = useCallback(
    async (gadaringId: string, ticketId: string, quantity = 1): Promise<CheckoutResult> => {
      if (running.current) return "pending";
      running.current = true;
      try {
        setState({ phase: "initiating", attempt: 0, maxAttempts: MAX_TRIES });
        const init = await initiatePaidPurchase(gadaringId, ticketId, quantity);

        setState({
          phase: "awaiting-payment",
          attempt: 0,
          maxAttempts: MAX_TRIES,
          reference: init.reference,
        });

        // Resolves when the user closes the in-app browser.
        await WebBrowser.openBrowserAsync(init.paymentUrl);

        setState((s) => ({ ...s, phase: "confirming", attempt: 0 }));
        for (let i = 1; i <= MAX_TRIES; i++) {
          setState((s) => ({ ...s, attempt: i }));
          try {
            const res = await verifyPayment(init.reference);
            if (res.status === "SUCCESS") {
              await queryClient.invalidateQueries({ queryKey: ticketKeys.all });
              await queryClient.invalidateQueries({ queryKey: ticketKeys.paymentHistory() });
              setState((s) => ({ ...s, phase: "success" }));
              return "success";
            }
            if (res.status === "FAILED") {
              setState((s) => ({ ...s, phase: "failed" }));
              return "failed";
            }
            // PENDING → keep polling.
          } catch {
            // Transient verify error → keep polling until the cap.
          }
          if (i < MAX_TRIES) await sleep(POLL_INTERVAL_MS);
        }

        setState((s) => ({ ...s, phase: "pending-timeout" }));
        return "pending";
      } catch (err) {
        setState({
          phase: "error",
          attempt: 0,
          maxAttempts: MAX_TRIES,
          error: friendlyError(err),
        });
        return "error";
      } finally {
        running.current = false;
      }
    },
    [queryClient],
  );

  return { state, start, reset };
}
