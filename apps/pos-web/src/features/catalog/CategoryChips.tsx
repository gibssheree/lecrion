// apps/pos-web/src/features/catalog/CategoryChips.tsx
//
// Phase 6A: Dynamic categories from API.
//
// Behavior:
//   • Fetches categories from GET /api/categories.
//   • Falls back to hardcoded list if API returns empty or fails.
//   • Always prepends "Semua" as the first chip.
//   • Shows a loading skeleton while fetching.
//   • Barcode mode: hides category chips (not relevant when scanning a barcode).

import { useCategories } from "../../hooks/useProducts";

// Fallback hardcoded categories for stores that haven't set up DB categories yet
const FALLBACK_CATEGORIES = ["Makanan", "Minuman", "Snack"];

interface Props {
  active: string;
  onChange: (cat: string) => void;
  /** When true (barcode scan mode), hide category chips */
  hidden?: boolean;
}

export default function CategoryChips({ active, onChange, hidden }: Props) {
  const { categories, loading } = useCategories();

  if (hidden) return null;

  // Build the display list: "Semua" + DB categories (or fallback)
  const dbNames = categories.map((c) => c.name);
  const displayList = dbNames.length > 0 ? dbNames : FALLBACK_CATEGORIES;

  return (
    <div className="category-chips">
      {/* "Semua" is always first */}
      <button
        key="Semua"
        className={`chip ${active === "Semua" ? "chip--active" : ""}`}
        onClick={() => onChange("Semua")}
      >
        Semua
      </button>

      {loading ? (
        // Skeleton chips while loading
        <>
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className="chip"
              style={{ opacity: 0.4, minWidth: 60, display: "inline-block" }}
            >
              &nbsp;
            </span>
          ))}
        </>
      ) : (
        displayList.map((name) => (
          <button
            key={name}
            className={`chip ${active === name ? "chip--active" : ""}`}
            onClick={() => onChange(name)}
          >
            {name}
          </button>
        ))
      )}
    </div>
  );
}
