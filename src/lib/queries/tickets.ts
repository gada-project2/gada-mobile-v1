import { useQuery } from "@tanstack/react-query";

import {
  getMyTickets,
  getPaymentHistory,
  getTicket,
  type MyTicketsTab,
} from "../api/tickets";
import { ticketKeys } from "./keys";

export function useMyTickets(tab: MyTicketsTab) {
  return useQuery({
    queryKey: ticketKeys.my(tab),
    queryFn: () => getMyTickets(tab),
  });
}

export function useTicket(purchaseId: string | undefined) {
  return useQuery({
    queryKey: ticketKeys.detail(purchaseId ?? ""),
    queryFn: () => getTicket(purchaseId as string),
    enabled: !!purchaseId,
  });
}

export function usePaymentHistory() {
  return useQuery({
    queryKey: ticketKeys.paymentHistory(),
    queryFn: getPaymentHistory,
  });
}
