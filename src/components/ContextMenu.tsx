import React, { useEffect, useRef } from "react";

// Tipos para os itens do menu
export interface MenuItem {
  label: string;
  action: () => void;
  isSeparator?: boolean;
  isDanger?: boolean; // Para estilizar itens destrutivos, como "Excluir"
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

const ContextMenu = ({ x, y, items, onClose }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Efeito para fechar o menu ao clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    // Limpa o event listener ao desmontar o componente
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Estilo para posicionar o menu na tela
  const style = {
    top: `${y}px`,
    left: `${x}px`,
  };

  return (
    <div
      ref={menuRef}
      style={style}
      className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 z-50 min-w-[180px]"
    >
      <ul>
        {items.map((item, index) => {
          if (item.isSeparator) {
            return (
              <li
                key={`separator-${index}`}
                className="border-t border-gray-200 dark:border-gray-600 my-1"
              ></li>
            );
          }
          return (
            <li key={item.label}>
              <button
                onClick={() => {
                  item.action();
                  onClose(); // Fecha o menu após a ação
                }}
                className={`w-full text-left px-4 py-2 text-sm ${
                  item.isDanger
                    ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                } transition-colors`}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ContextMenu;
