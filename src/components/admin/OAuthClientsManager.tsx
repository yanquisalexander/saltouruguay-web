import { useEffect, useState } from "preact/compat";
import { actions } from "astro:actions";
import {
  LucidePlus,
  LucideTrash2,
  LucideCheck,
  LucideX,
  LucideRefreshCw,
  LucideKey,
  LucideExternalLink,
  LucideLoader,
} from "lucide-preact";
import { toast } from "sonner";

interface Client {
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
  tokens: { id: string }[];
  createdAt: string;
}

export function OAuthClientsManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const loadClients = async () => {
    setLoading(true);
    const { data, error } = await actions.admin.oauth.list();
    if (error) {
      toast.error("Error loading clients");
      return;
    }
    setClients(data as unknown as Client[]);
    setLoading(false);
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleApprove = async (clientId: string) => {
    const { error } = await actions.admin.oauth.approve({ clientId });
    if (error) {
      toast.error("Failed to approve client");
      return;
    }
    toast.success("Client approved");
    loadClients();
  };

  const handleDeny = async (clientId: string) => {
    const { error } = await actions.admin.oauth.deny({ clientId });
    if (error) {
      toast.error("Failed to deny client");
      return;
    }
    toast.success("Client denied");
    loadClients();
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm("Are you sure you want to delete this client?")) return;
    const { error } = await actions.admin.oauth.delete({ clientId });
    if (error) {
      toast.error("Failed to delete client");
      return;
    }
    toast.success("Client deleted");
    loadClients();
  };

  const handleRegenerateSecret = async (clientId: string) => {
    const { data, error } = await actions.admin.oauth.regenerateSecret({ clientId });
    if (error) {
      toast.error("Failed to regenerate secret");
      return;
    }
    setNewSecret((data as { clientSecret: string }).clientSecret);
    toast.success("New secret generated");
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

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <p class="text-sm text-white/60">{clients.length} client{clients.length !== 1 ? "s" : ""}</p>
        <button
          onClick={() => setShowNewForm(true)}
          class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-md transition"
        >
          <LucidePlus class="h-4 w-4" />
          New Client
        </button>
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

      {showNewForm && (
        <NewClientForm
          onCreated={(secret) => {
            setNewSecret(secret);
            setShowNewForm(false);
            loadClients();
          }}
          onCancel={() => setShowNewForm(false)}
        />
      )}

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-white/10 text-left text-white/40 text-xs uppercase tracking-wider">
              <th class="py-3 pr-4">Name</th>
              <th class="py-3 pr-4">Owner</th>
              <th class="py-3 pr-4">Status</th>
              <th class="py-3 pr-4">Scopes</th>
              <th class="py-3 pr-4">Tokens</th>
              <th class="py-3 pr-4">Created</th>
              <th class="py-3">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            {clients.map((client) => (
              <tr key={client.id} class="hover:bg-white/5 transition">
                <td class="py-3 pr-4">
                  <div class="flex items-center gap-2">
                    {client.icon && (
                      <img src={client.icon} alt="" class="h-6 w-6 rounded object-cover" />
                    )}
                    <div>
                      <a
                        href={`/admin/developer/apps/${client.id}`}
                        class="text-white font-medium hover:text-indigo-400 transition"
                      >
                        {client.name}
                      </a>
                      {client.description && (
                        <p class="text-xs text-white/40 truncate max-w-[20ch]">{client.description}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td class="py-3 pr-4 text-white/60">{client.owner.displayName}</td>
                <td class="py-3 pr-4">{statusBadge(client.status)}</td>
                <td class="py-3 pr-4">
                  <div class="flex gap-1 flex-wrap">
                    {client.allowedScopes.map((s) => (
                      <span key={s} class="text-xs bg-white/10 px-1.5 py-0.5 rounded font-mono text-white/60">
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td class="py-3 pr-4 text-white/60">{client.tokens.length}</td>
                <td class="py-3 pr-4 text-white/40 text-xs">
                  {new Date(client.createdAt).toLocaleDateString()}
                </td>
                <td class="py-3">
                  <div class="flex items-center gap-1">
                    {client.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(client.id)}
                          class="p-1.5 hover:bg-green-500/20 rounded text-green-400 transition"
                          title="Approve"
                        >
                          <LucideCheck class="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeny(client.id)}
                          class="p-1.5 hover:bg-red-500/20 rounded text-red-400 transition"
                          title="Deny"
                        >
                          <LucideX class="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleRegenerateSecret(client.id)}
                      class="p-1.5 hover:bg-indigo-500/20 rounded text-indigo-400 transition"
                      title="Regenerate secret"
                    >
                      <LucideKey class="h-4 w-4" />
                    </button>
                    <a
                      href={`/admin/developer/apps/${client.id}`}
                      class="p-1.5 hover:bg-white/10 rounded text-white/40 transition"
                      title="Edit"
                    >
                      <LucideExternalLink class="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(client.id)}
                      class="p-1.5 hover:bg-red-500/20 rounded text-red-400 transition"
                      title="Delete"
                    >
                      <LucideTrash2 class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colspan="7" class="py-12 text-center text-white/30">
                  No OAuth clients registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewClientForm({
  onCreated,
  onCancel,
}: {
  onCreated: (secret: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [redirectUris, setRedirectUris] = useState<string[]>([""]);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const SCOPES = ["openid", "profile", "email", "saltotag:read"];

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const updateRedirectUri = (index: number, value: string) => {
    const uris = [...redirectUris];
    uris[index] = value;
    setRedirectUris(uris);
  };

  const addRedirectUri = () => setRedirectUris([...redirectUris, ""]);
  const removeRedirectUri = (index: number) => {
    if (redirectUris.length > 1) {
      setRedirectUris(redirectUris.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name is required");
    if (selectedScopes.length === 0) return toast.error("Select at least one scope");
    const validUris = redirectUris.filter((u) => u.trim());
    if (validUris.length === 0) return toast.error("At least one redirect URI is required");

    setSubmitting(true);
    const { data, error } = await actions.admin.oauth.create({
      name: name.trim(),
      description: description.trim() || undefined,
      website: website.trim() || undefined,
      redirectUris: validUris,
      allowedScopes: selectedScopes as any,
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message || "Failed to create client");
      return;
    }
    onCreated((data as { clientSecret: string }).clientSecret);
  };

  return (
    <form
      onSubmit={handleSubmit}
      class="bg-white/5 border border-white/10 rounded-md p-6 space-y-4"
    >
      <h3 class="text-lg font-medium text-white">New OAuth Client</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-xs text-white/40 uppercase tracking-wider">Name *</label>
          <input
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            placeholder="My App"
          />
        </div>
        <div class="space-y-1.5">
          <label class="text-xs text-white/40 uppercase tracking-wider">Website</label>
          <input
            value={website}
            onInput={(e) => setWebsite((e.target as HTMLInputElement).value)}
            class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            placeholder="https://example.com"
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-xs text-white/40 uppercase tracking-wider">Description</label>
        <textarea
          value={description}
          onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
          class="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none resize-none"
          rows={2}
          placeholder="Brief description of your app"
        />
      </div>

      <div class="space-y-1.5">
        <label class="text-xs text-white/40 uppercase tracking-wider">Redirect URIs *</label>
        {redirectUris.map((uri, i) => (
          <div key={i} class="flex items-center gap-2">
            <input
              value={uri}
              onInput={(e) => updateRedirectUri(i, (e.target as HTMLInputElement).value)}
              class="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              placeholder="https://example.com/callback"
            />
            <button
              type="button"
              onClick={() => removeRedirectUri(i)}
              class="p-2 hover:bg-red-500/20 rounded text-red-400 transition"
            >
              <LucideX class="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addRedirectUri}
          class="text-xs text-indigo-400 hover:text-indigo-300 transition"
        >
          + Add URI
        </button>
      </div>

      <div class="space-y-1.5">
        <label class="text-xs text-white/40 uppercase tracking-wider">Allowed Scopes *</label>
        <div class="flex flex-wrap gap-2">
          {SCOPES.map((scope) => (
            <button
              type="button"
              key={scope}
              onClick={() => toggleScope(scope)}
              class={`text-xs px-3 py-1.5 rounded transition border ${
                selectedScopes.includes(scope)
                  ? "bg-indigo-600/30 border-indigo-500 text-indigo-300"
                  : "bg-white/5 border-white/10 text-white/50 hover:text-white/80"
              }`}
            >
              {scope}
            </button>
          ))}
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          class="px-4 py-2 text-sm text-white/60 hover:text-white transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-md transition disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Client"}
        </button>
      </div>
    </form>
  );
}
