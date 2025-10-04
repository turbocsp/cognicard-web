interface AnswerDisplayProps {
  deckType?: "general" | "right_wrong";
  answerText: string | null;
}

const AnswerDisplay = ({ deckType, answerText }: AnswerDisplayProps) => {
  if (!answerText) {
    return null; // Não renderiza nada se não houver texto de resposta
  }

  // Verifica se é um baralho Certo/Errado e se a resposta começa com as palavras-chave
  if (deckType === "right_wrong") {
    const firstWord = answerText
      .split(" ")[0]
      .toLowerCase()
      .replace(/[.:!?,]/g, "");
    const restOfText = answerText.substring(answerText.indexOf(" ") + 1);

    if (firstWord === "certo") {
      return (
        <p>
          <span className="font-bold text-green-600 dark:text-green-400">
            Certo.
          </span>
          {restOfText && ` ${restOfText}`}
        </p>
      );
    }

    if (firstWord === "errado") {
      return (
        <p>
          <span className="font-bold text-red-500 dark:text-red-400">
            Errado.
          </span>
          {restOfText && ` ${restOfText}`}
        </p>
      );
    }
  }

  // Para baralhos gerais ou se as palavras-chave не forem encontradas, exibe o texto normalmente
  return <p>{answerText}</p>;
};

export default AnswerDisplay;
