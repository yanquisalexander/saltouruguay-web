/**
 * Defines the default SEO configuration for the website.
 */
export const seoConfig = {
    description:
        "Comunidad de jugadores de Uruguay. Servidor de Minecraft, Discord, y mucho más.",
    type: "website",
    image: {
        url: "https://saltouruguayserver.com/og.png",
        alt: "Comunidad SaltoUruguayServer",
        width: 705,
        height: 606,
    },
    siteName: "SaltoUruguayServer",
    twitter: {
        card: "summary_large_image",
    },
};

export const computedTitle = (title?: string) =>
    title ? `${title} | ${seoConfig.siteName}` : seoConfig.siteName;