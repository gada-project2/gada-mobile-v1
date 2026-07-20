import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { listGadarings } from "../api/gadarings";
import { getMyTickets } from "../api/tickets";
import type { Gadaring, Purchase } from "../api/types";
import { applicationGadaringId, getMyVolunteerApplications } from "../api/volunteers";
import { gadaringKeys, ticketKeys, volunteerKeys } from "./keys";

/** A user's relationship to an event, used for calendar colour-coding. */
export type EventRelationship = "attending" | "volunteering" | "neutral";

function purchaseGadaringId(p: Purchase): string | undefined {
  return p.gadaringId ?? p.gadaring?.id;
}

/** Events whose start falls within [dateFrom, dateTo]. Enabled only when the calendar is open. */
export function useCalendarEvents(
  range: { dateFrom: string; dateTo: string },
  enabled: boolean,
) {
  return useQuery({
    queryKey: gadaringKeys.calendar(range),
    queryFn: () =>
      listGadarings({ dateFrom: range.dateFrom, dateTo: range.dateTo, perPage: 100 }),
    enabled,
    select: (page): Gadaring[] => page.items,
  });
}

/**
 * Builds a map of gadaringId -> relationship from the user's own data:
 * holds a ticket -> attending; has a volunteer application -> volunteering.
 * Attending wins if both are true. Fetched once and cached; enabled with the panel.
 *
 * NOTE: "interested" (red) / "invited" (yellow) from the product spec are NOT
 * derivable — the API exposes no RSVP/invite state — so they're omitted. TODO:
 * add them once an interest/invite endpoint exists.
 */
export function useEventRelationships(enabled: boolean) {
  const upcoming = useQuery({
    queryKey: ticketKeys.my("upcoming"),
    queryFn: () => getMyTickets("upcoming"),
    enabled,
  });
  const past = useQuery({
    queryKey: ticketKeys.my("past"),
    queryFn: () => getMyTickets("past"),
    enabled,
  });
  const applications = useQuery({
    queryKey: volunteerKeys.myApplications(),
    queryFn: getMyVolunteerApplications,
    enabled,
  });

  const relationshipOf = useMemo(() => {
    const attending = new Set<string>();
    const volunteering = new Set<string>();
    for (const p of [...(upcoming.data ?? []), ...(past.data ?? [])]) {
      const id = purchaseGadaringId(p);
      if (id) attending.add(id);
    }
    for (const a of applications.data ?? []) {
      const id = applicationGadaringId(a);
      if (id) volunteering.add(id);
    }
    return (gadaringId: string): EventRelationship =>
      attending.has(gadaringId)
        ? "attending"
        : volunteering.has(gadaringId)
          ? "volunteering"
          : "neutral";
  }, [upcoming.data, past.data, applications.data]);

  return {
    relationshipOf,
    loading: upcoming.isLoading || past.isLoading || applications.isLoading,
  };
}
