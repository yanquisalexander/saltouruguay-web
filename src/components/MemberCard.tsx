import "atropos/css";
import "@/components/styles/member-card.css";
import { cn } from '@/lib/utils';
import { Tooltip } from "./Tooltip";
import { LucideLockKeyhole } from "lucide-preact";
import { MemberCardSkins } from "@/consts/MemberCardSkins";

interface Props {
    number: number;
    className?: string;
    user: {
        username: string;
        avatar: string;
        playerNumber?: number;
    };
    handleRemoveSticker?: (index: number) => void;
    selectedStickers?: {
        list: (string | null)[];
        limit: number;
    };
    skin?: string;
}



export const MemberCard = ({
    number,
    user,
    className,
    handleRemoveSticker,
    selectedStickers,
    skin = 'classic',
}: Props) => {
    const { username = 'Unknown User', avatar = '' } = user;
    const memberCardNumber = `#${number != null ? number.toString().padStart(5, "0") : ""}`;

    const memberCardBg = MemberCardSkins.find((s) => s.id === skin)?.image;

    return (
        <div className={cn("block h-full overflow-hidden rounded-[60px] border p-5 aspect-none w-full md:aspect-[2/1] border-white/30 bg-white/10 transition duration-500 ease-in-out", className)}>
            <div className={`relative h-full overflow-hidden border rounded-[40px] member-card-gradient-bg grid md:flex border-white/80 transition duration-500 ease-in-out skin-${skin}`}>
                <div className="absolute w-1/2 rotate-45 h-[300%] left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-[#41b3ff00] via-[#b0a9ff13] to-[#41b3ff00]"></div>
                <span className="h-full font-mono text-center text-white font-bold member-card-dash-border-top row-[3/4] px-4 py-4 md:py-0 text-4xl md:px-4 md:text-3xl md:[writing-mode:vertical-lr] md:member-card-dash-border">
                    {memberCardNumber}
                </span>
                <div className="-rotate-12 md:w-auto row-[2/3] mb-8 md:mb-0 left-0 mx-auto md:mx-0 h-32 relative flex justify-center w-full md:block bottom-0 md:left-[25%] md:bottom-[20%] md:absolute">
                    <img
                        src={memberCardBg ?? MemberCardSkins[0].image}
                        className="w-auto h-full md:h-auto opacity-60 size-40 md:size-60"
                        alt=""
                    />
                </div>
                <div className="z-10 grid w-full h-auto md:h-full pt-5 md:pt-0 grid-rows-[1fr_auto] md:grid-rows-2">
                    <div className="grid md:grid-cols-2">
                        <div className="h-max">
                            <div className="flex justify-start font-mono gap-4 text-white gap-y-2 p-5 flex-col md:items-start md:flex-row md:p-6 items-center text-center md:text-left">
                                <img
                                    src={avatar}
                                    crossOrigin="anonymous"
                                    className={`block aspect-square rounded-full size-20 transition-all md:size-[70px] object-cover ${skin === 'guerra-streamers' ? 'border-2 border-dotted border-l-lime-400 border-t-lime-500 border-r-lime-600 p-0.5 border-b-lime-700' : ''}`}
                                    alt={`${username}'s avatar`}
                                    width="78"
                                    height="78"
                                />
                                <div className="flex flex-col items-center md:items-start">
                                    <p className="text-xl font-bold">
                                        {username}
                                    </p>
                                    <span className="block px-3 py-1 mt-1 text-xs font-medium rounded-full w-max text-white/80 bg-black/10">

                                        {(skin === 'guerra-streamers' && (user.playerNumber)) ? 'Participante de Guerra de Streamers' : 'Miembro Saltano'}
                                        <span className="inline-block">
                                            <span dangerouslySetInnerHTML={{ __html: '&nbsp;' }} />
                                            ⭐️</span>
                                    </span>
                                    {
                                        skin === 'guerra-streamers' && user.playerNumber != null && (
                                            <div>


                                                <span className="block px-3 z-10  py-1 mt-1 text-xl font-atomic font-medium rounded-full w-max text-lime-400 bg-black/10">
                                                    Jugador #{user.playerNumber.toString().padStart(3, '0')}
                                                </span>
                                            </div>
                                        )
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-row-reverse items-center h-auto gap-2 mx-auto md:mr-4 md:ml-0">
                        {selectedStickers?.list &&
                            selectedStickers.list.map((sticker, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        'relative h-auto group justify-center flex text-white items-center opacity-80',
                                    )}
                                >
                                    {sticker && index < selectedStickers.limit &&
                                        handleRemoveSticker != null && (
                                            <button
                                                onClick={() => handleRemoveSticker(index)}
                                                title='Borrar sticker'
                                                aria-label='Borrar Sticker'
                                                className='absolute top-0 right-0 items-center justify-center hidden w-4 h-4 text-sm transition-transform border rounded-full group-hover:flex hover:scale-125 bg-red-400/60 justify-items-center border-white/60'
                                            >
                                                <svg
                                                    xmlns='http://www.w3.org/2000/svg'
                                                    width='24'
                                                    height='24'
                                                    viewBox='0 0 24 24'
                                                    fill='none'
                                                    stroke='currentColor'
                                                    strokeWidth='2'
                                                    strokeLinecap='round'
                                                    strokeLinejoin='round'
                                                    className='w-3 h-3'
                                                >
                                                    <line x1='18' y1='6' x2='6' y2='18'></line>
                                                    <line x1='6' y1='6' x2='18' y2='18'></line>
                                                </svg>
                                            </button>
                                        )}
                                    {index < selectedStickers.limit ? (
                                        <div
                                            className={cn(
                                                'p-2',
                                                !sticker && handleRemoveSticker && 'bg-white/10 border w-12 h-12 border-dashed rounded-lg'
                                            )}
                                        >
                                            {sticker && (
                                                <img
                                                    src={`/images/stickers/${sticker}.webp`}
                                                    className='w-12 h-12'
                                                    alt='sticker'
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        handleRemoveSticker && (
                                            <Tooltip
                                                tooltipClassName='w-[200px]'
                                                key={index}
                                                tooltipPosition='top'
                                                text={`Desbloquea con Tier ${index + 1} en Twitch`}
                                                offsetNumber={16}
                                            >
                                                <div
                                                    className='flex items-center justify-center w-12 h-12 p-2 border border-dashed rounded-lg opacity-40'
                                                >
                                                    <LucideLockKeyhole size={24} />
                                                </div>
                                            </Tooltip>
                                        )
                                    )}

                                </div>
                            ))}
                    </div>
                    <div className="grid self-end gap-4 grid-cols-1 md:grid-cols-[1fr_auto]">
                        <a
                            href="https://www.twitch.tv/SaltoUruguayServer"
                            target="_blank"
                            rel="nofollow"
                            className="flex items-center justify-self-end justify-end gap-2 p-5 font-bold text-white w-max hover:text-black transition-colors pt-0 text-md md:text-base mx-auto md:mx-0 md:pt-5"
                        >
                            <svg
                                width="2400"
                                height="2800"
                                viewBox="0 0 2400 2800"
                                fill="none"
                                className="h-auto w-4"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <g clipPath="url(#clip0_33_542)">
                                    <path
                                        d="M500 0L0 500V2300H600V2800L1100 2300H1500L2400 1400V0H500ZM2200 1300L1800 1700H1400L1050 2050V1700H600V200H2200V1300Z"
                                        fill="currentColor"
                                    ></path>
                                    <path
                                        d="M1700 550H1900V1150H1700V550ZM1150 550H1350V1150H1150V550Z"
                                        fill="currentColor"
                                    ></path>
                                </g>
                                <defs>
                                    <clipPath id="clip0_33_542">
                                        <rect width="2400" height="2800" fill="currentColor"></rect>
                                    </clipPath>
                                </defs>
                            </svg>
                            twitch.tv/SaltoUruguayServer
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};