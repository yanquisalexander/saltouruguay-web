import { useEffect, useState } from "preact/compat";
import { actions } from "astro:actions";
import {
  LucideCopy,
  LucideCheck,
  LucideX,
  LucideTrash2,
  LucideLoader,
  LucideRefreshCw,
  LucideKey,
} from "lucide-preact";
import { toast } from "sonner";

interface Props {
  clientId: string;
}

interface ClientData {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  website: string | null;
  status: "pending" | "approved" | "denied";
  clientSecret: string;
  allowedScopes: string[];
  redirectUris: { redirectUri: string }[];
  owner: { id: number; email: string; displayName: string };
  createdAt: string;
}

export function OAuthClientEditor({ clientId }: Props) {
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tokens, setTokens] = useState<any[]>([]);
  const [showSecret, setShowSecret] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const loadClient = async () => {
    setLoading(true);
    const { data, error } = await actions.admin.oauth.get({ clientId });
    if (error) {
      toast.error("Failed to load client");
      return;
    }
    setClient(data as unknown as ClientData);
    setLoading(false);
  };

  const loadTokens = async () => {
    const { data, error } = await actions.admin.oauth.getTokens({ clientId });
    if (!error) {
      setTokens(data as any[]);
    }
  };

  useEffect(() => {
    loadClient();
    loadTokens();
  }, [clientId]);

  const handleSave = async () => {
    if (!client) return;
    setSaving(true);
    const { error } = await actions.admin.oauth.update({
      clientId: client.id,
      name: client.name,
      description: client.description,
      icon: client.icon,
      website: client.website,
      allowedScopes: client.allowedScopes as any,
      redirectUris: client.redirectUris.map((r) => r.redirectUri),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message || "Failed to update client");
      return;
    }
    toast.success("Client updated");
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this client? This will revoke all tokens.")) {
      return;
    }
    const { error } = await actions.admin.oauth.delete({ clientId });
    if (error) {
      toast.error("Failed to delete client");
      return;
    }
    toast.success("Client deleted");
    window.location.href = "/admin/developer/apps";
  };

  const handleRegenerateSecret = async () => {
    const { data, error } = await actions.admin.oauth.regenerateSecret({ clientId });
    if (error) {
      toast.error("Failed to regenerate secret");
      return;
    }
    setNewSecret((data as { clientSecret: string }).clientSecret);
    toast.success("New secret generated");
  };

  const handleRevokeToken = async (tokenId: string) => {
    const { error } = await actions.admin.oauth.revokeToken({ tokenId });
    if (error) {
      toast.error("Failed to revoke token");
      return;
    }
    toast.success("Token revoked");
    loadTokens();
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-400",
      approved: "bg-green-500/20 text-green-400",
      denied: "bg-red-500/20 text-red-400",
    };
    return (
      <span class={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || ""}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div class="flex items-center justify-center py-12">
        <LucideLoader class="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (!client) {
    return <p class="text-white/60">Client not found.</p>;
  }

  const SCOPES = ["openid", "profile", "email", "saltotag:read"];

  return (
    <div class="space-y-8">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          {client.icon && <img src={client.icon} alt="" class="h-10 w-10 rounded object-cover" />}
          <div>
            <h2 class="text-xl font-bold text-white">{client.name}</h2>
            <p class="text-xs text-white/40">Client ID: {client.id}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          {statusBadge(client.status)}
          {client.status === "pending" && (
            <>
              <button
                onClick={async () => {
                  await actions.admin.oauth.approve({ clientId });
                  loadClient();
                }}
                class="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition"
              >
                Approve
              </button>
              <button
                onClick={async () => {
                  await actions.admin.oauth.deny({ clientId });
                  loadClient();
                }}
                class="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition"
              >
                Deny
              </button>
            </>
          )}
          <button
            onClick={handleDelete}
            class="p-2 hover:bg-red-500/20 rounded text-red-400 transition"
            title="Delete client"
          >
            <LucideTrash2 class="h-4 w-4" />
          </button>
        </div>
      </div>

      {newSecret && (
        <div class="bg-indigo-900/30 border border-indigo-500/30 rounded-md p-4 space-y-2">
          <p class="text-sm font-medium text-indigo-300">New Client Secret</p>
          <p class="text-xs text-white/70">Copy this now. You won't be able to see it again.</p>
          <div class="flex gap-2">
            <code class="flex-1 bg-black/40 px-3 py-2 rounded text-sm font-mono text-white break-all">
              {newSecret}
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(newSecret); toast.success("Copied!"); }}
              class="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded transition shrink-0"
            >
              Copy
            </button>
          </div>
          <button
            onClick={() => setNewSecret(null)}
            class="text-xs text-white/50 hover:text-white transition"
          >
            Dismiss
          </button>
        </div>
      )}

      <div class="bg-white/5 border border-white/10 rounded-md p-6 space-y-4">
        <h3 class="text-sm font-medium text-white/60 uppercase tracking-wider">Settings</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-xs text-white/40">Name</label>
            <input
              value={client.name}
              onInput={(e) => setClient({ ...client, name: (e.target as HTMLInputElement).value })}
              class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-xs text-white/40">Website</label>
            <input
              value={client.website || ""}
              onInput={(e) => setClient({ ...client, website: (e.target as HTMLInputElement).value || null })}
              class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs text-white/40">Icon URL</label>
          <input
            value={client.icon || ""}
            onInput={(e) => setClient({ ...client, icon: (e.target as HTMLInputElement).value || null })}
            class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            placeholder="https://example.com/icon.png"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-xs text-white/40">Description</label>
          <textarea
            value={client.description || ""}
            onInput={(e) =>
              setClient({ ...client, description: (e.target as HTMLTextAreaElement).value || null })
            }
            class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none resize-none"
            rows={3}
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-xs text-white/40">Redirect URIs</label>
          {client.redirectUris.map((uri, i) => (
            <div key={i} class="flex items-center gap-2">
              <input
                value={uri.redirectUri}
                onInput={(e) => {
                  const uris = [...client.redirectUris];
                  uris[i] = { ...uris[i], redirectUri: (e.target as HTMLInputElement).value };
                  setClient({ ...client, redirectUris: uris });
                }}
                class="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (client.redirectUris.length <= 1) return;
                  setClient({
                    ...client,
                    redirectUris: client.redirectUris.filter((_, j) => j !== i),
                  });
                }}
                class="p-2 hover:bg-red-500/20 rounded text-red-400 transition"
              >
                <LucideX class="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setClient({ ...client, redirectUris: [...client.redirectUris, { redirectUri: "" }] })
            }
            class="text-xs text-indigo-400 hover:text-indigo-300 transition"
          >
            + Add URI
          </button>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs text-white/40">Allowed Scopes</label>
          <div class="flex flex-wrap gap-2">
            {SCOPES.map((scope) => {
              const selected = client.allowedScopes.includes(scope);
              return (
                <button
                  type="button"
                  key={scope}
                  onClick={() => {
                    setClient({
                      ...client,
                      allowedScopes: selected
                        ? client.allowedScopes.filter((s) => s !== scope)
                        : [...client.allowedScopes, scope],
                    });
                  }}
                  class={`text-xs px-3 py-1.5 rounded transition border ${selected
                      ? "bg-indigo-600/30 border-indigo-500 text-indigo-300"
                      : "bg-white/5 border-white/10 text-white/50 hover:text-white/80"
                    }`}
                >
                  {scope}
                </button>
              );
            })}
          </div>
        </div>

        <div class="flex items-center justify-between pt-2">
          <div class="flex items-center gap-2">
            <LucideKey class="h-4 w-4 text-white/30" />
            <span class="text-xs text-white/40 font-mono">
              {showSecret ? client.clientSecret : "••••••••••••••••"}
            </span>
            <button
              onClick={() => setShowSecret(!showSecret)}
              class="text-xs text-indigo-400 hover:text-indigo-300 transition"
            >
              {showSecret ? "Hide" : "Show"}
            </button>
            <button
              onClick={handleRegenerateSecret}
              class="p-1 hover:bg-indigo-500/20 rounded text-indigo-400 transition"
              title="Regenerate secret"
            >
              <LucideRefreshCw class="h-3 w-3" />
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-md transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div class="bg-white/5 border border-white/10 rounded-md p-6 space-y-4">
        <h3 class="text-sm font-medium text-white/60 uppercase tracking-wider">
          Active Tokens ({tokens.length})
        </h3>
        {tokens.length === 0 ? (
          <p class="text-sm text-white/30">No active tokens.</p>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-white/10 text-left text-white/40 text-xs uppercase tracking-wider">
                  <th class="py-2 pr-4">User</th>
                  <th class="py-2 pr-4">Scopes</th>
                  <th class="py-2 pr-4">Created</th>
                  <th class="py-2 pr-4">Expires</th>
                  <th class="py-2">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                {tokens.map((token: any) => (
                  <tr key={token.id} class="hover:bg-white/5">
                    <td class="py-2 pr-4">
                      <div class="flex items-center gap-2">
                        {token.user?.avatar && (
                          <img src={token.user.avatar} alt="" class="h-6 w-6 rounded-full object-cover" />
                        )}
                        <span class="text-white">{token.user?.displayName || `#${token.userId}`}</span>
                      </div>
                    </td>
                    <td class="py-2 pr-4">
                      <div class="flex gap-1 flex-wrap">
                        {token.scopes?.map((s: string) => (
                          <span class="text-xs bg-white/10 px-1.5 py-0.5 rounded font-mono text-white/60">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td class="py-2 pr-4 text-white/40 text-xs">
                      {new Date(token.createdAt).toLocaleDateString()}
                    </td>
                    <td class="py-2 pr-4 text-white/40 text-xs">
                      {new Date(token.accessTokenExpiresAt).toLocaleDateString()}
                    </td>
                    <td class="py-2">
                      <button
                        onClick={() => handleRevokeToken(token.id)}
                        class="p-1 hover:bg-red-500/20 rounded text-red-400 transition"
                        title="Revoke"
                      >
                        <LucideX class="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
