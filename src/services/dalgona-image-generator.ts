/**
 * Dalgona Cookie Image Generator
 * Generates SVG images of Dalgona (ppopgi) cookies with different shapes
 */

export type DalgonaShape = 'circle' | 'triangle' | 'star' | 'umbrella';

interface DalgonaImageOptions {
    shape: DalgonaShape;
    size?: number;
    variation?: number; // Small random variation to avoid memorization
}

/**
 * Generates an SVG representation of a Dalgona cookie with the specified shape
 */
export function generateDalgonaSVG(options: DalgonaImageOptions): string {
    const { shape, size = 400, variation = 0 } = options;
    
    // Cookie background color - caramel/honey color with slight variation
    const cookieColor = `hsl(${30 + variation}, 70%, 60%)`;
    
    // Darker outline for the shape
    const shapeColor = `hsl(${30 + variation}, 60%, 45%)`;
    
    // Generate shape path based on type
    const shapePath = getShapePath(shape, size, variation);
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <!-- Cookie texture -->
        <filter id="cookieTexture">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" result="noise"/>
            <feColorMatrix in="noise" type="saturate" values="0.3"/>
            <feComponentTransfer>
                <feFuncA type="discrete" tableValues="0.5"/>
            </feComponentTransfer>
            <feBlend in="SourceGraphic" in2="noise" mode="multiply"/>
        </filter>
        
        <!-- Inner shadow for shape -->
        <filter id="innerShadow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dx="2" dy="2" result="offsetblur"/>
            <feFlood flood-color="#000000" flood-opacity="0.3"/>
            <feComposite in2="offsetblur" operator="in"/>
            <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
    </defs>
    
    <!-- Cookie background circle -->
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 10}" 
            fill="${cookieColor}" 
            filter="url(#cookieTexture)"
            stroke="${shapeColor}" 
            stroke-width="2"/>
    
    <!-- Shape outline (pressed into the cookie) -->
    <g transform="translate(${size/2}, ${size/2})">
        <path d="${shapePath}" 
              fill="none" 
              stroke="${shapeColor}" 
              stroke-width="4" 
              stroke-linecap="round"
              stroke-linejoin="round"
              filter="url(#innerShadow)"/>
    </g>
</svg>`;
}

/**
 * Generates the SVG path for different shapes
 */
function getShapePath(shape: DalgonaShape, size: number, variation: number): string {
    const scale = size / 400; // Base scale
    const offset = variation * 0.5; // Small offset for variation
    
    switch (shape) {
        case 'circle':
            const radius = 80 * scale;
            return `M ${radius + offset},0 
                    A ${radius},${radius} 0 1,1 ${-radius + offset},0 
                    A ${radius},${radius} 0 1,1 ${radius + offset},0`;
        
        case 'triangle':
            const triSize = 100 * scale;
            return `M ${0 + offset},${-triSize * 0.7} 
                    L ${triSize + offset},${triSize * 0.5} 
                    L ${-triSize + offset},${triSize * 0.5} 
                    Z`;
        
        case 'star':
            const starPoints = 5;
            const outerRadius = 100 * scale;
            const innerRadius = 40 * scale;
            let starPath = '';
            
            for (let i = 0; i < starPoints * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (Math.PI / starPoints) * i - Math.PI / 2;
                const x = radius * Math.cos(angle) + offset;
                const y = radius * Math.sin(angle) + offset;
                starPath += `${i === 0 ? 'M' : 'L'} ${x},${y} `;
            }
            starPath += 'Z';
            return starPath;
        
        case 'umbrella':
            const umbSize = 90 * scale;
            // Umbrella canopy (arc)
            return `M ${-umbSize + offset},${-20 * scale}
                    Q ${-umbSize + offset},${-umbSize + offset} ${0 + offset},${-umbSize + offset}
                    Q ${umbSize + offset},${-umbSize + offset} ${umbSize + offset},${-20 * scale}
                    M ${0 + offset},${-umbSize + offset}
                    L ${0 + offset},${umbSize + offset}
                    Q ${0 + offset},${umbSize + 20 * scale + offset} ${15 * scale + offset},${umbSize + 20 * scale + offset}`;
        
        default:
            return '';
    }
}

/**
 * Converts SVG to base64 data URI
 */
export function svgToDataUri(svg: string): string {
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Generates a complete Dalgona image with random variation
 */
export function generateDalgonaImage(shape: DalgonaShape, size: number = 400): string {
    // Random variation between -3 and 3 for slight differences
    const variation = Math.floor(Math.random() * 7) - 3;
    
    const svg = generateDalgonaSVG({ shape, size, variation });
    return svgToDataUri(svg);
}
