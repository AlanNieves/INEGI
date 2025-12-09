import { useState, useEffect, useRef } from 'react';

interface Option {
  value: string;
  label: string;
  subtitle?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Buscar...',
  disabled = false,
  required = false,
  className = '',
}: SearchableSelectProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtrar opciones basado en la búsqueda
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.toLowerCase()) ||
    option.subtitle?.toLowerCase().includes(search.toLowerCase())
  );

  // Encontrar la opción seleccionada
  const selectedOption = options.find(opt => opt.value === value);

  // Cerrar dropdown cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index cuando cambian las opciones filtradas
  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  const handleSelect = (option: Option) => {
    onChange(option.value);
    setSearch('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearch('');
        inputRef.current?.blur();
        break;
    }
  };

  const displayValue = isOpen ? search : (selectedOption?.label || '');

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={className}
        autoComplete="off"
      />
      
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-gray-800 border border-gray-600 rounded-md shadow-lg">
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-gray-400 text-sm">
              No se encontraron resultados
            </div>
          ) : (
            filteredOptions.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option)}
                className={`w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors ${
                  index === highlightedIndex ? 'bg-gray-700' : ''
                } ${
                  option.value === value ? 'bg-blue-900 bg-opacity-30' : ''
                }`}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="text-white">{option.label}</div>
                {option.subtitle && (
                  <div className="text-sm text-gray-400">{option.subtitle}</div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
