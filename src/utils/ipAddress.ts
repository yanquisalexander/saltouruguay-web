export type IpInfo = {
    ipVersion?: number;
    ipAddress: string;
    latitude?: number | null;
    longitude?: number | null;
    countryName?: string;
    countryCode?: string;
    capital?: string;
    phoneCodes?: number[];
    timeZones?: string[];
    zipCode?: string;
    cityName?: string;
    regionName?: string;
    continent?: string;
    continentCode?: string;
    currencies?: string[];
    languages?: string[];
    asn?: string;
    asnOrganization?: string;
    isProxy?: boolean;
};

/**
 * Obtiene información geográfica / ASN de una IP usando freeipapi.
 * Devuelve el primer objeto del array de respuesta o null si ocurre un error.
 */
export const getIpInfo = async (ipAddress: string): Promise<IpInfo | null> => {
    if (!ipAddress || typeof ipAddress !== "string") return null;

    try {
        const res = await fetch(`https://free.freeipapi.com/api/json/${encodeURIComponent(ipAddress)}`, {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });

        if (!res.ok) {
            // Si la API devuelve 4xx/5xx, no lanzar para mantener compatibilidad; devolver null
            console.error(`getIpInfo: API responded with status ${res.status}`);
            return null;
        }

        const data: unknown = await res.json();

        // Aceptar tanto un objeto como un array de objetos
        if (!data || (Array.isArray(data) && data.length === 0)) return null;

        const raw = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;

        const info: IpInfo = {
            ipVersion: typeof raw.ipVersion === "number" ? raw.ipVersion : undefined,
            ipAddress: String(raw.ipAddress ?? ipAddress),
            latitude: typeof raw.latitude === "number" ? raw.latitude : null,
            longitude: typeof raw.longitude === "number" ? raw.longitude : null,
            countryName: typeof raw.countryName === "string" ? raw.countryName : undefined,
            countryCode: typeof raw.countryCode === "string" ? raw.countryCode : undefined,
            capital: typeof raw.capital === "string" ? raw.capital : undefined,
            phoneCodes: Array.isArray(raw.phoneCodes) ? raw.phoneCodes.map((v) => Number(v)) : undefined,
            timeZones: Array.isArray(raw.timeZones) ? raw.timeZones.map(String) : undefined,
            zipCode: typeof raw.zipCode === "string" ? raw.zipCode : undefined,
            cityName: typeof raw.cityName === "string" ? raw.cityName : undefined,
            regionName: typeof raw.regionName === "string" ? raw.regionName : undefined,
            continent: typeof raw.continent === "string" ? raw.continent : undefined,
            continentCode: typeof raw.continentCode === "string" ? raw.continentCode : undefined,
            currencies: Array.isArray(raw.currencies) ? raw.currencies.map(String) : undefined,
            languages: Array.isArray(raw.languages) ? raw.languages.map(String) : undefined,
            asn: typeof raw.asn === "string" ? raw.asn : undefined,
            asnOrganization: typeof raw.asnOrganization === "string" ? raw.asnOrganization : undefined,
            isProxy: typeof raw.isProxy === "boolean" ? raw.isProxy : undefined,
        };

        return info;
    } catch (error) {
        console.error("getIpInfo: error fetching ip info", error);
        return null;
    }
};
