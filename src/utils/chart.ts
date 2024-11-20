interface DatasetConfig {
    label: string;
    data: number[]
    borderColor?: string;
    backgroundColor?: string;
    borderWidth?: number;
    fill?: boolean;
    tension?: number; // Para las líneas curvas en gráficos de tipo "line"
}

export const createDataset = (config: DatasetConfig) => {
    return {
        label: config.label,
        data: config.data,
        borderColor: config.borderColor || "rgba(75, 192, 192, 1)",
        backgroundColor: config.backgroundColor || "rgba(75, 192, 192, 0.2)",
        borderWidth: config.borderWidth || 2,
        fill: config.fill ?? true, // Default a `true`
        tension: config.tension || 0.4, // Default para gráficos de tipo "line"
    };
};
