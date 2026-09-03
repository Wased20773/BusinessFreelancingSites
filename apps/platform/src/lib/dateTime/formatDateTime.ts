type DateTimeVariant = "date" | "time" | "date-time" | "short";

export function formatDateTime(
  dateTime: string,
  variant: DateTimeVariant = "date",
) {
  const date = new Date(dateTime);

  switch (variant) {
    case "date":
      return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(date);

    case "time":
      return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }).format(date);

    case "date-time":
      return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);

    case "short":
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
  }
}
