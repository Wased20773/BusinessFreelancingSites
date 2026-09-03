import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dispatch, SetStateAction } from "react";

type GenericSelectProps = {
  placeholder: string;
  label?: string;
  items: { name: string; key: string }[] | null;
  setSelected?: Dispatch<SetStateAction<string | null>>;
};

export function GenericSelect({
  placeholder,
  label,
  items,
  setSelected,
}: GenericSelectProps) {
  return (
    <Select onValueChange={setSelected}>
      <SelectTrigger className="w-full max-w-48 !h-[44px]" disabled={!items}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent>
        <SelectGroup>
          {label && <SelectLabel>{label}</SelectLabel>}

          {items?.map((item) => (
            <SelectItem key={item.key} value={item.key}>
              {item.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
