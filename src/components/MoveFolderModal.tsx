import React, { useState, useEffect } from "react";

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
  }, [folderToMove]);

  if (!isOpen || !folderToMove) {
    return null;
  }

  // Helper function to find all descendant folder IDs recursively
  const getDescendantIds = (folderId: string, folders: Folder[]): string[] => {
    let descendantIds: string[] = [];
    const children = folders.filter((f) => f.parent_folder_id === folderId);
    for (const child of children) {
      descendantIds.push(child.id);
      descendantIds = descendantIds.concat(getDescendantIds(child.id, folders));
    }
    return descendantIds;
  };

  const invalidTargetIds = [
    folderToMove.id,
    ...getDescendantIds(folderToMove.id, allFolders),
  ];

  // Filter out the folder itself and its descendants from the list of possible destinations
  const availableFolders = allFolders.filter(
    (f) => !invalidTargetIds.includes(f.id)
  );

  // Helper function to render options recursively for visual hierarchy
  const renderOptions = (
    parentId: string | null = null,
    depth = 0
  ): JSX.Element[] => {
    return availableFolders
      .filter((f) => f.parent_folder_id === parentId)
      .flatMap((folder) => [
        <option key={folder.id} value={folder.id}>
          {"—".repeat(depth)} {folder.name}
        </option>,
        ...renderOptions(folder.id, depth + 1),
      ]);
  };

  const handleConfirm = () => {
    onConfirm(targetFolderId === "root" ? null : targetFolderId);
  };

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
            {renderOptions()}
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
