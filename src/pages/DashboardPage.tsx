import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import ForecastChart from "../components/ForecastChart";
import MaturityChart from "../components/MaturityChart";
import StreakCounter from "../components/StreakCounter";
import BadgesDisplay from "../components/BadgesDisplay";
import ConfirmationModal from "../components/ConfirmationModal";
import MoveDeckModal from "../components/MoveDeckModal";
import MoveFolderModal from "../components/MoveFolderModal";
import InlineEdit from "../components/InlineEdit";
import { toast } from "../components/Notifier";
import ContextMenu, { type MenuItem } from "../components/ContextMenu";

// Interfaces para a estrutura de dados
interface Deck {
  id: string;
  name: string;
  deck_type: "general" | "right_wrong";
  folder_id: string | null;
}

interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
}

// Interface para o nó da árvore (pode ser pasta ou baralho)
interface TreeNode {
  id: string;
  name: string;
  type: "folder" | "deck";
  children?: TreeNode[];
  data: Folder | Deck;
}

// --- COMPONENTE PRINCIPAL ---
const DashboardPage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();

  // Estados para dados brutos do Supabase
  const [decks, setDecks] = useState<Deck[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para a estrutura de árvore hierárquica
  const [treeData, setTreeData] = useState<TreeNode[]>([]);

  // Estados para os formulários
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckType, setNewDeckType] = useState<"general" | "right_wrong">(
    "general"
  );
  const [newFolderName, setNewFolderName] = useState("");
  const [newParentFolderId, setNewParentFolderId] = useState<string>("root");

  // Estados para modais e interações
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TreeNode | null>(null);
  const [deckToMove, setDeckToMove] = useState<Deck | null>(null);
  const [folderToMove, setFolderToMove] = useState<Folder | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: TreeNode;
  } | null>(null);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  // --- LÓGICA DE DADOS ---

  const fetchInitialData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const deckPromise = supabase.from("decks").select("*");
    const folderPromise = supabase.from("folders").select("*");

    const [
      { data: deckData, error: deckError },
      { data: folderData, error: folderError },
    ] = await Promise.all([deckPromise, folderPromise]);

    if (deckError) toast.error(deckError.message);
    else setDecks((deckData as Deck[]) || []);

    if (folderError) toast.error(folderError.message);
    else setFolders((folderData as Folder[]) || []);

    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    const buildTree = (folders: Folder[], decks: Deck[]): TreeNode[] => {
      const nodeMap: Map<string, TreeNode> = new Map();
      const tree: TreeNode[] = [];

      folders.forEach((folder) => {
        nodeMap.set(folder.id, {
          id: folder.id,
          name: folder.name,
          type: "folder",
          children: [],
          data: folder,
        });
      });

      decks.forEach((deck) => {
        nodeMap.set(deck.id, {
          id: deck.id,
          name: deck.name,
          type: "deck",
          data: deck,
        });
      });

      nodeMap.forEach((node) => {
        const parentId =
          node.type === "folder"
            ? (node.data as Folder).parent_folder_id
            : (node.data as Deck).folder_id;

        if (parentId && nodeMap.has(parentId)) {
          const parent = nodeMap.get(parentId)!;
          if (parent.children) {
            parent.children.push(node);
          }
        } else {
          tree.push(node);
        }
      });

      // Lógica de Ordenação
      const sortNodes = (a: TreeNode, b: TreeNode) => {
        if (a.type === "folder" && b.type === "deck") return -1;
        if (a.type === "deck" && b.type === "folder") return 1;
        return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
      };

      nodeMap.forEach((node) => {
        if (node.children) {
          node.children.sort(sortNodes);
        }
      });

      tree.sort(sortNodes);

      return tree;
    };

    setTreeData(buildTree(folders, decks));
  }, [folders, decks]);

  // --- MANIPULADORES DE EVENTOS ---

  const handleCreate = async (type: "folder" | "deck", e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Impede que o clique feche o menu de contexto
    if (!session) return;

    const name = (type === "folder" ? newFolderName : newDeckName).trim();
    if (!name) {
      toast.error("O nome não pode estar vazio.");
      return;
    }

    // Validação de duplicidade
    const parentId = newParentFolderId === "root" ? null : newParentFolderId;
    const siblingFolders = folders.filter(
      (f) => f.parent_folder_id === parentId
    );
    const siblingDecks = decks.filter((d) => d.folder_id === parentId);

    if (type === "folder") {
      const isDuplicate = siblingFolders.some(
        (f) => f.name.toLowerCase() === name.toLowerCase()
      );
      if (isDuplicate) {
        toast.error(`Já existe uma pasta com o nome "${name}" neste local.`);
        return;
      }
    } else {
      const isDuplicate = siblingDecks.some(
        (d) => d.name.toLowerCase() === name.toLowerCase()
      );
      if (isDuplicate) {
        toast.error(`Já existe um baralho com o nome "${name}" neste local.`);
        return;
      }
    }

    setIsSubmitting(true);

    if (type === "folder") {
      const { data, error } = await supabase
        .from("folders")
        .insert({
          name,
          user_id: session.user.id,
          parent_folder_id: parentId,
        })
        .select()
        .single();

      if (error) {
        toast.error(error.message);
      } else {
        toast.success(`Pasta "${name}" criada.`);
        setNewFolderName("");
        if (data && data.parent_folder_id) {
          setOpenFolders((prev) => new Set(prev).add(data.parent_folder_id));
        }
      }
    } else {
      const { error } = await supabase.from("decks").insert({
        name,
        user_id: session.user.id,
        deck_type: newDeckType,
        folder_id: parentId,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(`Baralho "${name}" criado.`);
        setNewDeckName("");
        if (parentId) {
          setOpenFolders((prev) => new Set(prev).add(parentId));
        }
      }
    }

    await fetchInitialData();
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    const { id, type, name } = itemToDelete;
    const fromTable = type === "folder" ? "folders" : "decks";

    const { error } = await supabase.from(fromTable).delete().eq("id", id);

    if (error) {
      toast.error(`Erro ao excluir: ${error.message}`);
    } else {
      toast.success(`"${name}" foi excluído(a).`);
      fetchInitialData();
    }
    setItemToDelete(null);
  };

  const handleRename = async (newName: string) => {
    if (!editingItemId) return;

    const itemToRename =
      folders.find((f) => f.id === editingItemId) ||
      decks.find((d) => d.id === editingItemId);

    if (!itemToRename) return;

    const type = "parent_folder_id" in itemToRename ? "folder" : "deck";
    const fromTable = type === "folder" ? "folders" : "decks";

    // Validação de duplicidade na renomeação
    const parentId =
      "parent_folder_id" in itemToRename
        ? itemToRename.parent_folder_id
        : itemToRename.folder_id;
    const siblingFolders = folders.filter(
      (f) => f.parent_folder_id === parentId && f.id !== editingItemId
    );
    const siblingDecks = decks.filter(
      (d) => d.folder_id === parentId && d.id !== editingItemId
    );

    if (type === "folder") {
      const isDuplicate = siblingFolders.some(
        (f) => f.name.toLowerCase() === newName.toLowerCase()
      );
      if (isDuplicate) {
        toast.error(`Já existe uma pasta com o nome "${newName}" neste local.`);
        setEditingItemId(null);
        return;
      }
    } else {
      const isDuplicate = siblingDecks.some(
        (d) => d.name.toLowerCase() === newName.toLowerCase()
      );
      if (isDuplicate) {
        toast.error(
          `Já existe um baralho com o nome "${newName}" neste local.`
        );
        setEditingItemId(null);
        return;
      }
    }

    const { error } = await supabase
      .from(fromTable)
      .update({ name: newName })
      .eq("id", editingItemId);

    if (error) toast.error(error.message);
    else {
      toast.success("Renomeado com sucesso!");
      fetchInitialData();
    }
    setEditingItemId(null);
    setContextMenu(null);
  };

  const handleMoveDeck = async (newFolderId: string | null) => {
    if (!deckToMove) return;

    const isDuplicate = decks.some(
      (d) =>
        d.name.toLowerCase() === deckToMove.name.toLowerCase() &&
        d.folder_id === newFolderId &&
        d.id !== deckToMove.id
    );

    if (isDuplicate) {
      toast.error(
        `Já existe um baralho com o nome "${deckToMove.name}" na pasta de destino. Por favor, renomeie o baralho antes de mover.`
      );
      setDeckToMove(null);
      return;
    }

    const { error } = await supabase
      .from("decks")
      .update({ folder_id: newFolderId })
      .eq("id", deckToMove.id);

    if (error) {
      toast.error(`Erro ao mover o baralho: ${error.message}`);
    } else {
      toast.success(`Baralho movido com sucesso!`);
      fetchInitialData();
    }
    setDeckToMove(null);
  };

  const handleMoveFolder = async (newParentFolderId: string | null) => {
    if (!folderToMove) return;

    const isDuplicate = folders.some(
      (f) =>
        f.name.toLowerCase() === folderToMove.name.toLowerCase() &&
        f.parent_folder_id === newParentFolderId &&
        f.id !== folderToMove.id
    );

    if (isDuplicate) {
      toast.error(
        `Já existe uma pasta com o nome "${folderToMove.name}" no destino. Por favor, renomeie a pasta antes de mover.`
      );
      setFolderToMove(null);
      return;
    }

    const { error } = await supabase
      .from("folders")
      .update({ parent_folder_id: newParentFolderId })
      .eq("id", folderToMove.id);

    if (error) {
      toast.error(`Erro ao mover a pasta: ${error.message}`);
    } else {
      toast.success(`Pasta movida com sucesso!`);
      fetchInitialData();
    }
    setFolderToMove(null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  // --- SUB-COMPONENTES E HELPERS ---

  const FileSystemNode = ({ node, depth }: { node: TreeNode }): JSX.Element => {
    const isEditing = editingItemId === node.id;

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, item: node });
    };

    if (node.type === "folder") {
      const isOpen = openFolders.has(node.id);
      return (
        <div>
          <div
            className="flex items-center list-none p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer"
            style={{ paddingLeft: `${depth * 20 + 4}px` }}
            onContextMenu={handleContextMenu}
            onClick={() => toggleFolder(node.id)}
          >
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${
                isOpen ? "rotate-90" : ""
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <svg
              className="w-5 h-5 text-yellow-500 ml-2 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            {isEditing ? (
              <InlineEdit
                initialValue={node.name}
                onSave={handleRename}
                onCancel={() => setEditingItemId(null)}
                className="font-semibold ml-2 w-full"
              />
            ) : (
              <span className="font-semibold ml-2 truncate">{node.name}</span>
            )}
          </div>
          {isOpen && (
            <div className="mt-1">
              {node.children?.map((child) => (
                <FileSystemNode key={child.id} node={child} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        className="flex items-center p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50"
        style={{ paddingLeft: `${depth * 20 + 4 + 16 + 8}px` }}
        onContextMenu={handleContextMenu}
      >
        <svg
          className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2h2"
          />
        </svg>
        {isEditing ? (
          <InlineEdit
            initialValue={node.name}
            onSave={handleRename}
            onCancel={() => setEditingItemId(null)}
            className="w-full"
          />
        ) : (
          <Link
            to={`/decks/${node.id}`}
            className="truncate block w-full cursor-pointer"
          >
            {node.name}
          </Link>
        )}
      </div>
    );
  };

  const getContextMenuItems = (): MenuItem[] => {
    if (!contextMenu) return [];
    const { item } = contextMenu;
    let items: MenuItem[] = [];

    if (item.type === "folder") {
      items.push({
        label: "Nova Pasta Aqui",
        action: () => {
          setNewParentFolderId(item.id);
          setContextMenu(null);
        },
      });
      items.push({
        label: "Novo Baralho Aqui",
        action: () => {
          setNewParentFolderId(item.id);
          setContextMenu(null);
        },
      });
      items.push({ isSeparator: true });
    }

    items.push({
      label: "Renomear",
      action: () => {
        setEditingItemId(item.id);
        setContextMenu(null);
      },
    });

    if (item.type === "deck") {
      items.push({
        label: "Mover",
        action: () => {
          setDeckToMove(item.data as Deck);
          setContextMenu(null);
        },
      });
    }

    if (item.type === "folder") {
      items.push({
        label: "Mover",
        action: () => {
          setFolderToMove(item.data as Folder);
          setContextMenu(null);
        },
      });
    }

    items.push({ isSeparator: true });
    items.push({
      label: "Excluir",
      action: () => {
        setItemToDelete(item);
        setContextMenu(null);
      },
      isDanger: true,
    });

    return items;
  };

  const renderFolderOptions = (nodes: TreeNode[], depth = 0): JSX.Element[] => {
    let options: JSX.Element[] = [];
    nodes.forEach((node) => {
      if (node.type === "folder") {
        options.push(
          <option key={node.id} value={node.id}>
            {"—".repeat(depth)} {node.name}
          </option>
        );
        if (node.children) {
          options = options.concat(
            renderFolderOptions(node.children, depth + 1)
          );
        }
      }
    });
    return options;
  };

  // --- RENDERIZAÇÃO ---
  const inputStyle =
    "w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const btnPrimaryStyle =
    "w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-400";

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-4 sm:p-8"
      onClick={() => setContextMenu(null)}
    >
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Meu Painel</h1>
          <div className="flex items-center gap-4">
            <StreakCounter />
            <Link
              to="/settings"
              title="Configurações"
              className="text-gray-500 hover:text-blue-500"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </Link>
            <button
              onClick={handleSignOut}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition duration-300"
            >
              Sair
            </button>
          </div>
        </header>

        <section className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow h-80 flex flex-col">
            <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">
              Previsão de Revisões
            </h3>
            <ForecastChart />
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow h-80 flex flex-col">
            <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">
              Maturidade dos Cartões
            </h3>
            <MaturityChart />
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">Conquistas</h2>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <BadgesDisplay />
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="file-system-container">
              {loading ? (
                <p>Carregando...</p>
              ) : (
                <details open className="group">
                  <summary className="flex items-center p-1 cursor-pointer list-none rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50">
                    <svg
                      className="w-5 h-5 text-gray-500 group-open:rotate-90 transition-transform flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-semibold text-xl ml-2">Baralhos</span>
                  </summary>
                  <div className="pl-4 mt-2 space-y-1">
                    {treeData.map((node) => (
                      <FileSystemNode key={node.id} node={node} depth={0} />
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>

          <div
            className="lg:col-span-2 space-y-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-3">Criar Novo Baralho</h3>
              <form
                onSubmit={(e) => handleCreate("deck", e)}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="deckName"
                    className="block text-sm font-medium mb-1"
                  >
                    Nome do Baralho
                  </label>
                  <input
                    id="deckName"
                    type="text"
                    value={newDeckName}
                    onChange={(e) => setNewDeckName(e.target.value)}
                    className={inputStyle}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="deckType"
                      className="block text-sm font-medium mb-1"
                    >
                      Tipo
                    </label>
                    <select
                      id="deckType"
                      value={newDeckType}
                      onChange={(e) => setNewDeckType(e.target.value as any)}
                      className={inputStyle}
                    >
                      <option value="general">Geral</option>
                      <option value="right_wrong">Certo/Errado</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="deckParent"
                      className="block text-sm font-medium mb-1"
                    >
                      Localização
                    </label>
                    <select
                      id="deckParent"
                      value={newParentFolderId}
                      onChange={(e) => setNewParentFolderId(e.target.value)}
                      className={inputStyle}
                    >
                      <option value="root">Raiz</option>
                      {renderFolderOptions(treeData)}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={btnPrimaryStyle}
                >
                  {isSubmitting ? "Criando..." : "Criar Baralho"}
                </button>
              </form>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-3">Criar Nova Pasta</h3>
              <form
                onSubmit={(e) => handleCreate("folder", e)}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="folderName"
                    className="block text-sm font-medium mb-1"
                  >
                    Nome da Pasta
                  </label>
                  <input
                    id="folderName"
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="folderParent"
                    className="block text-sm font-medium mb-1"
                  >
                    Localização
                  </label>
                  <select
                    id="folderParent"
                    value={newParentFolderId}
                    onChange={(e) => setNewParentFolderId(e.target.value)}
                    className={inputStyle}
                  >
                    <option value="root">Raiz</option>
                    {renderFolderOptions(treeData)}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={btnPrimaryStyle}
                >
                  {isSubmitting ? "Criando..." : "Criar Pasta"}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}

      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title={`Confirmar Exclusão de ${
          itemToDelete?.type === "folder" ? "Pasta" : "Baralho"
        }`}
        message={`Tem certeza que deseja excluir "${itemToDelete?.name}"? ${
          itemToDelete?.type === "folder"
            ? "Todos os itens dentro dela também serão excluídos."
            : ""
        }`}
      />

      <MoveDeckModal
        isOpen={!!deckToMove}
        onClose={() => setDeckToMove(null)}
        onConfirm={handleMoveDeck}
        folders={folders}
        currentFolderId={deckToMove?.folder_id || null}
        deckName={deckToMove?.name || ""}
      />

      <MoveFolderModal
        isOpen={!!folderToMove}
        onClose={() => setFolderToMove(null)}
        onConfirm={handleMoveFolder}
        allFolders={folders}
        folderToMove={folderToMove}
      />
    </div>
  );
};

export default DashboardPage;
