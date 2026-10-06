/**
 * Dalgona Cookie Image Generator
 * Generates SVG images of Dalgona (ppopgi) cookies with different shapes
 */

export enum DalgonaShape {
    Circle = 'circle',
    Triangle = 'triangle',
    Star = 'star',
    Umbrella = 'umbrella',
}

export interface DalgonaShapeData {
    type: DalgonaShape;
    points: { x: number; y: number }[];
}

interface DalgonaImageOptions {
    shape: DalgonaShape;
    size?: number;
}

/**
 * Paleta calibrada contra SHAPE_BRIGHTNESS_THRESHOLD (cliente, 160):
 * - Todo lo "galleta" promedia >= 165 (tallable, cuenta progreso)
 * - Todo lo "figura" promedia <= 110 (mortal al tocar)
 * No usar filtros SVG: renderizan inconsistente en drawImage a canvas.
 */
const COOKIE_LIGHT = "#f3d9a8";
const COOKIE_MID = "#eec184";
const COOKIE_EDGE = "#e0ac63";
const COOKIE_RIM = "#a86a24";
const SUGAR_DOT = "#f7e3bd";
const GROOVE = "#f2d49b";
const SHAPE_FILL = "#4a2408";
const SHAPE_STROKE = "#2e1503";
const SHAPE_ENGRAVE = "#7a3f12";

/** Motas de azúcar deterministas (anillo dorado, sin random para consistencia) */
function sugarDots(cx: number, cy: number): string {
    let dots = "";
    for (let i = 0; i < 110; i++) {
        const angle = i * 2.39996; // golden angle
        const r = 46 + ((i * 53) % 128);
        const x = (cx + r * Math.cos(angle)).toFixed(1);
        const y = (cy + r * Math.sin(angle)).toFixed(1);
        const rad = (1.4 + ((i * 29) % 20) / 10).toFixed(1);
        const op = (0.5 + ((i * 17) % 40) / 100).toFixed(2);
        dots += `<circle cx="${x}" cy="${y}" r="${rad}" fill="${SUGAR_DOT}" opacity="${op}"/>`;
    }
    return dots;
}

/**
 * Generates an SVG representation of a Dalgona cookie with the specified shape
 */
