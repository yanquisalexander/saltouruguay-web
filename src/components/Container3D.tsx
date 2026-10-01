import Atropos from 'atropos/react'
import "atropos/css"
import type { ComponentChildren } from "preact"

interface Props {
    children: ComponentChildren
}

export const Container3D = ({ children }: Props) => {
    return (
        // Quitamos divs wrapper innecesarios para limpiar el DOM
        <div className='relative z-10 w-full h-auto mx-auto perspective-1000 max-w-full overflow-hidden sm:overflow-visible'>
            <Atropos
                // Opciones para suavizar el efecto 3D
                activeOffset={20}
                shadowScale={1.02}
                rotateXMax={12} // Limitamos la rotación para que no sea exagerada
                rotateYMax={12}
                highlight={false} // El brillo lo manejamos nosotros en el CSS de la tarjeta

                // REPARACIÓN CLAVE: Ajustar el rounded para que coincida con la MemberCard nueva (24px)
                innerClassName='rounded-[24px] overflow-hidden'
                className='block w-full h-auto mx-auto shadow-2xl rounded-[24px] overflow-hidden'
            >
                {children}
            </Atropos>
        </div>
    )
}