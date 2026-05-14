import { Injectable } from '@nestjs/common';

export type NutritionTopic =
  | 'kalori'
  | 'gula'
  | 'protein'
  | 'lemak'
  | 'alergi'
  | 'nutrisi umum'
  | null;

/**
 * NutritionAdvisorService
 *
 * Advisory-only module — provides informational nutrition context.
 * Does NOT own business truth. Output is always advisory with disclaimer.
 * Per 07-ultimate-tasks.md: "helper capability module that does not own business truth."
 */
@Injectable()
export class NutritionAdvisorService {
  detectNutritionTopic(text: string): NutritionTopic {
    const norm = String(text || '').toLowerCase();
    if (norm.includes('kalori')) return 'kalori';
    if (norm.includes('gula') || norm.includes('manis')) return 'gula';
    if (norm.includes('protein')) return 'protein';
    if (norm.includes('lemak') || norm.includes('kolesterol')) return 'lemak';
    if (
      norm.includes('alergi') ||
      norm.includes('kacang') ||
      norm.includes('susu') ||
      norm.includes('gluten')
    )
      return 'alergi';
    if (
      norm.includes('nutrisi') ||
      norm.includes('gizi') ||
      norm.includes('sehat') ||
      norm.includes('diet')
    )
      return 'nutrisi umum';
    return null;
  }

  formatNutritionReply(productName: string, topic: NutritionTopic): string {
    const name = productName || 'Produk ini';

    let base: string;

    if (topic === 'gula') {
      base = `Untuk ${name}, tingkat kemanisan dan kandungan gula bisa disesuaikan. Jika kamu mengurangi gula, kamu bisa request "less sugar" atau "tanpa gula" saat memesan.`;
    } else if (topic === 'alergi') {
      base = `Terkait alergi pada ${name}, karena diproses di dapur yang sama dengan produk lain, kami tidak bisa menjamin 100% bebas dari kontaminasi silang alergen (seperti kacang, susu, atau gluten). Mohon beritahu kasir jika kamu punya alergi parah.`;
    } else {
      base = `Berdasarkan estimasi umum untuk ${name}, informasi mengenai ${topic} adalah sebagai berikut:\n\nMohon maaf, kami tidak memiliki data nutrisi spesifik (gram/mg) untuk item ini. Secara umum, ${name} terbuat dari bahan-bahan standar rumah makan.`;
    }

    return (
      base +
      '\n\n*Catatan: Data nutrisi ini bersifat estimasi dan tidak menggantikan saran ahli gizi.*'
    );
  }
}
