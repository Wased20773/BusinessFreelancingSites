import { auth } from "@/auth";
import { GET as getCategories } from "@/app/api/business/categories/route";

export default async function CategoriesPage() {
  const session = await auth();

  const businessSlug = session?.user.businessSlug;

  if (!businessSlug) {
    throw new Error("No Business is associated with this account.");
  }

  const request = new Request(
    `http://internal/api/business/categories?slug=${encodeURIComponent(businessSlug)}`,
  );

  const response = await getCategories(request);

  if (!response.ok) {
    throw new Error("Failed to retrieve categories.");
  }

  const data = await response.json();

  return (
    <>
      <h1 className="mb-[1.5rem]">Categories</h1>

      <section>
        <p>{data.categories[1].subcategories[1].name}</p>
      </section>
    </>
  );
}
