import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(
    ({ className, type, label, errorMessage, isInvalid, prefix, isRequired, ...props }, ref) => {
        const id = React.useId();
        
        return (
            <div className="space-y-1">
                {label && (
                    <label htmlFor={id} className="text-sm font-medium text-gray-700">
                        {label}
                        {isRequired && <span className="text-red-500 ml-1">*</span>}
                    </label>
                )}
                <div className="relative">
                    {prefix && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {prefix}
                        </div>
                    )}
                    <input
                        id={id}
                        type={type}
                        className={cn(
                            "flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
                            prefix && "pl-10",
                            isInvalid
                                ? "border-red-500 focus:ring-red-500"
                                : "border-gray-300",
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                </div>
                {isInvalid && errorMessage && (
                    <p className="text-sm text-red-500">{errorMessage}</p>
                )}
            </div>
        );
    }
);
Input.displayName = "Input";

export { Input };
