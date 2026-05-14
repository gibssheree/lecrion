export type NutritionTopic = 'kalori' | 'gula' | 'protein' | 'lemak' | 'alergi' | 'nutrisi umum' | null;
export declare class NutritionAdvisorService {
    detectNutritionTopic(text: string): NutritionTopic;
    formatNutritionReply(productName: string, topic: NutritionTopic): string;
}
