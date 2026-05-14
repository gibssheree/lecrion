"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NutritionAdvisorService = void 0;
const common_1 = require("@nestjs/common");
let NutritionAdvisorService = class NutritionAdvisorService {
    detectNutritionTopic(text) {
        const norm = String(text || '').toLowerCase();
        if (norm.includes('kalori'))
            return 'kalori';
        if (norm.includes('gula') || norm.includes('manis'))
            return 'gula';
        if (norm.includes('protein'))
            return 'protein';
        if (norm.includes('lemak') || norm.includes('kolesterol'))
            return 'lemak';
        if (norm.includes('alergi') ||
            norm.includes('kacang') ||
            norm.includes('susu') ||
            norm.includes('gluten'))
            return 'alergi';
        if (norm.includes('nutrisi') ||
            norm.includes('gizi') ||
            norm.includes('sehat') ||
            norm.includes('diet'))
            return 'nutrisi umum';
        return null;
    }
    formatNutritionReply(productName, topic) {
        const name = productName || 'Produk ini';
        let base;
        if (topic === 'gula') {
            base = `Untuk ${name}, tingkat kemanisan dan kandungan gula bisa disesuaikan. Jika kamu mengurangi gula, kamu bisa request "less sugar" atau "tanpa gula" saat memesan.`;
        }
        else if (topic === 'alergi') {
            base = `Terkait alergi pada ${name}, karena diproses di dapur yang sama dengan produk lain, kami tidak bisa menjamin 100% bebas dari kontaminasi silang alergen (seperti kacang, susu, atau gluten). Mohon beritahu kasir jika kamu punya alergi parah.`;
        }
        else {
            base = `Berdasarkan estimasi umum untuk ${name}, informasi mengenai ${topic} adalah sebagai berikut:\n\nMohon maaf, kami tidak memiliki data nutrisi spesifik (gram/mg) untuk item ini. Secara umum, ${name} terbuat dari bahan-bahan standar rumah makan.`;
        }
        return (base +
            '\n\n*Catatan: Data nutrisi ini bersifat estimasi dan tidak menggantikan saran ahli gizi.*');
    }
};
exports.NutritionAdvisorService = NutritionAdvisorService;
exports.NutritionAdvisorService = NutritionAdvisorService = __decorate([
    (0, common_1.Injectable)()
], NutritionAdvisorService);
//# sourceMappingURL=nutrition-advisor.service.js.map