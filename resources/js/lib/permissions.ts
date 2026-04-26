import { usePage } from '@inertiajs/react';

interface AuthUser {
    is_owner?: boolean;
    permissions?: string[];
}

interface SharedAuth {
    auth?: { user?: AuthUser | null };
    [key: string]: unknown;
}

/**
 * Hook sederhana untuk memeriksa permission pengguna saat ini.
 * Owner (punya '*' atau is_owner=true) selalu lolos.
 */
export function usePermissions() {
    const { auth } = usePage<SharedAuth>().props;
    const user = auth?.user ?? null;
    const perms = user?.permissions ?? [];
    const isOwner = user?.is_owner === true || perms.includes('*');

    const can = (permission: string): boolean => {
        if (isOwner) return true;
        return perms.includes(permission);
    };

    const canAny = (permissions: string[]): boolean => {
        if (isOwner) return true;
        return permissions.some((p) => perms.includes(p));
    };

    return { can, canAny, isOwner };
}
