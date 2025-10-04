import React from "react";
// Separa a importação do TIPO das importações de componentes/funções.
import type { ToastOptions } from "react-hot-toast";
import { toast, Toaster } from "react-hot-toast";

// Objeto de configuração para a aparência dos toasts.
const toastOptions: ToastOptions = {
  style: {
    background: "#333",
    color: "#fff",
  },
  success: {
    iconTheme: {
      primary: "#10B981", // green-500
      secondary: "#fff",
    },
  },
  error: {
    iconTheme: {
      primary: "#EF4444", // red-500
      secondary: "#fff",
    },
  },
};

/**
 * Componente que renderiza o container para as notificações.
 * Deve ser colocado no topo da árvore de componentes (ex: em App.tsx ou main.tsx).
 */
export const Notifier = () => {
  return <Toaster position="top-right" toastOptions={toastOptions} />;
};

// Exporta o objeto toast diretamente para ser usado em qualquer lugar da aplicação.
export { toast };
