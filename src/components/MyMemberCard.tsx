import type { Session } from "@auth/core/types";
import { Container3D } from "./Container3D";
import { MemberCard } from "./MemberCard";
import { useEffect, useState } from "preact/hooks";
import { DownloadIcon, LoaderIcon, ShareIcon } from "lucide-preact";
import { toPng } from "html-to-image";
import { $ } from "@/lib/dom-selector";
import { STICKERS } from "@/consts/Stickers";
import { actions } from "astro:actions";
import { toast } from "sonner";
import { MemberCardSkins } from "@/consts/MemberCardSkins";
import { Tooltip } from "./Tooltip";

export const MyMemberCard = ({ session, stickers = [], tier, initialSkin = 'classic' }: { session: Session, stickers: string[], tier: number | null, initialSkin: typeof MemberCardSkins[number]['id'] }) => {
    const [selectedStickers, setSelectedStickers] = useState(() => {
        const stickersList = new Array(3).fill(null)
        stickers.forEach((sticker, index) => {
            stickersList[index] = sticker
        })
        return {
            limit: tier === null ? 0 : tier,
            list: stickersList,
        }
    })
    const [generating, setGenerating] = useState(false)
    const [skin, setSkin] = useState(initialSkin)

    const shareMyCard = () => {
        const message = `¡Hola! Soy Miembro Saltano, ¡conoce más sobre mí! 🚀🇺🇾

        https://saltouruguayserver.com/comunidad/member-card?memberId=${session?.user?.id}
        `.trim()

        if (navigator.share) {
            navigator.share({
                title: 'Miembro Saltano',
                text: message,
                url: `https://saltouruguayserver.com/comunidad/member-card?memberId=${session?.user?.id}`
            })
        } else {
            navigator.clipboard.writeText(message)
            alert('Copied to clipboard!')
        }
    }

    const username = session?.user?.name as string
    const avatar = session?.user?.image as string

    async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
        const res = await fetch(dataUrl)
        const blob = await res.blob()
        return new File([blob], fileName, { type: 'image/jpg' })
    }

    async function generateImage() {
        const $saveButton = $('.save-button')
        const $memberCard = $('#member-card')
        if ($memberCard) {
            setGenerating(true)
            const dataUrl = await toPng($memberCard, {
                quality: 0.8
            })

            const file = await dataUrlToFile(dataUrl, 'card.png')
            const filename = 'card.png'

            // Set href and download attributes
            $saveButton && $saveButton.setAttribute('href', URL.createObjectURL(file))
            $saveButton && $saveButton.setAttribute('download', filename)
            setGenerating(false)
        }
    }

    const updateStickers = async (newStickers: string[]) => {
        generateImage()
        const stickersList = new Array(3).fill(null)
        newStickers.forEach((sticker, index) => {
            stickersList[index] = sticker
        })

        const { error } = await actions.updateStickers({
            stickers: stickersList,
        })



        if (error) {
            console.error('Failed to update stickers')
            return
        }

        toast.success('Stickers actualizados')
    }



    const handleSelectSticker = async (selectedSticker: string) => {
        const newStickers = selectedStickers.list
        const emptyIndex = newStickers.indexOf(null)
        if (emptyIndex === -1) return

        if (newStickers.includes(selectedSticker)) return
        if (selectedStickers.limit <= newStickers.filter(Boolean).length) return

        newStickers[emptyIndex] = selectedSticker
        setSelectedStickers({
            limit: selectedStickers.limit,
            list: newStickers,
        })

        await updateStickers(newStickers)
    }


    const handleRemoveSticker = async (index: number) => {
        const newStickers = selectedStickers.list
        newStickers[index] = null

        // Sometimes, user downgrades their tier and the limit is reduced
        // This cause a bug where the user can't remove or add stickers
        // Remove all last stickers if the limit is reduced
        if (selectedStickers.limit < newStickers.filter(Boolean).length) {
            for (let i = newStickers.length - 1; i >= 0; i--) {
                if (newStickers[i] !== null) {
                    newStickers[i] = null
                    break
                }
            }
        }
        setSelectedStickers({
            limit: selectedStickers.limit,
            list: newStickers,
        })

        await updateStickers(newStickers)
    }

    useEffect(() => {
        generateImage()
        // Generate image on initial render
    }, [])

    const handleSkinChange = async (skin: typeof MemberCardSkins[number]['id']) => {
        setSkin(skin)

        const { error } = await actions.updateMemberCardSkin({ skin })

        if (error) {
            toast.error('Error al actualizar la skin de la tarjeta')
            return
        }

        await generateImage()

        toast.success('Skin actualizada')
    }



    return (
        <>
            <div>
                <div class="w-auto">
                    <div aria-disabled className='w-[732px] -mb-[366px] relative -left-[200vw]'>
                        <div id='member-card' className='border-[16px] border-transparent'>
                            <Container3D>
                                <MemberCard
                                    className="max-w-[400px] md:max-w-[700px] mx-auto"
                                    number={parseInt(session?.user?.id as string)}
                                    selectedStickers={selectedStickers}
                                    skin={skin}
                                    user={{
                                        avatar,
                                        username,
                                        playerNumber: session?.user?.streamerWarsPlayerNumber
                                    }}
                                />
                            </Container3D>
                        </div>
                    </div>
                    <Container3D>
                        <MemberCard
                            className="max-w-[400px] md:max-w-[700px] mx-auto"
                            number={parseInt(session?.user?.id as string)}
                            selectedStickers={selectedStickers}
                            handleRemoveSticker={handleRemoveSticker}
                            skin={skin}
                            user={{
                                avatar,
                                username,
                                playerNumber: session?.user?.streamerWarsPlayerNumber
                            }}
                        />
                    </Container3D>
                    <div class="w-2/3 mx-auto h-6 rounded-[50%] mt-6 transition-colors duration-300 blur-xl bg-[#e98354]"></div>
                </div>
                <div class="flex flex-col items-center w-full px-8 mt-16 mb-16 gap-x-10 gap-y-4 lg:mb-0 lg:mt-4 md:flex-row">

                    <a
                        download=""
                        disabled={generating}
                        class="save-button flex items-center cursor-pointer gap-2 rounded-lg text-white px-3 py-[10px] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-white/40 bg-[#121226] hover:bg-[#1A1A2E] hover:border-white/60"
                    >
                        {
                            generating ? <LoaderIcon class="w-6 h-6 animate-spin" /> : <DownloadIcon class="w-6 h-6" />
                        }

                        {generating ? 'Generando...' : 'Descargar'}
                    </a>

                    {/*  <button
                        onClick={shareMyCard}
                        class="flex items-center gap-2 rounded-lg text-white px-3 py-[10px] transition-all duration-300 border border-white/40 bg-[#121226] hover:bg-[#1A1A2E] hover:border-white/60"
                    >
                        <ShareIcon class="w-6 h-6" />
                        Share
                    </button> */}
                </div>
            </div>
            <div class="w-full md:order-none">
                <div>
                    <h2 class="mt-10 text-2xl font-bold text-white lg:pl-8">
                        Skin
                    </h2>

                    <div
                        class="flex flex-row w-full p-8 max-h-[30rem] overflow-x-auto text-center flex-nowrap md:flex-wrap gap-x-8 gap-y-12 lg:pb-20 hidden-scroll h-40 relative"
                    >
                        {
                            MemberCardSkins.map(({ id, name, description }) => (
                                <Tooltip
                                    tooltipClassName='w-[200px]'
                                    key={`tooltip-skin-${id}`}
                                    tooltipPosition='top'
                                    text={description}
                                    offsetNumber={16}
                                >
                                    <button class={`aspect-square size-12 flex items-center justify-center border-2 p-2 rounded-md border-white/40 transition-all hover:bg-green-500/20 hover:border-white/60 ${skin === id ? 'border-white/60 bg-green-900/40' : 'border-transparent'}`}
                                        onClick={() => handleSkinChange(id)}>

                                        <div class="flex items-center justify-center w-12 h-12 transition-all cursor-pointer">
                                            <img class="size-8 aspect-square object-contain" src={`/images/member-card-skins/${id}-icon.webp`} alt="" />
                                        </div>
                                    </button>
                                </Tooltip>

                            ))

                        }
                    </div>
                    <h2 class="mt-10 text-2xl font-bold text-white lg:pl-8">
                        Stickers
                    </h2>
                    <div
                        class="flex flex-row w-full p-8 max-h-[30rem] overflow-x-auto text-center flex-nowrap md:flex-wrap gap-x-8 gap-y-12 lg:pb-20 hidden-scroll h-40 relative"
                        style="mask-image:linear-gradient(to top, transparent, #000 40%)"
                    >
                        {
                            STICKERS.map(({ id }) => (
                                <button class="" onClick={() => handleSelectSticker(id)}>
                                    <div class="flex items-center justify-center w-12 h-12 transition-all cursor-pointer hover:scale-125">
                                        <img class="w-auto h-12" src={`/images/stickers/${id}.webp`} alt="" />
                                    </div>
                                </button>
                            ))
                        }

                    </div>
                </div>
            </div>
        </>
    );
};