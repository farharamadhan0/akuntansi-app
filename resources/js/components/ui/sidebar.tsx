import * as React from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

interface SidebarContextValue {
    open: boolean;
    setOpen: (v: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextValue>({
    open: false,
    setOpen: () => {},
});

export function useSidebar() {
    return React.useContext(SidebarContext);
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false);
    return (
        <SidebarContext.Provider value={{ open, setOpen }}>
            {children}
        </SidebarContext.Provider>
    );
}

/* ------------------------------------------------------------------ */
/*  Layout wrapper  (sidebar + main)                                   */
/* ------------------------------------------------------------------ */

export function SidebarLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-background">{children}</div>
    );
}

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

export function Sidebar({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const { open, setOpen } = useSidebar();

    return (
        <>
            {/* Desktop sidebar — always visible */}
            <aside
                className={cn(
                    "hidden md:flex md:flex-col md:fixed md:inset-y-0 md:z-30 md:w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
                    className,
                )}
            >
                {children}
            </aside>

            {/* Mobile overlay */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Mobile sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 md:hidden flex flex-col",
                    open ? "translate-x-0" : "-translate-x-full",
                )}
            >
                {children}
            </aside>
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  Sidebar sub-components                                             */
/* ------------------------------------------------------------------ */

export function SidebarHeader({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex items-center gap-2 px-4 py-4 border-b border-sidebar-border", className)}>
            {children}
        </div>
    );
}

export function SidebarContent({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex-1 overflow-y-auto px-3 py-3", className)}>
            {children}
        </div>
    );
}

export function SidebarFooter({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("border-t border-sidebar-border px-3 py-3", className)}>
            {children}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Group                                                              */
/* ------------------------------------------------------------------ */

export function SidebarGroup({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return <div className={cn("mb-4", className)}>{children}</div>;
}

export function SidebarGroupLabel({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <p
            className={cn(
                "px-2 mb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50",
                className,
            )}
        >
            {children}
        </p>
    );
}

/* ------------------------------------------------------------------ */
/*  Menu                                                               */
/* ------------------------------------------------------------------ */

export function SidebarMenu({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <ul className={cn("flex flex-col gap-0.5", className)}>{children}</ul>
    );
}

export function SidebarMenuItem({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return <li className={cn(className)}>{children}</li>;
}

export function SidebarMenuButton({
    children,
    isActive,
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement> & {
    children: React.ReactNode;
    isActive?: boolean;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors cursor-pointer",
                isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Trigger (hamburger)                                                */
/* ------------------------------------------------------------------ */

export function SidebarTrigger({ className }: { className?: string }) {
    const { open, setOpen } = useSidebar();
    return (
        <button
            className={cn(
                "inline-flex items-center justify-center rounded-md p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/60 md:hidden",
                className,
            )}
            onClick={() => setOpen(!open)}
            aria-label="Toggle sidebar"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {open ? (
                    <>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </>
                ) : (
                    <>
                        <line x1="4" y1="6" x2="20" y2="6" />
                        <line x1="4" y1="12" x2="20" y2="12" />
                        <line x1="4" y1="18" x2="20" y2="18" />
                    </>
                )}
            </svg>
        </button>
    );
}
