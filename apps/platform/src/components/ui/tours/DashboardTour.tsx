"use client";

import { Dispatch, SetStateAction, useEffect } from "react";
import { useSession } from "next-auth/react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

type DashboardTourProps = {
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

export default function DashboardTour({
  shouldStartTour,
  openMobileNav,
}: DashboardTourProps) {
  const { update } = useSession();

  useEffect(() => {
    if (!shouldStartTour) {
      return;
    }

    async function saveTourVersion() {
      try {
        const response = await fetch("/api/user/dashboard-tour", {
          method: "PATCH",
        });

        if (!response.ok) {
          throw new Error("Failed to update the dashboard tour version.");
        }

        // Refresh the JWT with the new dashboard tour version.
        await update();
      } catch (error) {
        console.error("Failed to update dashboard tour:", error);
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
            title: "Welcome to your dashboard",
            description:
              "The dashboard is where you manage the content and details for a specific business location. Let's take a quick look around.",
          },
        },
        {
          popover: {
            title: "Content for each location",
            description:
              "Each location can have its own menu, hours, contacts, social links, and other details. Changes you make here apply to the location currently selected.",
          },
        },
        {
          popover: {
            title: "Keep locations synchronized",
            description:
              "When creating supported content, you can add it to all locations and keep those copies synchronized. If one location needs something different, you can unsync it and manage its copy separately.",

            onNextClick: () => {
              openMobileNav(true);
              tour.moveNext();
            },
          },
        },
        {
          element: () =>
            getVisibleTourElement('[data-tour="return-to-workspace"]')!,
          popover: {
            title: "Return to workspace",
            description:
              "Whenever you need to go back to the workspace you can click here anytime.",

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
            title: "Explore your dashboard",
            description:
              "Now that we've covered how location content and synchronization work, let's look at each section of the dashboard.",

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
              "View a summary of the selected location and quickly access its main information and resources.",
            side: "right",
            align: "end",

            onPrevClick: () => {
              openMobileNav(false);
              tour.movePrevious();
            },
          },
        },
        {
          element: () => getVisibleTourElement('[data-tour="menu-nav"]')!,
          popover: {
            title: "Menu",
            description:
              "Build this location's menu by organizing content into categories, adding items to those categories, and creating options for individual items.",
            side: "right",
            align: "end",
          },
        },
        {
          element: () => getVisibleTourElement('[data-tour="location-nav"]')!,
          popover: {
            title: "Location details and hours",
            description:
              "Manage this location's information, including its address, availability, business days, and regular or special hours.",
            side: "right",
            align: "end",
          },
        },
        {
          element: () => getVisibleTourElement('[data-tour="contacts-nav"]')!,
          popover: {
            title: "Contacts",
            description:
              "Manage the phone numbers, email addresses, and other contact details associated with this location.",
            side: "right",
            align: "end",
          },
        },
        {
          element: () => getVisibleTourElement('[data-tour="socials-nav"]')!,
          popover: {
            title: "Social links",
            description:
              "Manage the social media profiles customers can use to find and follow this location online.",
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
              "This tour covered the dashboard's main features. Explore each section to begin adding content and customizing the selected location.",
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
     * Give the dashboard and its responsive elements
     * enough time to render before starting the tour.
     */
    const startTimeoutId = window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          tour.drive();
        });
      });
    }, 500);

    /*
     * When the viewport changes, reload the current step
     * so Driver.js selects the visible mobile or desktop
     * version of the target.
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
