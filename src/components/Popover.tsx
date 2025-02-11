import {
    useFloating,
    autoUpdate,
    offset,
    flip,
    shift,
    useHover,
    useRole,
    useInteractions,
    FloatingArrow,
    arrow,
    type Placement
} from '@floating-ui/react';

import type { ComponentChildren, JSX } from 'preact';
import { useState, useRef } from 'preact/hooks';

export const Popover = ({
    activator,
    className,
    children,
    placement = 'top'
}: {
    activator: JSX.Element;
    className?: string;
    children: ComponentChildren;
    placement?: Placement;
}) => {
    const [open, setOpen] = useState(false);
    const arrowRef = useRef(null); // Referencia para la flecha

    const { refs, floatingStyles, context } = useFloating({
        placement,
        middleware: [
            offset(8),
            flip(),
            shift(),
            arrow({ element: arrowRef.current }) // Agregamos la flecha
        ],
        whileElementsMounted: autoUpdate
    });

    // Manejo de interacciones (hover y accesibilidad)
    const hover = useHover(context, { move: false });
    const role = useRole(context, { role: 'tooltip' });
    const { getReferenceProps, getFloatingProps } = useInteractions([hover, role]);

    return (
        <div>
            {/* Activador con referencia */}
            <div ref={refs.setReference} {...getReferenceProps()} onClick={() => setOpen(!open)}>
                {activator}
            </div>

            {/* Contenido flotante */}
            {open && (
                <div
                    ref={refs.setFloating}
                    className={className}
                    style={{
                        ...floatingStyles,
                        zIndex: 999,
                    }}
                    {...getFloatingProps()}
                >
                    {children}
                    <FloatingArrow ref={arrowRef} context={context} fill="#fff" />
                </div>
            )}
        </div>
    );
};
