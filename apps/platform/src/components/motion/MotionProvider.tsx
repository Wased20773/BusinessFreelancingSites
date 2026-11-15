"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/*
 *   Wraps the app so every Motion animation follows the user's system
 *   "reduce motion" setting. With it on, movement is skipped and only
 *   fades play.
 **/
export default function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
