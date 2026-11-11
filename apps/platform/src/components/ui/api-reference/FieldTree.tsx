import type { ApiField } from "@/data/apiReference";

type FieldTreeProps = {
  fields: ApiField[];
  nested?: boolean;
};

/*
 *   Renders the documented structure of a response: each field's name, type,
 *   and description, with nested objects and arrays indented underneath.
 **/
export default function FieldTree({ fields, nested = false }: FieldTreeProps) {
  return (
    <ul
      className={
        nested
          ? "mt-2 space-y-2 border-l-2 border-gray-200 pl-3 sm:pl-4"
          : "space-y-2"
      }
    >
      {fields.map((field) => (
        <li key={field.name} className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <code className="font-mono text-sm font-semibold text-gray-900">
              {field.name}
            </code>
            <code className="font-mono text-xs break-all text-blue-700">
              {field.type}
            </code>
          </div>

          {field.description && (
            <p className="mt-0.5 text-sm text-gray-600">{field.description}</p>
          )}

          {field.fields && <FieldTree fields={field.fields} nested />}
        </li>
      ))}
    </ul>
  );
}
