type CardProps = {
    styleVarient: "media-card" | "workflow-card";
    order?: number;
    title?: string;
    context?: string;
    image?: string;
    flow?: "left" | "right";
};

import Image from "next/image";

export default function Card({styleVarient, order, title, context, image, flow}: CardProps) {
    return (
        <>
            {/* Workflow card */}
            {styleVarient === "workflow-card" && (
                <article className="relative grid grid-rows-[auto_auto_1fr] h-full rounded-lg border border-gray-200">
                    <h3 className="px-5 py-3"><strong>{order}</strong></h3>
                    
                    {image && (
                        <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 border border-transparent rounded-full size-[80px] overflow-hidden">
                            {/* test */}
                            <Image 
                                src={image}
                                alt="Workflow image"
                                loading="eager"
                            />
                        </div>
                    )}

                    <h3 className="border-t border-b border-gray-200 p-2 text-center">{title}</h3>

                    <p className="px-6 py-3">{context}</p>
                </article>
            )}
            {/* 50/50 media card */}
            {styleVarient === "media-card" && (
                <>
                    {flow === "left" && (
                        <article className="w-full rounded-lg flex flex-row items-center gap-10 p-5">
                            <div className="flex-1">
                                <h3>{title}</h3>
                                <p>{context}</p>
                            </div>
                            
                            {image && (
                                <div className="flex-1">
                                    <Image 
                                        src={image}
                                        alt="Feature image"
                                        loading="eager"
                                    />
                                </div>
                            )}
                        </article>
                    )}
                
                    {flow === "right" && (
                        <article className="w-full rounded-lg flex flex-row items-center gap-10 p-5">

                            {image && (
                                <div className="flex-1">
                                    <Image 
                                        src={image}
                                        alt="Feature image"
                                        loading="eager"
                                    />
                                </div>
                            )}

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