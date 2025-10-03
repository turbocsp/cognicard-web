import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ForecastChart from "../components/ForecastChart";
import MaturityChart from "../components/MaturityChart";
import StreakCounter from "../components/StreakCounter";
import BadgesDisplay from "../components/BadgesDisplay";
import ConfirmationModal from "../components/ConfirmationModal";
import MoveDeckModal from "../components/MoveDeckModal";
import InlineEdit from "../components/InlineEdit";

interface Deck {
  id: string;
  name: string;
  deck_type: "general" | "right_wrong";
  folder_id: string | null;
}

interface Folder {
  id: string;
  name: string;
}

const DashboardPage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckType, setNewDeckType] = useState<"general" | "right_wrong">(
    "general"
  );
  const [selectedFolderId, setSelectedFolderId] = useState<string>("root");
  const [newFolderName, setNewFolderName] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [deckToMove, setDeckToMove] = useState<Deck | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!session) return;
      setLoading(true);
      const deckPromise = supabase
        .from("decks")
        .select("*")
        .order("created_at", { ascending: false });
      const folderPromise = supabase
        .from("folders")
        .select("*")
        .order("created_at");
      const [
        { data: deckData, error: deckError },
        { data: folderData, error: folderError },
      ] = await Promise.all([deckPromise, folderPromise]);
      if (deckError) alert(deckError.message);
      else setDecks((deckData as Deck[]) || []);
      if (folderError) alert(folderError.message);
      else setFolders(folderData || []);
      setLoading(false);
      const { count, error: countError } = await supabase
        .from("smart_cards")
        .select("*", { count: "exact", head: true })
        .gte("srs_interval", 21);
      if (countError) console.error("Error counting mature cards:", countError);
      else if (count && count >= 100) {
        supabase.rpc("award_badge_if_not_present", {
          p_badge_id: "mature_100",
        });
      }
    };
    fetchInitialData();
  }, [session]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newFolderName.trim();
    if (!trimmedName || !session) return;
    const isDuplicate = folders.some(
      (folder) => folder.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      alert(`Erro: Já existe uma pasta com o nome "${trimmedName}".`);
      return;
    }
    setIsSubmitting(true);
    const { data, error } = await supabase
      .from("folders")
      .insert({ name: trimmedName, user_id: session.user.id })
      .select()
      .single();
    if (error) alert(error.message);
    else if (data) {
      setFolders([...folders, data]);
      setNewFolderName("");
    }
    setIsSubmitting(false);
  };

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newDeckName.trim();
    if (!trimmedName || !session) return;
    const targetFolder = selectedFolderId === "root" ? null : selectedFolderId;
    const isDuplicate = decks.some(
      (deck) =>
        deck.name.toLowerCase() === trimmedName.toLowerCase() &&
        deck.folder_id === targetFolder
    );
    if (isDuplicate) {
      alert(
        `Erro: Já existe um baralho com o nome "${trimmedName}" neste local.`
      );
      return;
    }
    setIsSubmitting(true);
    const { data, error } = await supabase
      .from("decks")
      .insert({
        name: trimmedName,
        user_id: session.user.id,
        deck_type: newDeckType,
        folder_id: targetFolder,
      })
      .select()
      .single();
    if (error) alert(error.message);
    else if (data) {
      setDecks([data as Deck, ...decks]);
      setNewDeckName("");
      setNewDeckType("general");
    }
    setIsSubmitting(false);
  };

  const handleDeleteDeck = async () => {
    if (!deckToDelete) return;
    const { error } = await supabase
      .from("decks")
      .delete()
      .eq("id", deckToDelete.id);
    if (error) {
      alert(`Erro ao excluir o baralho: ${error.message}`);
    } else {
      setDecks(decks.filter((deck) => deck.id !== deckToDelete.id));
    }
    setDeckToDelete(null);
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;
    const { error } = await supabase
      .from("folders")
      .delete()
      .eq("id", folderToDelete.id);
    if (error) {
      alert(`Erro ao excluir a pasta: ${error.message}`);
    } else {
      setFolders(folders.filter((folder) => folder.id !== folderToDelete.id));
      setDecks(
        decks.map((deck) =>
          deck.folder_id === folderToDelete.id
            ? { ...deck, folder_id: null }
            : deck
        )
      );
    }
    setFolderToDelete(null);
  };

  const handleMoveDeck = async (newFolderId: string | null) => {
    if (!deckToMove) return;
    const isDuplicate = decks.some(
      (deck) =>
        deck.name.toLowerCase() === deckToMove.name.toLowerCase() &&
        deck.folder_id === newFolderId &&
        deck.id !== deckToMove.id
    );
    if (isDuplicate) {
      alert(
        `Erro: Já existe um baralho com o nome "${deckToMove.name}" na pasta de destino.`
      );
      setDeckToMove(null);
      return;
    }
    const { data, error } = await supabase
      .from("decks")
      .update({ folder_id: newFolderId })
      .eq("id", deckToMove.id)
      .select()
      .single();
    if (error) {
      alert(`Erro ao mover o baralho: ${error.message}`);
    } else if (data) {
      setDecks(
        decks.map((deck) => (deck.id === deckToMove.id ? (data as Deck) : deck))
      );
    }
    setDeckToMove(null);
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    const isDuplicate = folders.some(
      (f) => f.name.toLowerCase() === newName.toLowerCase() && f.id !== folderId
    );
    if (isDuplicate) {
      alert(`Erro: Já existe uma pasta com o nome "${newName}".`);
      setEditingFolderId(null);
      return;
    }
    const { data, error } = await supabase
      .from("folders")
      .update({ name: newName })
      .eq("id", folderId)
      .select()
      .single();
    if (error) alert(error.message);
    else if (data)
      setFolders(folders.map((f) => (f.id === folderId ? data : f)));
    setEditingFolderId(null);
  };

  const handleRenameDeck = async (deckId: string, newName: string) => {
    const deckToRename = decks.find((d) => d.id === deckId);
    if (!deckToRename) return;
    const isDuplicate = decks.some(
      (d) =>
        d.name.toLowerCase() === newName.toLowerCase() &&
        d.folder_id === deckToRename.folder_id &&
        d.id !== deckId
    );
    if (isDuplicate) {
      alert(`Erro: Já existe um baralho com o nome "${newName}" neste local.`);
      setEditingDeckId(null);
      return;
    }
    const { data, error } = await supabase
      .from("decks")
      .update({ name: newName })
      .eq("id", deckId)
      .select()
      .single();
    if (error) alert(error.message);
    else if (data)
      setDecks(decks.map((d) => (d.id === deckId ? (data as Deck) : d)));
    setEditingDeckId(null);
  };

  const decksWithoutFolder = decks.filter((d) => d.folder_id === null);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-4 sm:p-8">
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

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">Seu Progresso</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">Conquistas</h2>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <BadgesDisplay />
          </div>
        </section>

        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-3">Criar Novo Baralho</h3>
              <form onSubmit={handleCreateDeck} className="space-y-4">
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
                    placeholder="Ex: Legislação Tributária"
                    value={newDeckName}
                    onChange={(e) => setNewDeckName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      onChange={(e) =>
                        setNewDeckType(
                          e.target.value as "general" | "right_wrong"
                        )
                      }
                      className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="general">Geral</option>
                      <option value="right_wrong">Certo/Errado</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="deckFolder"
                      className="block text-sm font-medium mb-1"
                    >
                      Pasta
                    </label>
                    <select
                      id="deckFolder"
                      value={selectedFolderId}
                      onChange={(e) => setSelectedFolderId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="root">Nenhuma (Raiz)</option>
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-400"
                >
                  {isSubmitting ? "Criando..." : "Criar Baralho"}
                </button>
              </form>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-3">Criar Nova Pasta</h3>
              <form
                onSubmit={handleCreateFolder}
                className="flex items-end gap-2"
              >
                <div className="flex-grow">
                  <label
                    htmlFor="folderName"
                    className="block text-sm font-medium mb-1"
                  >
                    Nome da Pasta
                  </label>
                  <input
                    id="folderName"
                    type="text"
                    placeholder="Ex: Concursos"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-400"
                >
                  {isSubmitting ? "..." : "Criar"}
                </button>
              </form>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            {loading ? (
              <p>Carregando...</p>
            ) : (
              <details className="group">
                <summary className="flex items-center p-3 cursor-pointer list-none">
                  <svg
                    className="w-5 h-5 text-gray-500 group-open:rotate-90 transition-transform"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-semibold text-xl ml-3">Baralhos</span>
                </summary>
                <div className="pl-8 pt-4 space-y-4 border-l ml-[22px] border-gray-200 dark:border-gray-700">
                  {folders.map((folder) => {
                    const decksInFolder = decks.filter(
                      (d) => d.folder_id === folder.id
                    );
                    return (
                      <details
                        key={folder.id}
                        className="group/folder bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <summary className="flex justify-between items-center p-3 cursor-pointer list-none">
                          <div className="flex items-center gap-3 flex-grow min-w-0">
                            <svg
                              className="w-4 h-4 text-gray-500 group-open/folder:rotate-90 transition-transform"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {editingFolderId === folder.id ? (
                              <InlineEdit
                                initialValue={folder.name}
                                onSave={(newName) =>
                                  handleRenameFolder(folder.id, newName)
                                }
                                onCancel={() => setEditingFolderId(null)}
                                className="font-semibold px-2 py-1 w-full"
                              />
                            ) : (
                              <span className="font-semibold truncate">
                                {folder.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 pl-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFolderId(folder.id);
                              }}
                              className="text-gray-400 hover:text-blue-500"
                              title="Renomear pasta"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                <path
                                  fillRule="evenodd"
                                  d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFolderToDelete(folder);
                              }}
                              className="text-gray-400 hover:text-red-500"
                              title="Excluir pasta"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          </div>
                        </summary>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-600">
                          {decksInFolder.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                              {decksInFolder.map((deck) => (
                                <div
                                  key={deck.id}
                                  className="relative group bg-white dark:bg-gray-800 rounded-md shadow-sm hover:shadow-lg transition-shadow flex flex-col"
                                >
                                  <div className="p-4 flex-grow">
                                    {editingDeckId === deck.id ? (
                                      <InlineEdit
                                        initialValue={deck.name}
                                        onSave={(newName) =>
                                          handleRenameDeck(deck.id, newName)
                                        }
                                        onCancel={() => setEditingDeckId(null)}
                                        className="font-bold text-base"
                                      />
                                    ) : (
                                      <Link
                                        to={`/decks/${deck.id}`}
                                        className="block h-full after:absolute after:inset-0"
                                      >
                                        <h4 className="font-bold truncate">
                                          {deck.name}
                                        </h4>
                                      </Link>
                                    )}
                                  </div>
                                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button
                                      onClick={() => setEditingDeckId(deck.id)}
                                      className="p-1.5 bg-blue-500/10 text-blue-500 rounded-full hover:bg-blue-500 hover:text-white"
                                      title="Renomear baralho"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                        <path
                                          fillRule="evenodd"
                                          d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => setDeckToMove(deck)}
                                      className="p-1.5 bg-purple-500/10 text-purple-500 rounded-full hover:bg-purple-500 hover:text-white"
                                      title="Mover baralho"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => setDeckToDelete(deck)}
                                      className="p-1.5 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white"
                                      title="Excluir baralho"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">
                              Nenhum baralho nesta pasta.
                            </p>
                          )}
                        </div>
                      </details>
                    );
                  })}
                  {decksWithoutFolder.map((deck) => (
                    <div
                      key={deck.id}
                      className="relative group bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow-sm flex flex-col p-3"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 flex-grow min-w-0">
                          <svg
                            className="w-4 h-4 text-gray-400"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                          </svg>
                          {editingDeckId === deck.id ? (
                            <InlineEdit
                              initialValue={deck.name}
                              onSave={(newName) =>
                                handleRenameDeck(deck.id, newName)
                              }
                              onCancel={() => setEditingDeckId(null)}
                              className="font-semibold"
                            />
                          ) : (
                            <Link
                              to={`/decks/${deck.id}`}
                              className="block after:absolute after:inset-0"
                            >
                              <span className="font-semibold truncate">
                                {deck.name}
                              </span>
                            </Link>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex-shrink-0">
                          <button
                            onClick={() => setEditingDeckId(deck.id)}
                            className="p-1.5 bg-blue-500/10 text-blue-500 rounded-full hover:bg-blue-500 hover:text-white"
                            title="Renomear baralho"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                              <path
                                fillRule="evenodd"
                                d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeckToMove(deck)}
                            className="p-1.5 bg-purple-500/10 text-purple-500 rounded-full hover:bg-purple-500 hover:text-white"
                            title="Mover baralho"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeckToDelete(deck)}
                            className="p-1.5 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white"
                            title="Excluir baralho"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </section>
      </div>

      <ConfirmationModal
        isOpen={!!deckToDelete}
        onClose={() => setDeckToDelete(null)}
        onConfirm={handleDeleteDeck}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o baralho "${deckToDelete?.name}"?`}
      />
      <ConfirmationModal
        isOpen={!!folderToDelete}
        onClose={() => setFolderToDelete(null)}
        onConfirm={handleDeleteFolder}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir a pasta "${folderToDelete?.name}"?`}
      />
      <MoveDeckModal
        isOpen={!!deckToMove}
        onClose={() => setDeckToMove(null)}
        onConfirm={handleMoveDeck}
        folders={folders}
        currentFolderId={deckToMove?.folder_id || null}
        deckName={deckToMove?.name || ""}
      />
    </div>
  );
};
export default DashboardPage;
