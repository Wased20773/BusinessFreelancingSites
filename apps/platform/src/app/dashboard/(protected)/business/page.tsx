import Image from "next/image";
import "../page.css";
import PlaceholderAccountIcon from "@/components/icons/placeholder-account-black.svg";
import ArrowIcon from "@/components/icons/arrow";
import DropArrowIcon from "@/components/icons/drop-arrow.svg";
import Divider from "@/components/layout/Divider";
import EditIcon from "@/components/icons/edit.svg";

export default function BusinessPage() {
    return (
        <div aria-labelledby="business-heading">
            <h1 id="business-heading">Business</h1>
            
            <div className="mt-[1.5rem]">
                <section>
                    <div>
                        {/* Name */}
                        <input
                            className="border border-gray-400 bg-gray-50 w-full rounded-lg border-b-[0.2rem] border-gray-300 px-3 py-1"
                            type="text"
                            placeholder="Enter your business name"
                        />

                        {/* Domain */}
                        <p className="mt-1">Your domain is:</p>
                        <p className="text-gray-500">https://place-business-domain-here.com</p>
                    </div>
                </section>
            </div>
        </div>
    )
}