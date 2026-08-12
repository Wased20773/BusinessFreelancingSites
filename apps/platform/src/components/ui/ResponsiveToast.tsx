"use client";

import { Toaster, type ToasterProps } from "sonner";
import { useEffect, useState } from "react";

type ToastPosition = NonNullable<ToasterProps["position"]>;

export default function ResponsiveToaster() {
  const [position, setPosition] = useState<ToastPosition>("top-center");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");

    const updatePosition = () => {
      setPosition(mediaQuery.matches ? "bottom-right" : "top-center");
    };

    updatePosition();
    mediaQuery.addEventListener("change", updatePosition);

    return () => {
      mediaQuery.removeEventListener("change", updatePosition);
    };
  }, []);

  return (
    // >= 768px === bottom-right === "30px"
    // <  768px === top-center   === { top: "80px" }
    <Toaster
      position={position}
      richColors
      closeButton
      duration={3000}
      offset={
        position === "bottom-right"
          ? "30px"
          : {
              top: "80px",
            }
      }
      mobileOffset={{
        top: "80px",
      }}
    />
  );
}
