import {
  Banknote,
  Bot,
  Boxes,
  ClipboardList,
  CookingPot,
  RadioTower,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

export const features = [
  {
    icon: ReceiptText,
    title: "POS kasir cepat",
    description: "Keranjang, register shift, receipt, dan riwayat transaksi untuk workflow kasir harian.",
  },
  {
    icon: Bot,
    title: "WhatsApp bot",
    description: "Order dari chat pelanggan bisa masuk ke alur operasional yang sama.",
  },
  {
    icon: Boxes,
    title: "Inventory terhubung",
    description: "Stok, supplier, dan movement barang ikut terbaca dari transaksi outlet.",
  },
  {
    icon: Banknote,
    title: "Cashflow rapi",
    description: "Owner bisa membaca kas masuk, invoice, dan aktivitas shift tanpa rekap manual.",
  },
  {
    icon: CookingPot,
    title: "KDS untuk dapur",
    description: "Order FnB bisa dipantau dapur tanpa bolak-balik tanya kasir.",
  },
  {
    icon: RadioTower,
    title: "Realtime reload",
    description: "Order, stok, dan status register bergerak tanpa refresh manual.",
  },
  {
    icon: ShieldCheck,
    title: "Role-aware access",
    description: "Akses owner, kasir, inventory, dan support dibatasi sesuai tugas.",
  },
  {
    icon: ClipboardList,
    title: "Operational log",
    description: "Aktivitas penting lebih mudah dilacak saat shift sedang ramai.",
  },
];
