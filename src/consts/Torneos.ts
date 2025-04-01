export const TORNEOS = [
    {
        id: 'liga-fortnite',
        name: 'Liga Fortnite',
        banner: '/images/torneos/liga-fortnite/banner.webp',
    }
]

const TORNEOS_CATEGORY_ID = 4

export const fetchTorneos = async () => {
    const url = `https://cms.saltouruguayserver.com/wp-json/wp/v2/posts?_embed&categories=${TORNEOS_CATEGORY_ID}`

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Error al obtener los datos');
        }

        const posts = await response.json();

        // Mapeamos los datos relevantes
        const formattedPosts = posts.map((post: any) => ({
            slug: post.slug,
            title: post.title.rendered, // Título del post
            excerpt: post.excerpt.rendered?.replace(/<\/?[^>]+(>|$)/g, ""),
            link: post.link, // Enlace al post
            featuredImage: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null, // Imagen destacada
        }));

        return formattedPosts;
    } catch (error) {
        console.error('Error fetching posts:', error);
        return [];
    }
}

export const fetchTorneo = async (slug: string) => {
    const url = `https://cms.saltouruguayserver.com/wp-json/wp/v2/posts?_embed&slug=${slug}`

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Error al obtener los datos');
        }

        const posts = await response.json();

        if (posts.length === 0) {
            throw new Error('No se encontró el torneo');
        }

        const post = posts[0];

        // Mapeamos los datos relevantes
        const formattedPost = {
            title: post.title.rendered, // Título del post
            content: post.content.rendered, // Contenido (HTML incluido)
            featuredImage: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null, // Imagen destacada
        };

        return formattedPost;
    } catch (error) {
        console.error('Error fetching post:', error);
        return null;
    }
}

export const getPostBySlug = async (slug: string) => {
    const url = `https://cms.saltouruguayserver.com/wp-json/wp/v2/posts?_embed&slug=${slug}`

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Error al obtener los datos');
        }

        const posts = await response.json();

        if (posts.length === 0) {
            throw new Error('No se encontró el post');
        }

        const post = posts[0];

        // Mapeamos los datos relevantes
        const formattedPost = {
            title: post.title.rendered, // Título del post
            content: post.content.rendered, // Contenido (HTML incluido)
            featuredImage: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null, // Imagen destacada
        };

        return formattedPost;
    } catch (error) {
        console.error('Error fetching post:', error);
        return null;
    }
}

export const TournamentType = {
    SINGLE_ELIMINATION: 'single_elimination',
    DOUBLE_ELIMINATION: 'double_elimination',
    ROUND_ROBIN: 'round_robin',
    GROUP_KNOCKOUT: 'group_knockout',
    SWISS: 'swiss',
} as const;

export const TournamentStatus = {
    DRAFT: 'draft',
    REGISTRATION: 'registration',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
} as const;

export const TournamentParticipantStatus = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
} as const;

export const TournamentMatchStatus = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    FORFEITED: 'forfeited',
} as const;
