import type { Category } from "@/types/Awards";
import { NOMINEES } from "./Nominees";



export const CATEGORIES: Category[] = [
    {
        id: "seguidores-mas-fieles",
        name: "Seguidores más fieles",
        nominees: [
            {
                id: NOMINEES.user1.username,
            },
            {
                id: NOMINEES.user2.username,
            },
            {
                id: NOMINEES.user3.username,
            },
            {
                id: NOMINEES.user4.username,
            },
            {
                id: NOMINEES.user5.username,
            },
            {
                id: NOMINEES.user6.username,
            },
            {
                id: NOMINEES.user7.username,
            },
            {
                id: NOMINEES.user8.username,
            },
            {
                id: NOMINEES.user9.username,
            },
            {
                id: NOMINEES.user10.username,
            }
        ]
    },
    {
        id: "mas-censurados",
        name: "Más censurados",
        nominees: [
            {
                id: NOMINEES.user2.username,
            }
        ]
    },
    {
        id: "mas-generosos",
        name: "Más generosos",
        nominees: [
            {
                id: NOMINEES.user3.username,
            }
        ]
    },
    {
        id: "mas-tryhard",
        name: "Más Tryhard",
        nominees: [
            {
                id: NOMINEES.user4.username,
            }
        ]
    }
]