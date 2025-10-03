import React, { useState, useEffect } from "react";

interface InlineEditProps {
  initialValue: string;
  onSave: (newValue: string) => void;
  onCancel: () => void;
  // Adiciona classes para estilização flexível
  className?: string;
}

const InlineEdit = ({
  initialValue,
  onSave,
  onCancel,
  className = "",
}: InlineEditProps) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Foca no campo de input assim que ele aparece
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const handleSave = () => {
    // Salva apenas se o nome for alterado e não for vazio
    if (
      value.trim() &&
      value.trim().toLowerCase() !== initialValue.toLowerCase()
    ) {
      onSave(value.trim());
    } else {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSave} // Salva quando o usuário clica fora
      onKeyDown={handleKeyDown}
      className={`bg-gray-100 dark:bg-gray-700 border border-blue-500 rounded-md outline-none ${className}`}
    />
  );
};

export default InlineEdit;
