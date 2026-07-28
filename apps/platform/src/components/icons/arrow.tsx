type ArrowDirection = "right" | "up" | "left" | "down";

type ArrowIconProps = {
  direction?: ArrowDirection;
  strokeWidth?: number;
  size?: number;
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
}: ArrowIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      // className={className}
      style={{
        transform: `rotate(${rotation[direction ?? "right"]}deg)`,
        // borderRadius: radius,
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
