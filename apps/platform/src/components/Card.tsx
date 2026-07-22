type CardProps = {
    styleVarient: "media-card" | "workflow-card";
    order?: number;
    title?: string;
    context?: string;
    image?: string;
    flow?: "left" | "right";
};

import Image from "next/image";
import Logo from "../../public/logo.svg";

export default function Card({styleVarient, order, title, context, image, flow}: CardProps) {
    return (
        <>
            {/* Workflow card */}
            {styleVarient === "workflow-card" && (
                <article className="relative grid max-w-xs rounded-lg border">
                    <h3 className="p-2">{order}</h3>
                    <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 border rounded-full size-[80px] overflow-hidden">
                        {/* test */}
                        <Image 
                            src={image}
                            alt="Workflow image"
                            loading="eager"
                        />
                    </div>

                    <h3 className="border-t border-b p-2 text-center">{title}</h3>

                    <p className="p-2">{context}</p>
                </article>
            )}
            {/* 50/50 media card */}
            {styleVarient === "media-card" && (
                <>
                    {flow === "left" && (
                        <article className="border w-full rounded-lg flex flex-row gap-10 p-5">
                            <div className="flex-1">
                                <h3>{title}</h3>
                                <p>{context}</p>
                            </div>
                            
                            <div className="flex-1">
                                <Image 
                                    src={image}
                                    alt="Feature image"
                                    loading="eager"
                                />
                            </div>
                        </article>
                    )}
                
                    {flow === "right" && (
                        <article className="border w-full rounded-lg flex flex-row gap-10 p-5">
                            <div className="flex-1">
                                <Image 
                                    src={image}
                                    alt="Feature image"
                                    loading="eager"
                                />
                            </div>

                            <div className="flex-1">
                                <h3>{title}</h3>
                                <p>{context}</p>
                            </div>
                        </article>
                    )}

                    {flow === undefined && ('Please enter a "flow" direction (left or right)')}
                </>
            )} 
        </>
    )
}