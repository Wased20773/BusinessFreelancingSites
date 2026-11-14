import axios from "axios";

/*
 *   When a request fails because of the plan (code "PLAN_LIMIT"), adds a
 *   "Go to Billing" button to the error toast. Spread it into the toast's
 *   error result: { message, description, ...planLimitAction(error, businessId) }
 **/
export function planLimitAction(error: unknown, businessId: string) {
  if (
    axios.isAxiosError<{ code?: string }>(error) &&
    error.response?.data?.code === "PLAN_LIMIT"
  ) {
    return {
      action: {
        label: "Go to Billing",
        onClick: () =>
          window.location.assign(`/businesses/${businessId}/billing`),
      },
    };
  }

  return {};
}
