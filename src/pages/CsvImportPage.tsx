import React, { useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Papa, { ParseResult } from "papaparse";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { toast } from "../components/Notifier";

interface CardToInsert {
  deck_id: string;
  user_id: string;
  front_content?: string;
  back_content?: string;
  theory_notes?: string;
  source_references?: string[];
  tags?: string[];
}
type CsvRow = { [key: string]: string };
type CsvPreviewData = (string | number)[][];

const TARGET_FIELDS = [
  { value: "ignore", label: "Ignorar esta coluna" },
  { value: "front_content", label: "Frente (Pergunta)" },
  { value: "back_content", label: "Verso (Resposta)" },
  { value: "theory_notes", label: "Teoria" },
  { value: "source_references", label: "Fontes (separadas por vírgula)" },
  { value: "tags", label: "Tags (separadas por vírgula)" },
];
const DELIMITERS = [
  { value: ",", label: "Vírgula (,)" },
  { value: ";", label: "Ponto e vírgula (;)" },
  { value: "|", label: "Pipe (|)" },
  { value: "-", label: "Hífen (-)" },
];

const CsvImportPage = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [delimiter, setDelimiter] = useState<string>(";");
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<CsvPreviewData>([]);
  const [mappings, setMappings] = useState<{ [key: string]: string }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [cardsToInsert, setCardsToInsert] = useState<CardToInsert[]>([]);
  const fullCsvData = useRef<CsvRow[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setHeaders([]);
    setPreviewData([]);
    setValidationErrors([]);
    setCardsToInsert([]);
  };

  const handlePreview = () => {
    if (!file) return;
    setIsProcessing(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
      delimiter: delimiter,
      complete: (results: ParseResult<CsvRow>) => {
        setIsProcessing(false);
        if (results.errors.length) {
          const firstError = results.errors[0];
          toast.error(
            `Erro ao ler o arquivo na linha ${firstError.row}: ${firstError.message}`
          );
          return;
        }
        if (results.meta.fields) {
          setHeaders(results.meta.fields);
          const initialMappings: { [key: string]: string } = {};
          results.meta.fields.forEach((field) => {
            initialMappings[field] = "ignore";
          });
          setMappings(initialMappings);
        }
        const dataAsArrays = results.data.map((row) =>
          results.meta.fields
            ? results.meta.fields.map((field) => row[field])
            : []
        );
        setPreviewData(dataAsArrays as CsvPreviewData);
      },
    });
  };

  const handleValidation = () => {
    if (!file) return;
    setIsProcessing(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: delimiter,
      complete: (results: ParseResult<CsvRow>) => {
        setIsProcessing(false);
        if (results.errors.length > 0) {
          const criticalErrors = results.errors.filter(
            (e) => e.code !== "TooManyFields" && e.code !== "TooFewFields"
          );
          if (criticalErrors.length > 0) {
            toast.error(
              `Seu arquivo CSV parece ter erros de formatação que impedem a leitura.`
            );
            return;
          }
        }
        fullCsvData.current = results.data;
        validateData();
      },
    });
  };

  const validateData = () => {
    const errors: string[] = [];
    const cards: CardToInsert[] = [];
    if (!deckId || !session?.user.id) {
      toast.error("Erro: Não foi possível identificar o usuário ou o baralho.");
      return;
    }
    const mappedFields = Object.values(mappings);
    if (
      !mappedFields.includes("front_content") ||
      !mappedFields.includes("back_content")
    ) {
      setValidationErrors([
        "Erro: Você precisa mapear as colunas para 'Frente (Pergunta)' e 'Verso (Resposta)'.",
      ]);
      setCardsToInsert([]);
      setStep(3);
      return;
    }
    fullCsvData.current.forEach((row, index) => {
      const newCard: CardToInsert = {
        deck_id: deckId,
        user_id: session.user.id,
      };
      for (const header of headers) {
        const targetField = mappings[header];
        if (targetField !== "ignore") {
          const value = row[header];
          if (targetField === "tags" || targetField === "source_references") {
            newCard[targetField] = value
              ? value
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s)
              : [];
          } else {
            (newCard as any)[targetField] = value;
          }
        }
      }
      if (!newCard.front_content || !newCard.back_content) {
        errors.push(
          `Linha ${
            index + 2
          }: Os campos de Frente e Verso não podem estar vazios.`
        );
      }
      cards.push(newCard);
    });
    setValidationErrors(errors);
    setCardsToInsert(cards);
    setStep(3);
  };

  const handleFinalImport = async () => {
    if (cardsToInsert.length === 0) return;
    setIsProcessing(true);
    const { error } = await supabase.from("smart_cards").insert(cardsToInsert);
    if (error) {
      toast.error("Ocorreu um erro ao salvar os cartões: " + error.message);
    } else {
      if (cardsToInsert.length >= 50) {
        supabase
          .rpc("award_badge_if_not_present", { p_badge_id: "import_50" })
          .then(({ error: badgeError }) => {
            if (badgeError)
              console.error("Error awarding import badge:", badgeError);
          });
      }
      toast.success(`${cardsToInsert.length} cartões importados com sucesso!`);
      navigate(`/decks/${deckId}`);
    }
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <Link
            to={`/decks/${deckId}`}
            className="text-blue-500 hover:underline mb-2 block"
          >
            &larr; Voltar para o Baralho
          </Link>
          <h1 className="text-3xl font-bold">Importar Cartões via CSV</h1>
        </header>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Etapa 1 de 3: Selecione o Arquivo e o Separador
              </h2>
              <div className="mb-4">
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 inline-block"
                >
                  Escolher Arquivo
                </label>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {fileName && (
                  <span className="ml-4 font-semibold">{fileName}</span>
                )}
              </div>
              {file && (
                <div className="my-6 border-t border-b py-6 dark:border-gray-700">
                  <h3 className="font-semibold mb-3">
                    Qual separador seu arquivo utiliza?
                  </h3>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {DELIMITERS.map((d) => (
                      <label
                        key={d.value}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="delimiter"
                          value={d.value}
                          checked={delimiter === d.value}
                          onChange={(e) => setDelimiter(e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{d.label}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={handlePreview}
                    disabled={isProcessing}
                    className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                  >
                    {isProcessing
                      ? "Analisando..."
                      : "Analisar e Pré-visualizar"}
                  </button>
                </div>
              )}
              {previewData.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-2">
                    Pré-visualização dos dados:
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                          {headers.map((header) => (
                            <th key={header} className="px-6 py-3">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                          >
                            {row.map((cell, cellIndex) => (
                              <td
                                key={cellIndex}
                                className="px-6 py-4 truncate max-w-xs"
                              >
                                {String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                  >
                    Próximo: Mapear Colunas
                  </button>
                </div>
              )}
            </div>
          )}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Etapa 2 de 3: Mapeie as Colunas
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Associe cada coluna do seu arquivo CSV a um campo do CogniCard.
              </p>
              <div className="space-y-4">
                {headers.map((header) => (
                  <div
                    key={header}
                    className="grid grid-cols-2 gap-4 items-center border-b pb-4 dark:border-gray-700"
                  >
                    <span className="font-bold truncate" title={header}>
                      {header}
                    </span>
                    <select
                      value={mappings[header] || "ignore"}
                      onChange={(e) =>
                        setMappings((prev) => ({
                          ...prev,
                          [header]: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {TARGET_FIELDS.map((field) => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => {
                    setHeaders([]);
                    setPreviewData([]);
                    setStep(1);
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                >
                  Voltar
                </button>
                <button
                  onClick={handleValidation}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                >
                  {isProcessing ? "Validando..." : "Próximo: Validar Dados"}
                </button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Etapa 3 de 3: Validação e Confirmação
              </h2>
              {isProcessing ? (
                <p>Processando...</p>
              ) : validationErrors.length > 0 ? (
                <div>
                  <h3 className="font-bold text-red-500 mb-2">
                    Erros de validação encontrados:
                  </h3>
                  <ul className="list-disc list-inside text-red-500 text-sm space-y-1 max-h-48 overflow-y-auto p-2 border border-red-500/50 rounded-md">
                    {validationErrors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setStep(2)}
                    className="mt-6 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                  >
                    Voltar e Corrigir Mapeamento
                  </button>
                </div>
              ) : (
                <div>
                  <h3 className="font-bold text-green-500 mb-2">
                    ✅ Validação concluída com sucesso!
                  </h3>
                  <p>
                    {cardsToInsert.length} cartões estão prontos para serem
                    importados.
                  </p>
                  <div className="flex justify-between mt-6">
                    <button
                      onClick={() => setStep(2)}
                      className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleFinalImport}
                      disabled={isProcessing}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
                    >
                      {isProcessing
                        ? "Importando..."
                        : `Confirmar e Importar ${cardsToInsert.length} Cartões`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default CsvImportPage;
