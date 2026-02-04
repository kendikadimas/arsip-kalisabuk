export type * from './auth';
export type * from './navigation';
export type * from './ui';

import type { Auth } from './auth';

export interface Category {
    id: number;
    name: string;
    parent_id?: number | null;
    archives_count?: number;
}

export interface Archive {
    id: number;
    title: string;
    year: number;
    drive_file_id: string;
    view_link: string;
    view_url: string;
    category_id: number;
    created_at: string; // This is usually the db creation time
    uploaded_at?: string; // This might be the user-specified date
    file_size?: number;
    category?: Category;
}

export type SharedData = {
    name: string;
    auth: Auth;
    sidebarOpen: boolean;
    [key: string]: unknown;
};