export function generateDalgonaSVG(options: DalgonaImageOptions): string {
    const { shape, size = 400 } = options;
    const c = size / 2;
    const cookieR = size / 2 - 10;

    // Generate shape path based on type
    const shapePath = getShapePath(shape, size);

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <radialGradient id="cookieGrad" cx="42%" cy="38%" r="75%">
            <stop offset="0%" stop-color="${COOKIE_LIGHT}"/>
            <stop offset="55%" stop-color="${COOKIE_MID}"/>
            <stop offset="100%" stop-color="${COOKIE_EDGE}"/>
        </radialGradient>
    </defs>
    <!-- Cookie tostada con borde -->
    <circle cx="${c}" cy="${c}" r="${cookieR}"
            fill="url(#cookieGrad)"
            stroke="${COOKIE_RIM}"
            stroke-width="4"/>
    <!-- Motas de azúcar (quedan bajo la figura) -->
    ${sugarDots(c, c)}

    <!-- Figura: surco de azúcar + relleno oscuro + grabado interior -->
    <g transform="translate(${c}, ${c})">
        <path d="${shapePath}"
              fill="none"
              stroke="${GROOVE}"
              stroke-width="11"
              stroke-linecap="round"
              stroke-linejoin="round"
              opacity="0.9"/>
        <path d="${shapePath}"
              fill="${SHAPE_FILL}"
              stroke="${SHAPE_STROKE}"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"/>
        <path d="${shapePath}"
              transform="scale(0.55)"
              fill="none"
              stroke="${SHAPE_ENGRAVE}"
              stroke-width="5"
              stroke-linecap="round"
              stroke-linejoin="round"/>
    </g>
</svg>`;
}

/**
 * Generates the SVG path for different shapes
 */
function getShapePath(shape: DalgonaShape, size: number): string {
    const scale = size / 400; // Base scale

    switch (shape) {
        case DalgonaShape.Circle:
            const radius = 80 * scale;
            return `M ${radius},0 
                    A ${radius},${radius} 0 1,1 ${-radius},0 
                    A ${radius},${radius} 0 1,1 ${radius},0`;

        case DalgonaShape.Triangle:
            const triSize = 100 * scale;
            return `M ${0},${-triSize * 0.7} 
                    L ${triSize},${triSize * 0.5} 
                    L ${-triSize},${triSize * 0.5} 
                    Z`;

        case DalgonaShape.Star:
            const starPoints = 5;
            const outerRadius = 100 * scale;
            const innerRadius = 40 * scale;
            let starPath = '';

            for (let i = 0; i < starPoints * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (Math.PI / starPoints) * i - Math.PI / 2;
                const x = radius * Math.cos(angle);
                const y = radius * Math.sin(angle);
                starPath += `${i === 0 ? 'M' : 'L'} ${x},${y} `;
            }
            starPath += 'Z';
            return starPath;

        case DalgonaShape.Umbrella:
            const umbSize = 90 * scale;
            // Umbrella canopy (arc)
            return `M ${-umbSize},${-20 * scale}
                    Q ${-umbSize},${-umbSize} ${0},${-umbSize}
                    Q ${umbSize},${-umbSize} ${umbSize},${-20 * scale}
                    M ${0},${-umbSize}
                    L ${0},${umbSize}
                    Q ${0},${umbSize + 20 * scale} ${15 * scale},${umbSize + 20 * scale}`;

        default:
            return '';
    }
}

/**
 * Generates cartesian points for shape validation
 */
function getShapePoints(shape: DalgonaShape, size: number = 400): { x: number; y: number }[] {
    const scale = size / 400; // Base scale
    const centerX = size / 2;
    const centerY = size / 2;

    let points: { x: number; y: number }[] = [];

    switch (shape) {
        case DalgonaShape.Circle:
            const radius = 80 * scale;
            // Generate points along the circle
            for (let i = 0; i < 64; i++) {
                const angle = (i / 64) * 2 * Math.PI;
                points.push({
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle),
                });
            }
            break;

        case DalgonaShape.Triangle:
            const triSize = 100 * scale;
            points = [
                { x: centerX, y: centerY - triSize * 0.7 },
                { x: centerX + triSize, y: centerY + triSize * 0.5 },
                { x: centerX - triSize, y: centerY + triSize * 0.5 },
                { x: centerX, y: centerY - triSize * 0.7 }, // Close the triangle
            ];
            break;

        case DalgonaShape.Star:
            const starPoints = 5;
            const outerRadius = 100 * scale;
            const innerRadius = 40 * scale;

            for (let i = 0; i < starPoints * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (Math.PI / starPoints) * i - Math.PI / 2;
                points.push({
                    x: centerX + radius * Math.cos(angle),
                    y: centerY + radius * Math.sin(angle),
                });
            }
            points.push(points[0]); // Close the star
            break;

        case DalgonaShape.Umbrella:
            const umbSize = 90 * scale;
            // Generate points along the umbrella canopy curve (approximating the quadratic Bézier)
            // The SVG path is: M -umbSize,-20*scale Q -umbSize,-umbSize 0,-umbSize Q umbSize,-umbSize umbSize,-20*scale
            // We'll approximate this with multiple points

            // Left curve: from (-umbSize, -20*scale) to (0, -umbSize) with control point (-umbSize, -umbSize)
            for (let i = 0; i <= 16; i++) {
                const t = i / 16;
                // Quadratic Bézier: B(t) = (1-t)²*P0 + 2*(1-t)*t*P1 + t²*P2
                const p0x = -umbSize;
                const p0y = -20 * scale;
                const p1x = -umbSize;
                const p1y = -umbSize;
                const p2x = 0;
                const p2y = -umbSize;

                const x = (1 - t) * (1 - t) * p0x + 2 * (1 - t) * t * p1x + t * t * p2x;
                const y = (1 - t) * (1 - t) * p0y + 2 * (1 - t) * t * p1y + t * t * p2y;

                points.push({ x: centerX + x, y: centerY + y });
            }

            // Right curve: from (0, -umbSize) to (umbSize, -20*scale) with control point (umbSize, -umbSize)
            for (let i = 1; i <= 16; i++) {
                const t = i / 16;
                // Quadratic Bézier: B(t) = (1-t)²*P0 + 2*(1-t)*t*P1 + t²*P2
                const p0x = 0;
                const p0y = -umbSize;
                const p1x = umbSize;
                const p1y = -umbSize;
                const p2x = umbSize;
                const p2y = -20 * scale;

                const x = (1 - t) * (1 - t) * p0x + 2 * (1 - t) * t * p1x + t * t * p2x;
                const y = (1 - t) * (1 - t) * p0y + 2 * (1 - t) * t * p1y + t * t * p2y;

                points.push({ x: centerX + x, y: centerY + y });
            }

            // Handle/stem - simplified as a straight line
            points.push({ x: centerX, y: centerY - umbSize });
            points.push({ x: centerX, y: centerY + umbSize });
            // Handle curve at bottom
            points.push({ x: centerX + 15 * scale, y: centerY + umbSize + 20 * scale });
            break;

        default:
            points = [];
            break;
    }

    return points;
}

/**
 * Creates a complete shape data object with type and points
 */
export function createDalgonaShapeData(shape: DalgonaShape, size: number = 400): DalgonaShapeData {
    return {
        type: shape,
        points: getShapePoints(shape, size),
    };
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
    // Remove random variation for consistency
    const variation = 0;

    const svg = generateDalgonaSVG({ shape, size });
    return svgToDataUri(svg);
}
