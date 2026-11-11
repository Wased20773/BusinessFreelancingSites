import { headers } from "next/headers";
import Link from "next/link";
import DownloadJsonButton from "@/components/ui/api-reference/DownloadJsonButton";
import FieldTree from "@/components/ui/api-reference/FieldTree";
import {
  PUBLIC_API_ENDPOINTS,
  PUBLIC_API_ERRORS,
} from "@/data/apiReference";

type ApiReferencePageProps = {
  params: Promise<{ businessId: string }>;
};

/*
 *   Developer reference for the public client-website API: the structure of
 *   every endpoint plus downloadable SAMPLE responses. No business data is
 *   read or shown on this page.
 **/
export default async function ApiReferencePage({
  params,
}: ApiReferencePageProps) {
  const { businessId } = await params;

  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;

  const allExamples = Object.fromEntries(
    PUBLIC_API_ENDPOINTS.map((endpoint) => [
      `${endpoint.method} ${endpoint.path}`,
      endpoint.example,
    ]),
  );

  const fetchSnippet = `const response = await fetch("${baseUrl}/api/business/menu", {
  headers: {
    Authorization: "Bearer bp_your_api_key",
    "x-location-id": "LOCATION_ID",
  },
});

const menu = await response.json();`;

  return (
    <section
      className="mx-auto max-w-[1000px] p-5"
      aria-labelledby="api-reference-heading"
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 id="api-reference-heading" className="text-3xl font-semibold">
            API Reference
          </h1>

          <p className="mt-1 text-gray-500">
            The structure of every endpoint your website can call, with sample
            responses to build and test your template against.
          </p>
        </div>

        <DownloadJsonButton
          fileName="business-platform-api.examples.json"
          data={allExamples}
          label="Download all examples"
          variant="primary"
        />
      </div>

      <div className="space-y-5">
        {/* Getting started */}
        <section
          aria-labelledby="getting-started-heading"
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 id="getting-started-heading" className="text-lg font-semibold">
            Getting started
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="text-sm text-gray-500">Base URL</p>
              <code className="mt-1 block font-mono text-sm break-all">
                {baseUrl}
              </code>
            </div>

            <div className="min-w-0">
              <p className="text-sm text-gray-500">Authentication</p>
              <code className="mt-1 block font-mono text-sm break-all">
                Authorization: Bearer bp_your_api_key
              </code>
            </div>

            <div className="min-w-0 sm:col-span-2">
              <p className="text-sm text-gray-500">Location header</p>
              <p className="mt-1 text-sm">
                Endpoints marked{" "}
                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                  x-location-id
                </span>{" "}
                also need{" "}
                <code className="font-mono">x-location-id: LOCATION_ID</code>.
                Get location ids from{" "}
                <a href="#locations" className="text-blue-700 underline">
                  Locations
                </a>
                .
              </p>
            </div>
          </div>

          <pre className="mt-5 overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
            <code>{fetchSnippet}</code>
          </pre>

          <ul className="mt-5 list-disc space-y-1.5 pl-5 text-sm text-gray-700">
            <li>
              The examples on this page are <strong>sample data</strong>, not
              this business&apos;s records. Your API key returns the real data
              in the same shape.
            </li>
            <li>
              Prices are <strong>strings</strong> (for example{" "}
              <code className="font-mono">&quot;3.5&quot;</code>). Format them
              with <code className="font-mono">Number(price).toFixed(2)</code>.
            </li>
            <li>
              Image fields (<code className="font-mono">imageKey</code>,{" "}
              <code className="font-mono">icon</code>) are signed URLs that
              expire 1 hour after the response. Use them directly and fetch the
              data again rather than storing them.
            </li>
            <li>
              Calling from browser JavaScript requires your site&apos;s origin
              in the key&apos;s allowed origins on the{" "}
              <Link
                href={`/businesses/${businessId}/api-keys`}
                className="text-blue-700 underline"
              >
                API Keys
              </Link>{" "}
              page. Server-side requests don&apos;t.
            </li>
            <li>
              Requests are rate limited to a burst of 150, refilling at 60 per
              minute, shared by all of the business&apos;s keys.
            </li>
          </ul>
        </section>

        {/* Endpoint index */}
        <nav
          aria-label="Endpoints"
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 className="text-lg font-semibold">Endpoints</h2>

          <ul className="mt-3 space-y-1">
            {PUBLIC_API_ENDPOINTS.map((endpoint) => (
              <li key={endpoint.id}>
                <a
                  href={`#${endpoint.id}`}
                  className="flex min-w-0 items-baseline gap-2 rounded-md px-2 py-1 hover:bg-gray-50"
                >
                  <span className="text-xs font-semibold text-green-700">
                    {endpoint.method}
                  </span>
                  <code className="truncate font-mono text-sm">
                    {endpoint.path}
                  </code>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Endpoints */}
        {PUBLIC_API_ENDPOINTS.map((endpoint) => (
          <section
            key={endpoint.id}
            id={endpoint.id}
            aria-labelledby={`${endpoint.id}-heading`}
            className="scroll-mt-5 rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="border-b border-gray-300 px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id={`${endpoint.id}-heading`}
                  className="text-lg font-semibold text-gray-900"
                >
                  {endpoint.title}
                </h2>

                {endpoint.requiresLocation && (
                  <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                    x-location-id
                  </span>
                )}
              </div>

              <p className="mt-2 flex min-w-0 items-baseline gap-2">
                <span className="rounded-md bg-green-50 px-1.5 py-0.5 text-xs font-semibold text-green-700">
                  {endpoint.method}
                </span>
                <code className="font-mono text-sm break-all">
                  {endpoint.path}
                </code>
              </p>

              <p className="mt-2 text-sm text-gray-600">
                {endpoint.description}
              </p>

              {endpoint.pathParams && (
                <ul className="mt-2 space-y-1 text-sm">
                  {endpoint.pathParams.map((param) => (
                    <li key={param.name}>
                      <code className="font-mono font-semibold">
                        {`{${param.name}}`}
                      </code>{" "}
                      <span className="text-gray-600">
                        {param.description}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="px-5 py-5 sm:px-6">
              <h3 className="mb-3 text-sm font-semibold tracking-wide text-gray-500 uppercase">
                Response{" "}
                {endpoint.responseType === "array"
                  ? "(an array of these objects)"
                  : "fields"}
              </h3>

              <FieldTree fields={endpoint.fields} />

              <details className="mt-5 rounded-lg border border-gray-200">
                <summary className="cursor-pointer px-4 py-2 text-sm font-medium select-none hover:bg-gray-50">
                  Example response
                </summary>

                <div className="border-t border-gray-200 p-3">
                  <div className="mb-3 flex justify-end">
                    <DownloadJsonButton
                      fileName={`${endpoint.id}.example.json`}
                      data={endpoint.example}
                      label="Download JSON"
                    />
                  </div>

                  <pre className="max-h-[480px] overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
                    <code>{JSON.stringify(endpoint.example, null, 2)}</code>
                  </pre>
                </div>
              </details>
            </div>
          </section>
        ))}

        {/* Errors */}
        <section
          aria-labelledby="errors-heading"
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 id="errors-heading" className="text-lg font-semibold">
            Errors
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Errors return a JSON body of{" "}
            <code className="font-mono">{`{ "error": "message" }`}</code>.
          </p>

          <ul className="mt-4 space-y-2">
            {PUBLIC_API_ERRORS.map((error) => (
              <li key={error.status} className="flex gap-3 text-sm">
                <code className="w-10 shrink-0 font-mono font-semibold">
                  {error.status}
                </code>
                <span className="text-gray-700">{error.when}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
