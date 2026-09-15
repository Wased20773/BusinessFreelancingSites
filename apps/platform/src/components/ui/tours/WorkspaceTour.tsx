"use client";

import { Dispatch, SetStateAction, useEffect } from "react";
import { useSession } from "next-auth/react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

type WorkspaceTourProps = {
  shouldStartTour: boolean;
  openMobileNav: Dispatch<SetStateAction<boolean>>;
};

function getVisibleTourElement(selector: string) {
  const elements = document.querySelectorAll<HTMLElement>(selector);

  return Array.from(elements).find((element) => {
    const styles = window.getComputedStyle(element);

    return (
      styles.display !== "none" &&
      styles.visibility !== "hidden" &&
      element.getClientRects().length > 0
    );
  });
}

export default function WorkspaceTour({
  shouldStartTour,
  openMobileNav,
}: WorkspaceTourProps) {
  const { update } = useSession();

  useEffect(() => {
    if (!shouldStartTour) {
      return;
    }

    async function saveTourVersion() {
      try {
        const response = await fetch("/api/user/workspace-tour", {
          method: "PATCH",
        });

        if (!response.ok) {
          throw new Error("Failed to update the workspace tour version.");
        }

        // Refresh the JWT session with the new version.
        await update();
      } catch (error) {
        console.error("Failed to update workspace tour:", error);
      }
    }

    const tour = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      overlayOpacity: 0.65,
      allowClose: false,
      disableActiveInteraction: true,

      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Finish",

      steps: [
        {
          popover: {
            title: "Welcome to your workspace",
            description:
              "This quick tour will show you where to manage your business and how to enter a location's dashboard.",
            side: "right",
            align: "end",

            onNextClick: () => {
              openMobileNav(true);
              tour.moveNext();
            },
          },
        },
        {
          element: () =>
            getVisibleTourElement('[data-tour="business-selector"]')!,
          popover: {
            title: "Switch businesses",
            description:
              "Select the business you want to view or manage. You can return here whenever you need to switch businesses.",
            side: "right",
            align: "end",

            onPrevClick: () => {
              openMobileNav(false);
              tour.movePrevious();
            },
            onNextClick: () => {
              openMobileNav(false);
              tour.moveNext();
            },
          },
        },
        {
          element: () =>
            getVisibleTourElement('[data-tour="location-selector"]')!,
          popover: {
            title: "Enter a location's dashboard",
            description:
              "Choose a location to enter its dashboard. Each location has its own content, including items, categories, hours, contacts, and social links.",
            side: "bottom",
            align: "start",

            onPrevClick: () => {
              openMobileNav(true);
              tour.movePrevious();
            },
            onNextClick: () => {
              openMobileNav(true);
              tour.moveNext();
            },
          },
        },
        {
          element: () =>
            getVisibleTourElement('[data-tour="account-dropdown"]')!,
          popover: {
            title: "Manage your account",
            description:
              "Open this menu to view your account, review billing information, or sign out.",
            side: "top",
            align: "end",

            onPrevClick: () => {
              openMobileNav(false);
              tour.movePrevious();
            },
            onNextClick: () => {
              openMobileNav(false);
              tour.moveNext();
            },
          },
        },
        {
          popover: {
            title: "Your business workspace",
            description:
              "The workspace contains tools that apply to the business as a whole, rather than a single location. Let's take a quick look at each section.",

            onPrevClick: () => {
              openMobileNav(true);
              tour.movePrevious();
            },
            onNextClick: () => {
              openMobileNav(true);
              tour.moveNext();
            },
          },
        },
        {
          element: () => getVisibleTourElement('[data-tour="overview-nav"]')!,
          popover: {
            title: "Overview",
            description:
              "View important business details and a summary of the resources available in this workspace.",
            side: "right",
            align: "end",

            onPrevClick: () => {
              openMobileNav(false);
              tour.movePrevious();
            },
          },
        },
        {
          element: () => getVisibleTourElement('[data-tour="members-nav"]')!,
          popover: {
            title: "Members",
            description:
              "View the people who belong to this business and the access level assigned to each person.",
            side: "right",
            align: "end",
          },
        },
        {
          element: () => getVisibleTourElement('[data-tour="api-keys-nav"]')!,
          popover: {
            title: "API keys",
            description:
              "Create and manage the keys developers use to connect custom websites and applications to this business's data.",
            side: "right",
            align: "end",
          },
        },
        {
          element: () => getVisibleTourElement('[data-tour="settings-nav"]')!,
          popover: {
            title: "Business settings",
            description:
              "Manage business-level details such as the business name, image, and domain.",
            side: "right",
            align: "end",

            onNextClick: () => {
              openMobileNav(false);
              tour.moveNext();
            },
          },
        },
        {
          popover: {
            title: "You're ready to get started",
            description:
              "Use the workspace to manage the business as a whole, or select a location to manage its content from the dashboard.",
            side: "right",
            align: "end",

            onPrevClick: () => {
              openMobileNav(true);
              tour.movePrevious();
            },
          },
        },
      ],

      onDestroyed: () => {
        openMobileNav(false);
        void saveTourVersion();
      },
    });

    /*
     * Give the workspace and its responsive elements
     * enough time to render before starting the tour.
     */
    const startTimeoutId = window.setTimeout(() => {
      // Wait for React to render the opened mobile navigation.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          tour.drive();
        });
      });
    }, 500);

    /*
     * Reload the current step after resizing so Driver.js
     * targets whichever mobile or desktop copy is visible.
     */
    let resizeTimeoutId: number | undefined;

    function handleResize() {
      window.clearTimeout(resizeTimeoutId);

      resizeTimeoutId = window.setTimeout(() => {
        if (!tour.isActive()) {
          return;
        }

        const activeStepIndex = tour.getActiveIndex();

        if (activeStepIndex !== undefined) {
          tour.moveTo(activeStepIndex);
        }
      }, 150);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.clearTimeout(startTimeoutId);
      window.clearTimeout(resizeTimeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return null;
}
