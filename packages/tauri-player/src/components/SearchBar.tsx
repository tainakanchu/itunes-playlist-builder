import { useRef, useCallback } from "react";
import { useStore } from "../store/useStore";

export function SearchBar() {
  const { searchQuery, setSearchQuery, setViewMode } = useStore();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setSearchQuery(value);
        if (value) setViewMode("library");
      }, 150);
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchQuery("");
        (e.target as HTMLInputElement).value = "";
        (e.target as HTMLInputElement).blur();
      }
    },
    [],
  );

  return (
    <div className="search-bar">
      <input
        id="search-input"
        type="text"
        placeholder="Search tracks... (press / to focus)"
        defaultValue={searchQuery}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}
