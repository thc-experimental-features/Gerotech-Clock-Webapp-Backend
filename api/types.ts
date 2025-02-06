export interface FormData {
    age: string;
    yearsBorn: string;
    country: string;
    healthStatus: string;
    gender?: string;
    livingArrangement?: string;
}

export interface RequestBody {
    formData: FormData;
}
