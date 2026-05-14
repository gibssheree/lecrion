const CATEGORIES = ["Semua", "Makanan", "Minuman", "Snack"];

interface Props {
  active: string;
  onChange: (cat: string) => void;
}

export default function CategoryChips({ active, onChange }: Props) {
  return (
    <div className="category-chips">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          className={`chip ${active === cat ? "chip--active" : ""}`}
          onClick={() => onChange(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
