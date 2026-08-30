import axios from "axios";

export type ReorderContext = "category" | "item" | "itemOption";
export type ReorderDirection = "up" | "down";

type MoveBaseParams = {
  businessId: string;
  locationId: string;
  direction: ReorderDirection;
};

type MoveCategoryParams = MoveBaseParams & {
  context: "category";
  categoryId: string;
};

type MoveItemParams = MoveBaseParams & {
  context: "item";
  categoryId: string;
  itemId: string;
};

type MoveItemOptionParams = MoveBaseParams & {
  context: "itemOption";
  itemId: string;
  optionId: string;
};

type MoveParams = MoveCategoryParams | MoveItemParams | MoveItemOptionParams;

// ----------------------------
// MOVE UP & DOWN OPERATIONS
// ----------------------------
/*
 * Changes the order the selected context is rendered in the frontend. Uses the move-up
 * and move-down endpoints and the context is decided via a switch block.
 **/

export async function moveOrder(params: MoveParams) {
  let url: string;

  switch (params.context) {
    case "category":
      url =
        `/api/businesses/${params.businessId}` +
        `/locations/${params.locationId}` +
        `/categories/${params.categoryId}` +
        `/move-${params.direction}`;
      break;

    case "item":
      url =
        `/api/businesses/${params.businessId}` +
        `/locations/${params.locationId}` +
        `/categories/${params.categoryId}` +
        `/items/${params.itemId}` +
        `/move-${params.direction}`;
      break;

    case "itemOption":
      url =
        `/api/businesses/${params.businessId}` +
        `/locations/${params.locationId}` +
        `/items/${params.itemId}` +
        `/options/${params.optionId}` +
        `/move-${params.direction}`;
      break;
  }

  return axios.patch(url).then((response) => response.data);
}
