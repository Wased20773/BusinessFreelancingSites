import axios from "axios";

export type ReorderContext = "category" | "item" | "itemOption";
export type ReorderDirection = "up" | "down";

type MoveCategoryParams = {
  context: "category";
  direction: ReorderDirection;
  categoryId: string;
};

type MoveItemParams = {
  context: "item";
  direction: ReorderDirection;
  categoryId: string;
  itemId: string;
};

type MoveItemOptionParams = {
  context: "itemOption";
  direction: ReorderDirection;
  itemId: string;
  optionId: string;
};

type MoveParams = MoveCategoryParams | MoveItemParams | MoveItemOptionParams;

// ----------------------------
// MOVE ITEM OPTION
// ----------------------------
/*
 * Changes the order the selected context is rendered in the frontend. Uses the move-up,
 * and move-down endpoints and the context is decided via a switch block.
 **/
export async function moveOrder(params: MoveParams) {
  let url: string;

  switch (params.context) {
    case "category":
      url = `/api/admin/categories/${params.categoryId}/move-${params.direction}`;
      break;
    case "item":
      url = `/api/admin/categories/${params.categoryId}/items/${params.itemId}/move-${params.direction}`;
      break;
    case "itemOption":
      url = `/api/admin/items/${params.itemId}/options/${params.optionId}/move-${params.direction}`;
      break;
  }

  return axios.patch(url).then((response) => response.data);
}
