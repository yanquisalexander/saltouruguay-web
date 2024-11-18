export interface CategoryNominee {
    id: string,
    clip?: string,
}

export interface Category {
    id: string;
    name: string;
    nominees: CategoryNominee[];
}

export interface Vote {
    nomineeId: string;
    categoryId: string;
}