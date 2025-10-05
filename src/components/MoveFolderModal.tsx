import { useState, useEffect } from "react";

interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
}

interface MoveFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newParentFolderId: string | null) => void;
  allFolders: Folder[];
  folderToMove: Folder | null;
}

const MoveFolderModal = ({
  isOpen,
  onClose,
  onConfirm,
  allFolders,
  folderToMove,
}: MoveFolderModalProps) => {
  const [targetFolderId, setTargetFolderId] = useState<string>("root");

  useEffect(() => {
    if (folderToMove) {
      setTargetFolderId(folderToMove.parent_folder_id || "root");
    }
  }, [folderToMove, isOpen]);

  if (!isOpen || !folderToMove) {
    return null;
  }

  const handleConfirm = () => {
    onConfirm(targetFolderId === "root" ? null : targetFolderId);
  };

  // Lógica para desabilitar a pasta atual e suas subpastas
  const getSubfolderIds = (folderId: string): string[] => {
    let children = allFolders.filter((f) => f.parent_folder_id === folderId);
    let ids = children.map((c) => c.id);
    children.forEach((c) => {
      ids = [...ids, ...getSubfolderIds(c.id)];
    });
    return ids;
  };

  const disabledFolderIds = folderToMove
    ? [folderToMove.id, ...getSubfolderIds(folderToMove.id)]
    : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold mb-4">
          Mover Pasta "{folderToMove.name}"
        </h3>

        <div className="space-y-2">
          <label htmlFor="targetFolder" className="block text-sm font-medium">
            Mover para:
          </label>
          <select
            id="targetFolder"
            value={targetFolderId}
            onChange={(e) => setTargetFolderId(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="root">Nenhuma Pasta (Raiz)</option>
            {allFolders.map((folder) => (
              <option
                key={folder.id}
                value={folder.id}
                disabled={disabledFolderIds.includes(folder.id)}
              >
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Mover
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveFolderModal;
