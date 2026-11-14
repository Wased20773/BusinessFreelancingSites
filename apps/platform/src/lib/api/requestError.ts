import axios from "axios";

/*
 *   The error option for toast.promise: shows the API's error message,
 *   or the status code when there is none.
 **/
export function requestError(failedMessage: string) {
  return (error: unknown) => {
    if (axios.isAxiosError<{ error?: string }>(error)) {
      return {
        message: failedMessage,
        description:
          error.response?.data?.error ??
          `Status code: ${error.response?.status ?? "No response"}`,
      };
    }

    return {
      message: "Unexpected error.",
      description: "Something went wrong, please try again.",
    };
  };
}
