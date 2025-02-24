export interface FormData {
    age: string;
    yearsBorn: string;
    country: string;
    healthStatus: string;
    diseases: string[];
    gender: string;
    livingArrangement: string;
}

export interface RequestBody {
    formData: FormData;
}
