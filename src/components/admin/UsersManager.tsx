import { actions, type SafeResult } from "astro:actions";
import { useEffect, useState, useCallback } from "preact/hooks";

export const UsersManager = () => {
    const [users, setUsers] = useState<SafeResult<
        { search?: string; limit?: number; page?: number },
        { id: number; email: string; twitchId: string | null; displayName: string; username: string; avatar: string | null; updatedAt: Date }[]
    > | null>(null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const { error, data } = await actions.admin.users.getUsers({ search });
            // @ts-ignore            setUsers({ data, error });
        } catch (e) {
            // @ts-ignore            setUsers({ data, error });

            setUsers({ data: undefined, error: e as Error });
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    return (
        <div>
            <h1>Users Manager</h1>
            <div style={{ marginBottom: "1rem" }}>
                <input
                    type="text"
                    value={search}
                    onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
                    placeholder="Search users..."
                    style={{ marginRight: "0.5rem" }}
                />
                <button onClick={fetchUsers} disabled={loading}>
                    {loading ? "Searching..." : "Search"}
                </button>
            </div>

            {users?.error && <p style={{ color: "red" }}>Error: {users.error.message}</p>}

            {loading && <p>Loading users...</p>}

            {users?.data && (
                <ul>
                    {users.data.length > 0 ? (
                        users.data.map((user) => (
                            <li key={user.id}>
                                {user.displayName} - {user.username}
                            </li>
                        ))
                    ) : (
                        <p>No users found.</p>
                    )}
                </ul>
            )}
        </div>
    );
};
