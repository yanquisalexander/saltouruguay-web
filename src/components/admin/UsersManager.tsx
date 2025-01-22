import { actions, type SafeResult } from "astro:actions";
import { useEffect, useState, useCallback } from "preact/hooks";

export const UsersManager = () => {
    const [users, setUsers] = useState<SafeResult<
        { search?: string; limit?: number; page?: number },
        { id: number; email: string; twitchId: string | null; displayName: string; username: string; avatar: string | null; updatedAt: Date }[]
    > | null>(null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        try {
            const { error, data } = await actions.admin.users.getUsers({ search, limit: 10, page });
            if (data) {
                setUsers({ data: data.users, error });
                // Simulated total pages (replace with API response if available)
                setTotalPages(data.totalPages);
            }
        } catch (e) {
            // @ts-expect-error 
            setUsers({ data: undefined, error: e as Error });
        } finally {
            setLoading(false);
        }
    }, [search, page]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleNextPage = () => {
        if (page < totalPages) setPage((prev) => prev + 1);
    };

    const handlePrevPage = () => {
        if (page > 1) setPage((prev) => prev - 1);
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">
                Usuarios
            </h1>
            <div className="flex items-center mb-4">
                <input
                    type="text"
                    value={search}
                    onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
                    placeholder="Buscar..."
                    className="border border-white/20 p-2 rounded mr-2 bg-neutral-900"
                />
                <button
                    onClick={fetchUsers}
                    disabled={loading}
                    className="bg-blue-500/20  text-white px-4 py-2 rounded disabled:bg-gray-900"
                >
                    {loading ? "Searching..." : "Search"}
                </button>
            </div>

            {users?.error && <p className="text-red-500">Error: {users.error.message}</p>}

            {loading && <p>Loading users...</p>}

            {users?.data && (
                <div>
                    <ul className="pl-5">
                        {users.data.length > 0 ? (
                            users.data.map((user) => (
                                <li key={user.id} className="mb-2">
                                    <div className="flex items-center">
                                        <img
                                            src={user.avatar || "https://via.placeholder.com/40"}
                                            alt={user.displayName}
                                            className="w-10 h-10 rounded-full mr-3"
                                        />
                                        <span>{user.displayName} - {user.username}</span>
                                    </div>
                                </li>
                            ))
                        ) : (
                            <p>No users found.</p>
                        )}
                    </ul>

                    <div className="flex justify-between items-center mt-4">
                        <button
                            onClick={handlePrevPage}
                            disabled={page === 1}
                            className="bg-blue-500/20 text-white px-4 py-2 rounded disabled:bg-gray-900"
                        >
                            Prev
                        </button>
                        <span>Página {page} de {totalPages}</span>
                        <button
                            onClick={handleNextPage}
                            disabled={page === totalPages}
                            className="bg-blue-500/20 text-white px-4 py-2 rounded disabled:bg-gray-900"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}