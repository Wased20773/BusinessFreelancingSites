"use client";

import Image from "next/image";
import Link from "next/link";
import CreateButtonIcon from "@/components/icons/create-button.svg";
import Divider from "@/components/layout/Divider";
import ActionItem from "@/components/ui/ActionItem";
import EditIcon from "@/components/icons/edit.svg";
import { useEffect, useState } from "react";
import { SocialJson } from "@/types/types";
import axios from "axios";
import { toast } from "sonner";
import InstagramIcon from "@/components/icons/instagram.svg";
import "../page.css";
import ListCard from "@/components/ui/ListCard";

// Test later
// https://business-freelancer-storage-972388989182-us-west-2-an.s3.us-west-2.amazonaws.com/social-icons/instagram/normal.svg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIA6EZXGPD7JYK375WX%2F20260808%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260808T024154Z&X-Amz-Expires=3600&X-Amz-Signature=23b4e75413d07e1ba6de0f5ae5597f766fa1bf51a4d0fcc07b5c91b1abfdff50&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject

export default function SocialsPage() {
  const [socialsData, setSocialsData] = useState<SocialJson[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function getSocialsData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const socialsToast = toast.promise<SocialJson[]>(
          axios
            .get<{ socials: SocialJson[] }>("/api/business/socials")
            .then((response) => response.data.socials),
          {
            loading: "Loading socials...",
            success: "Socials loaded.",
            error: (error) => {
              if (axios.isAxiosError<{ error?: string }>(error)) {
                return {
                  message: "Failed to load socials.",
                  description: `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",
                description: "Something went wrong while loading the socials.",
              };
            },
          },
        );

        const data = await socialsToast.unwrap();

        setSocialsData(data);
      } catch (error) {
        console.error("Error in Socials page:", error);

        if (axios.isAxiosError<{ error?: string }>(error)) {
          setErrorMessage(
            error.response?.data?.error ?? "Failed to load socials data.",
          );
        } else {
          setErrorMessage("Failed to load social data.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    void getSocialsData();
  }, []);

  return (
    <section aria-labelledby="socials-heading">
      <h1 id="socials-heading">Socials</h1>

      {/* Business.socials: id, dns, profileName, url, icon, createdAt, updatedAt */}

      <div className="mt-[1.5rem]">
        {/* Links */}
        <nav className="dashboard-card" aria-label="Social actions">
          {/* Create Socials */}
          <ActionItem
            href="socials/create"
            icon={CreateButtonIcon}
            label="Create Social"
          />
        </nav>

        <Divider />

        <section aria-label="socials-list-heading">
          <div className="dashboard-card">
            {/* TODO: No current socials */}
            {isLoading ? (
              <p>Loading socials...</p>
            ) : socialsData.length === 0 ? (
              <p>You have no socials</p>
            ) : (
              <>
                {/* MOBILE */}
                <ul className="md:hidden">
                  {socialsData.map((social, idx) => (
                    <ListCard
                      key={social.id}
                      variant="mobile"
                      id={social.id}
                      path={`socials/${social.id}`}
                      icon={social.icon}
                      title={social.profileName}
                      subtitle={social.domain}
                      isLast={socialsData.length !== idx + 1}
                    />
                  ))}
                </ul>
                {/* DESKTOP */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full border-collapse text-left">
                    <caption className="sr-only">
                      Business socials, including profile name, domain, and the
                      platform
                    </caption>

                    <thead>
                      <tr className="border-b border-gray-600">
                        <th scope="col" className="px-3 py-2 font-semibold">
                          Profile name
                        </th>

                        <th scope="col" className="px-3 py-2 font-semibold">
                          Domain
                        </th>

                        <th scope="col" className="px-3 py-2 font-semibold">
                          Platform
                        </th>

                        <th scope="col" className="w-12 px-3 py-2">
                          <span className="sr-only">Edit socials</span>
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {/* TODO: Render the desktop view socials */}
                      {socialsData.map((social) => (
                        <ListCard
                          key={social.id}
                          variant="desktop"
                          id={social.id}
                          path={`socials/${social.id}`}
                          icon={social.icon}
                          title={social.profileName}
                          subtitle={social.domain}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
