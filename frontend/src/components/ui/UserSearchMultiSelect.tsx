import React, { useState, useRef, useEffect, useMemo } from 'react';

export interface UserOption {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

interface UserSearchMultiSelectProps {
  users: UserOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  disabled?: boolean;
}

const UserSearchMultiSelect: React.FC<UserSearchMultiSelectProps> = ({
  users,
  value,
  onChange,
  placeholder = 'Buscar por nome e selecionar...',
  className = '',
  label,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedUsers = useMemo(() => {
    return value
      .map(id => users.find(u => u.id === id))
      .filter(Boolean) as UserOption[];
  }, [value, users]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const s = search.toLowerCase();
    return users.filter(
      u =>
        u.name?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s) ||
        (u.role && u.role.toLowerCase().includes(s))
    );
  }, [users, search]);

  const availableToSelect = useMemo(() => {
    return filteredUsers.filter(u => !value.includes(u.id));
  }, [filteredUsers, value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const add = (id: string) => {
    if (value.includes(id)) return;
    onChange([...value, id]);
    setSearch('');
  };

  const remove = (id: string) => {
    onChange(value.filter(x => x !== id));
  };

  return (
    <div className={className} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">
          {label}
        </label>
      )}
      <div className="border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg min-h-[42px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        <div className="flex flex-wrap gap-1.5 p-2">
          {selectedUsers.map(u => (
            <span
              key={u.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200"
            >
              {u.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(u.id)}
                  className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded p-0.5"
                  aria-label={`Remover ${u.name}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          ))}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={selectedUsers.length ? '' : placeholder}
            disabled={disabled}
            className="flex-1 min-w-[120px] px-1 py-1 bg-transparent border-0 outline-none text-gray-900 dark:text-dark-text placeholder-gray-500 dark:placeholder-gray-400 text-sm"
          />
        </div>
      </div>
      {isOpen && (
        <ul className="mt-1 max-h-48 overflow-auto rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-lg z-50 py-1">
          {availableToSelect.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500 dark:text-dark-text-secondary">
              {search.trim() ? 'Nenhum usuário encontrado' : 'Todos já selecionados ou nenhum usuário disponível'}
            </li>
          ) : (
            availableToSelect.map(u => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => add(u.id)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-gray-700/50 flex items-center justify-between"
                >
                  <span>{u.name}</span>
                  {u.email && <span className="text-xs text-gray-500 dark:text-dark-text-secondary truncate ml-2">{u.email}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default UserSearchMultiSelect;
