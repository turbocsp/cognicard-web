import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { calculateNextIntervals, formatInterval } from "../utils/srs";
import AnswerDisplay from "../components/AnswerDisplay";
import { useAuth } from "../context/AuthContext";
import { toast } from "../components/Notifier";

interface Card {
  id: string;
  front_content: string;
  back_content: string;
  theory_notes: string | null;
  source_references: string[] | null;
  tags: string[] | null;
  srs_repetition: number;
  srs_ease_factor: number;
  srs_interval_minutes: number;
}
interface Deck {
  id: string;
  name: string;
  deck_type: "general" | "right_wrong";
}
interface SrsSettings {
  lapse_interval_minutes: number;
  initial_step_1_minutes: number;
  initial_step_2_minutes: number;
  easy_bonus_multiplier: number;
}

const DEFAULT_SETTINGS: SrsSettings = {
  lapse_interval_minutes: 10,
  initial_step_1_minutes: 1440,
  initial_step_2_minutes: 8640,
  easy_bonus_multiplier: 1.3,
};

const StudySessionPage = () => {
  const { deckId } = useParams<{ deckId: string }>(); // LINHA CORRIGIDA
  const { session } = useAuth();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cardsToReview, setCardsToReview] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [previewIntervals, setPreviewIntervals] = useState<{
    [key: number]: string;
  }>({});
  const [userSrsSettings, setUserSrsSettings] =
    useState<SrsSettings>(DEFAULT_SETTINGS);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!session || !deckId) return;
      setLoading(true);

      const settingsPromise = supabase
        .from("user_srs_settings")
        .select("*")
        .single();
      const deckPromise = supabase
        .from("decks")
        .select("id, name, deck_type")
        .eq("id", deckId)
        .single();
      const cardsPromise = supabase
        .from("smart_cards")
        .select("*")
        .eq("deck_id", deckId)
        .lte("next_review_at", new Date().toISOString());

      const [
        { data: settingsData, error: settingsError },
        { data: deckData, error: deckError },
        { data: cardsData, error: cardsError },
      ] = await Promise.all([settingsPromise, deckPromise, cardsPromise]);

      if (settingsError && settingsError.code !== "PGRST116")
        toast.error(settingsError.message);
      else if (settingsData) setUserSrsSettings(settingsData);

      if (deckError) toast.error(deckError.message);
      else setDeck(deckData as Deck);
      if (cardsError) toast.error(cardsError.message);
      else {
        setCardsToReview(cardsData || []);
        if (!cardsData || cardsData.length === 0) setSessionFinished(true);
      }
      setLoading(false);
    };
    fetchData();
  }, [deckId, session]);

  useEffect(() => {
    if (cardsToReview.length > 0 && currentCardIndex < cardsToReview.length) {
      const currentCard = cardsToReview[currentCardIndex];
      const calculatedIntervals = calculateNextIntervals(
        currentCard,
        userSrsSettings
      );

      const formattedIntervals: { [key: number]: string } = {};
      for (const quality in calculatedIntervals) {
        formattedIntervals[quality] = formatInterval(
          calculatedIntervals[quality]
        );
      }
      setPreviewIntervals(formattedIntervals);
    }
  }, [currentCardIndex, cardsToReview, userSrsSettings]);

  const goToNextCard = () => {
    if (currentCardIndex >= cardsToReview.length - 1) {
      setSessionFinished(true);
    } else {
      setIsAnswerVisible(false);
      setCurrentCardIndex((prev) => prev + 1);
    }
  };

  const handlePreviousCard = () => {
    if (currentCardIndex > 0) {
      setIsAnswerVisible(false);
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  const handleEvaluation = async (quality: number) => {
    const currentCard = cardsToReview[currentCardIndex];
    if (!currentCard) return;
    try {
      const { error } = await supabase.rpc("update_card_srs", {
        card_id_input: currentCard.id,
        user_response_quality: quality,
      });
      if (error) throw error;
      goToNextCard();
    } catch (error: any) {
      toast.error(error.message);
      goToNextCard();
    }
  };

  const handleShowAnswer = () => {
    setIsAnswerVisible(true);
  };

  if (loading)
    return <div className="p-8 text-center">Carregando sessão...</div>;

  if (sessionFinished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <h1 className="text-3xl font-bold mb-4">🎉 Parabéns! 🎉</h1>
        <p className="text-xl">
          Você concluiu todos os cartões agendados para hoje.
        </p>
        <Link
          to={`/decks/${deckId}`}
          className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
        >
          Voltar para o Baralho
        </Link>
      </div>
    );
  }

  const currentCard = cardsToReview[currentCardIndex];
  if (!currentCard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <h1 className="text-3xl font-bold mb-4">Tudo em dia!</h1>
        <p className="text-xl">
          Você não tem cartões para revisar neste baralho hoje.
        </p>
        <Link
          to={`/decks/${deckId}`}
          className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
        >
          Voltar para o Baralho
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-4 sm:p-8 pb-40">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <Link
            to={`/decks/${deckId}`}
            className="text-sm text-blue-500 hover:underline"
          >
            &larr; Sair da Sessão
          </Link>
        </div>
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={handlePreviousCard}
            disabled={currentCardIndex === 0}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <p className="font-bold text-lg">
            Progresso: {currentCardIndex + 1} / {cardsToReview.length}
          </p>
          <button
            onClick={goToNextCard}
            disabled={currentCardIndex === cardsToReview.length - 1}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próxima
          </button>
        </div>
        <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2.5 mb-4">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{
              width: `${
                ((currentCardIndex + 1) / cardsToReview.length) * 100
              }%`,
            }}
          ></div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 space-y-6">
          <div className="prose dark:prose-invert max-w-none">
            <h2 className="text-xl font-semibold mb-2">Pergunta:</h2>
            <p>{currentCard.front_content}</p>
          </div>
          {isAnswerVisible && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 prose dark:prose-invert max-w-none">
              <h2 className="text-xl font-semibold mb-2">Resposta:</h2>
              <AnswerDisplay
                deckType={deck?.deck_type}
                answerText={currentCard.back_content}
              />
            </div>
          )}
          {isAnswerVisible && (
            <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
              {currentCard.theory_notes && (
                <details className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <summary className="font-semibold cursor-pointer">
                    Teoria
                  </summary>
                  <div className="mt-2 prose dark:prose-invert max-w-none text-sm">
                    <p>{currentCard.theory_notes}</p>
                  </div>
                </details>
              )}
              {currentCard.source_references &&
                currentCard.source_references.length > 0 && (
                  <details className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <summary className="font-semibold cursor-pointer">
                      Fontes
                    </summary>
                    <div className="mt-2 prose dark:prose-invert max-w-none text-sm">
                      <ul className="list-disc list-inside">
                        {currentCard.source_references.map((source, index) => (
                          <li key={index}>{source}</li>
                        ))}
                      </ul>
                    </div>
                  </details>
                )}
            </div>
          )}
          {isAnswerVisible &&
            currentCard.tags &&
            currentCard.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                {currentCard.tags.map((tag) => (
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
      </div>
      <div className="fixed bottom-0 left-0 w-full p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto grid gap-2">
          {!isAnswerVisible ? (
            deck?.deck_type === "right_wrong" ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleShowAnswer}
                  className="p-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
                >
                  Errado
                </button>
                <button
                  onClick={handleShowAnswer}
                  className="p-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors"
                >
                  Certo
                </button>
              </div>
            ) : (
              <button
                onClick={handleShowAnswer}
                className="p-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Ver Resposta
              </button>
            )
          ) : (
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <button
                  onClick={() => handleEvaluation(0)}
                  className="w-full p-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
                >
                  Errei
                </button>
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-1 block">
                  {previewIntervals[0]}
                </span>
              </div>
              <div>
                <button
                  onClick={() => handleEvaluation(3)}
                  className="w-full p-3 bg-orange-400 text-white rounded-lg font-semibold hover:bg-orange-500 transition-colors"
                >
                  Difícil
                </button>
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-1 block">
                  {previewIntervals[3]}
                </span>
              </div>
              <div>
                <button
                  onClick={() => handleEvaluation(4)}
                  className="w-full p-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
                >
                  Bom
                </button>
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-1 block">
                  {previewIntervals[4]}
                </span>
              </div>
              <div>
                <button
                  onClick={() => handleEvaluation(5)}
                  className="w-full p-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors"
                >
                  Fácil
                </button>
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-1 block">
                  {previewIntervals[5]}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default StudySessionPage;
