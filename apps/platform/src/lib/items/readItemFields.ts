/*
 *   Reads the item fields from the create/edit item form, or returns an
 *   error message to show.
 **/
export function readItemFields(form: HTMLFormElement):
  | {
      fields: {
        name: string;
        description: string | null;
        containsList: string[];
        calories: number | null;
        price: number;
        isAvailable: boolean;
      };
    }
  | { error: string } {
  const formData = new FormData(form);

  const name = formData.get("name");
  const description = formData.get("description");
  const containsList = formData.get("containsList");
  const calories = formData.get("calories");
  const price = formData.get("price");

  const fields = {
    name: typeof name === "string" ? name.trim() : "",
    description:
      typeof description === "string" && description.trim()
        ? description.trim()
        : null,
    // "pepper, salt" → ["Pepper", "Salt"]
    containsList:
      typeof containsList === "string" && containsList.trim()
        ? containsList
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean)
            .map((entry) => entry.charAt(0).toUpperCase() + entry.slice(1))
        : [],
    calories:
      typeof calories === "string" && calories !== "" ? Number(calories) : null,
    price: typeof price === "string" && price !== "" ? Number(price) : NaN,
    isAvailable: formData.get("isAvailable") !== null,
  };

  if (!fields.name) return { error: "An item name is required." };

  if (Number.isNaN(fields.price))
    return { error: "An item price is required." };

  return { fields };
}
