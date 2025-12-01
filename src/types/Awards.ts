export interface CategoryNominee {
    id: string,
    clip?: string,
}

export interface Category {
    id: string;
    name: string;
    isEventsCategory?: boolean;
    nominees: CategoryNominee[];
}

export interface Vote {
    nomineeId: string;
    categoryId: string;
}