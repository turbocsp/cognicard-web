import toast, { Toaster, type ToastOptions } from "react-hot-toast";

// Correção: A configuração de estilo para tipos específicos (success, error)
// não é feita no objeto principal, mas sim ao chamar a função toast.
// Mantemos aqui um estilo base para todos os toasts.
const toastOptions: ToastOptions = {
  style: {
    background: "#333",
    color: "#fff",
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
