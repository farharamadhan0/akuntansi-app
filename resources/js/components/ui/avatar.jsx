import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

const Avatar = React.forwardRef(({ className, name, ...props }, ref) => {
    const initials = name
        ? name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : "";

    return (
        <AvatarPrimitive.Root
            ref={ref}
            className={cn(
                "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
                className
            )}
            {...props}
        >
            <AvatarPrimitive.Fallback className="flex h-full w-full items-center justify-center rounded-full bg-primary-100 text-primary-600 text-sm font-medium">
                {initials}
            </AvatarPrimitive.Fallback>
        </AvatarPrimitive.Root>
    );
});
Avatar.displayName = AvatarPrimitive.Root.displayName;

export { Avatar };
