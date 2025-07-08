// Reusable filtered search bar component for Amenity pages
import * as React from 'react';
import { Search, Close } from '@/app/components/svgs';

interface FilteredSearchBarProps {
  filterLabel: string;
  placeholder: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onDelete: () => void;
  showFilterChip?: boolean;
}

const FilteredSearchBar: React.FC<FilteredSearchBarProps> = ({
  filterLabel,
  placeholder,
  searchQuery,
  setSearchQuery,
  onDelete,
  showFilterChip = true,
}: FilteredSearchBarProps) => {
  const [inputValue, setInputValue] = React.useState(searchQuery);

  // Keep inputValue in sync if searchQuery changes from outside
  React.useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const handleSearch = () => {
    setSearchQuery(inputValue);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div
      style={{
        width: '90%',
        maxWidth: 600,
        display: 'flex',
        alignItems: 'center',
        background: '#1E2B48',
        borderRadius: '3.125rem',
        padding: '0 1.25rem',
        height: '2.5rem',
        boxSizing: 'border-box',
        gap: 8,
      }}
    >
      {/* Left search icon (clickable) */}
      <button
        type="button"
        onClick={handleSearch}
        aria-label="Search"
        style={{
          background: 'none',
          border: 'none',
          color: '#e6d8b8',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          padding: 0,
          marginRight: 4,
        }}
      >
        <Search style={{ width: 22, height: 22 }} />
      </button>
      {/* Filter chip inside the bar, only if showFilterChip */}
      {showFilterChip && (
        <span
          style={{
            background: '#2c365a',
            color: '#fff',
            borderRadius: 16,
            padding: '2px 14px 2px 14px',
            display: 'flex',
            alignItems: 'center',
            fontSize: 16,
            fontWeight: 500,
            marginRight: 8,
          }}
        >
          {filterLabel}
          <button
            style={{
              background: 'none',
              border: 'none',
              marginLeft: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 0,
            }}
            onClick={onDelete}
            aria-label={`Remove ${filterLabel} filter`}
          >
            <Close style={{ width: 10, height: 10, color: '#fff' }} />
          </button>
        </span>
      )}
      {/* Input */}
      <input
        type="text"
        style={{
          flex: 1,
          height: '100%',
          border: 'none',
          background: 'transparent',
          color: '#fff',
          fontSize: '1.1rem',
          outline: 'none',
          minWidth: 0,
        }}
        placeholder={placeholder}
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleInputKeyDown}
        onBlur={e => e.currentTarget.style.boxShadow = ''}
      />
    </div>
  );
};

export default FilteredSearchBar; 