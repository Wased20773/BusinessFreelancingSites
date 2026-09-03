type ArrowDirection = "right" | "up" | "left" | "down";

type ArrowIconProps = {
  direction?: ArrowDirection;
  strokeWidth?: number;
  size?: number;
  theme?: "dark" | "light";
};

const rotation: Record<ArrowDirection, number> = {
  right: 0,
  down: 90,
  left: 180,
  up: 270,
};

export default function ArrowIcon({
  direction,
  strokeWidth = 2,
  size = 30,
  theme,
}: ArrowIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      width={size}
      height={size}
      aria-hidden="true"
      style={{
        transform: `rotate(${rotation[direction ?? "right"]}deg)`,
        color:
          theme === "dark" ? "white" : theme === "light" ? "black" : undefined,
      }}
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
