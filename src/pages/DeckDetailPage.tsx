// src/pages/DeckDetailPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { toast } from "../components/Notifier";

interface Card {
  id: string;
  front_content: string;
  back_content: string;
  theory_notes: string | null;
  tags: string[] | null;
}
interface Deck {
  id: string;
  name: string;
}

const DeckDetailPage = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const { session } = useAuth();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  const [frontContent, setFrontContent] = useState("");
  const [backContent, setBackContent] = useState("");
  const [theoryNotes, setTheoryNotes] = useState("");
  const [sourceReferences, setSourceReferences] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!deckId) return;
      setLoading(true);
      const deckPromise = supabase
        .from("decks")
        .select("id, name")
        .eq("id", deckId)
        .single();
      const cardsPromise = supabase
        .from("smart_cards")
        .select("*")
        .eq("deck_id", deckId)
        .order("created_at");
      const [
        { data: deckData, error: deckError },
        { data: cardsData, error: cardsError },
      ] = await Promise.all([deckPromise, cardsPromise]);
      if (deckError) {
        console.error("Error fetching deck:", deckError.message);
        toast.error("Erro ao carregar o baralho.");
      } else setDeck(deckData);
      if (cardsError) {
        console.error("Error fetching cards:", cardsError.message);
        toast.error("Erro ao carregar os cartões.");
      } else setCards(cardsData || []);
      setLoading(false);
    };
    fetchData();
  }, [deckId]);

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontContent.trim() || !backContent.trim() || !deckId || !session)
      return;

    setIsSubmitting(true);

    const tagsArray = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag);
    const sourcesArray = sourceReferences
      .split(",")
      .map((source) => source.trim())
      .filter((source) => source);

    const { data, error } = await supabase
      .from("smart_cards")
      .insert({
        deck_id: deckId,
        user_id: session.user.id,
        front_content: frontContent,
        back_content: backContent,
        theory_notes: theoryNotes,
        source_references: sourcesArray,
        tags: tagsArray,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
    } else if (data) {
      setCards([...cards, data]);
      setFrontContent("");
      setBackContent("");
      setTheoryNotes("");
      setSourceReferences("");
      setTags("");
      toast.success("Cartão adicionado com sucesso!");
    }
    setIsSubmitting(false);
  };

  if (loading) return <div className="p-8">Carregando baralho...</div>;
  if (!deck) return <div className="p-8">Baralho não encontrado.</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* --- SEÇÃO DO CABEÇALHO CORRIGIDA --- */}
        <header className="mb-8">
          <Link
            to="/dashboard"
            className="text-blue-500 hover:underline mb-2 block"
          >
            &larr; Voltar ao Painel
          </Link>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-3xl font-bold">{deck.name}</h1>
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/decks/${deckId}/study`}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 text-center"
              >
                Revisão Inteligente (SRS)
              </Link>
              <Link
                to={`/decks/${deckId}/study-all`}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 text-center"
              >
                Estudar Tudo
              </Link>
              <Link
                to={`/decks/${deckId}/import`}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 text-center"
              >
                Importar CSV
              </Link>
            </div>
          </div>
        </header>
        {/* --- FIM DA SEÇÃO CORRIGIDA --- */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">
                Adicionar Novo Cartão
              </h2>
              <form onSubmit={handleCreateCard} className="space-y-4">
                {/* ... (campos do formulário) ... */}
                <div>
                  <label
                    htmlFor="front"
                    className="block text-sm font-medium mb-1"
                  >
                    Frente (Pergunta)
                  </label>
                  <textarea
                    id="front"
                    value={frontContent}
                    onChange={(e) => setFrontContent(e.target.value)}
                    rows={3}
                    className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="back"
                    className="block text-sm font-medium mb-1"
                  >
                    Verso (Resposta)
                  </label>
                  <textarea
                    id="back"
                    value={backContent}
                    onChange={(e) => setBackContent(e.target.value)}
                    rows={3}
                    className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="theory"
                    className="block text-sm font-medium mb-1"
                  >
                    Teoria (Opcional)
                  </label>
                  <textarea
                    id="theory"
                    value={theoryNotes}
                    onChange={(e) => setTheoryNotes(e.target.value)}
                    rows={3}
                    className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="sources"
                    className="block text-sm font-medium mb-1"
                  >
                    Fontes (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    id="sources"
                    value={sourceReferences}
                    onChange={(e) => setSourceReferences(e.target.value)}
                    className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="tags"
                    className="block text-sm font-medium mb-1"
                  >
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-400"
                >
                  {isSubmitting ? "Adicionando..." : "Adicionar Cartão"}
                </button>
              </form>
            </div>
          </div>
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">
              Cartões no Baralho ({cards.length})
            </h2>
            <div className="space-y-4">
              {cards.length > 0 ? (
                cards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
                  >
                    <p className="font-semibold border-b border-gray-200 dark:border-gray-700 pb-2 mb-2">
                      {card.front_content}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                      {card.back_content}
                    </p>
                    {card.tags && card.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        {card.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  Este baralho ainda não tem cartões. Adicione um no formulário
                  ao lado!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeckDetailPage;
