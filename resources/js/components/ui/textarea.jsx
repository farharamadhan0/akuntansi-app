import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef(
    ({ className, label, errorMessage, isInvalid, isRequired, ...props }, ref) => {
        const id = React.useId();
        
        return (
            <div className="space-y-1">
                {label && (
                    <label htmlFor={id} className="text-sm font-medium text-gray-700">
                        {label}
                        {isRequired && <span className="text-red-500 ml-1">*</span>}
                    </label>
                )}
                <textarea
                    id={id}
                    className={cn(
                        "flex min-h-[80px] w-full rounded-md border bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
                        isInvalid
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {isInvalid && errorMessage && (
                    <p className="text-sm text-red-500">{errorMessage}</p>
                )}
            </div>
        );
    }
);
Textarea.displayName = "Textarea";

export { Textarea };
