export type * from './auth';
export type * from './navigation';
export type * from './ui';

import type { Auth } from './auth';

export interface Category {
    id: number;
    name: string;
    archives_count?: number;
}

export interface Archive {
    id: number;
    title: string;
    year: number;
    drive_file_id: string;
    view_link: string;
    category_id: number;
    created_at: string;
    category?: Category;
}

export type SharedData = {
    name: string;
    auth: Auth;
    sidebarOpen: boolean;
    [key: string]: unknown;
};
