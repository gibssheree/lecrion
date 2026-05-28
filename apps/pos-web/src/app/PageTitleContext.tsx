import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface Ctx {
  title: string;
  setTitle: (t: string) => void;
}

const PageTitleContext = createContext<Ctx>({ title: "", setTitle: () => {} });

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("");
  return (
    <PageTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitleValue() {
  return useContext(PageTitleContext).title;
}

/**
 * Register the current page title with the layout.
 * The layout reads it from context and renders the heading once.
 * Cleared on unmount so empty pages don't carry over stale titles.
 */
export function usePageTitle(title: string) {
  const { setTitle } = useContext(PageTitleContext);
  useEffect(() => {
    setTitle(title);
    return () => setTitle("");
  }, [title, setTitle]);
}
