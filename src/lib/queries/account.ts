import { useQuery } from "@tanstack/react-query";

import { getPrivacy, getVolunteerProfile } from "../api/account";
import { accountKeys } from "./keys";

export function useVolunteerProfile() {
  return useQuery({
    queryKey: accountKeys.volunteerProfile(),
    queryFn: getVolunteerProfile,
  });
}

export function usePrivacy() {
  return useQuery({
    queryKey: accountKeys.privacy(),
    queryFn: getPrivacy,
  });
}
