import type { APIRoute } from "astro";
import { getSession } from "auth-astro/server";
import { getProvider, getLinkedAccount, deleteLinkedAccount } from "@/lib/linked-accounts";

export const POST: APIRoute = async ({ params, request }) => {
    const providerName = params.provider;
    if (!providerName) {
        return new Response(JSON.stringify({ error: "Provider not specified" }), { status: 400 });
    }

    const provider = getProvider(providerName);
    if (!provider) {
        return new Response(JSON.stringify({ error: "Provider not supported" }), { status: 404 });
    }

    const session = await getSession(request);
    if (!session?.user?.id) {
        return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });
    }

    const account = await getLinkedAccount(session.user.id, providerName);
    if (!account) {
        return new Response(JSON.stringify({ error: `No tienes una cuenta de ${provider.label} vinculada` }), { status: 400 });
    }

    await provider.onUnlink(account);
    await deleteLinkedAccount(account.id);

    return new Response(JSON.stringify({
        success: true,
        message: `Cuenta de ${provider.label} desvinculada exitosamente`,
    }), { status: 200 });
};
