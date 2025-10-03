import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import TimeInput from "../components/TimeInput"; // Importar o novo componente

interface SrsSettings {
  lapse_interval_minutes: number;
  initial_step_1_minutes: number;
  initial_step_2_minutes: number;
  easy_bonus_multiplier: number;
  starting_ease_factor: number;
}

const DEFAULT_SETTINGS: SrsSettings = {
  lapse_interval_minutes: 10,
  initial_step_1_minutes: 1440, // 1 dia
  initial_step_2_minutes: 8640, // 6 dias
  easy_bonus_multiplier: 1.3,
  starting_ease_factor: 2.5,
};

const SettingsPage = () => {
  const { session } = useAuth();
  const [settings, setSettings] = useState<SrsSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!session) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("user_srs_settings")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching settings:", error);
      } else if (data) {
        setSettings(data);
      }
      setLoading(false);
    };
    fetchSettings();
  }, [session]);

  const handleTimeInputChange = (
    name: keyof SrsSettings,
    valueInMinutes: number
  ) => {
    setSettings((prev) => ({
      ...prev,
      [name]: valueInMinutes,
    }));
  };

  const handleNumericInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: parseFloat(value),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setIsSaving(true);
    setSaveMessage(null);

    const { error } = await supabase
      .from("user_srs_settings")
      .upsert({ user_id: session.user.id, ...settings });

    if (error) {
      alert(`Erro ao salvar: ${error.message}`);
      setSaveMessage("Erro ao salvar as configurações.");
    } else {
      setSaveMessage("Configurações salvas com sucesso!");
    }
    setIsSaving(false);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleResetToDefaults = async () => {
    if (!session) return;
    if (
      window.confirm(
        "Tem certeza de que deseja reverter para as configurações padrão?"
      )
    ) {
      setIsSaving(true);
      const { error } = await supabase
        .from("user_srs_settings")
        .delete()
        .eq("user_id", session.user.id);

      if (error) {
        alert(`Erro ao reverter: ${error.message}`);
      } else {
        setSettings(DEFAULT_SETTINGS);
        setSaveMessage("Configurações revertidas para o padrão.");
      }
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Carregando configurações...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <Link
            to="/dashboard"
            className="text-blue-500 hover:underline mb-2 block"
          >
            &larr; Voltar ao Painel
          </Link>
          <h1 className="text-3xl font-bold">Configurações de SRS</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Ajuste os parâmetros do algoritmo de repetição espaçada.
          </p>
        </header>

        <form
          onSubmit={handleSave}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-6"
        >
          <div>
            <label className="block text-sm font-medium">
              Intervalo de Lapso
            </label>
            <p className="text-xs text-gray-500 mb-1">
              Quando você erra um cartão ("Errei"), ele volta em quanto tempo?
            </p>
            <TimeInput
              valueInMinutes={settings.lapse_interval_minutes}
              onChange={(value) =>
                handleTimeInputChange("lapse_interval_minutes", value)
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              1º Passo de Aprendizagem
            </label>
            <p className="text-xs text-gray-500 mb-1">
              Após acertar um cartão novo pela primeira vez (padrão: 1 dia).
            </p>
            <TimeInput
              valueInMinutes={settings.initial_step_1_minutes}
              onChange={(value) =>
                handleTimeInputChange("initial_step_1_minutes", value)
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              2º Passo de Aprendizagem
            </label>
            <p className="text-xs text-gray-500 mb-1">
              Após acertar pela segunda vez consecutiva (padrão: 6 dias).
            </p>
            <TimeInput
              valueInMinutes={settings.initial_step_2_minutes}
              onChange={(value) =>
                handleTimeInputChange("initial_step_2_minutes", value)
              }
            />
          </div>
          <div>
            <label
              htmlFor="easy_bonus_multiplier"
              className="block text-sm font-medium"
            >
              Bônus de "Fácil"
            </label>
            <p className="text-xs text-gray-500 mb-1">
              Multiplicador aplicado ao intervalo quando você avalia como
              "Fácil".
            </p>
            <input
              type="number"
              step="0.01"
              min="1"
              id="easy_bonus_multiplier"
              name="easy_bonus_multiplier"
              value={settings.easy_bonus_multiplier}
              onChange={handleNumericInputChange}
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
            />
          </div>
          <div>
            <label
              htmlFor="starting_ease_factor"
              className="block text-sm font-medium"
            >
              Fator de Facilidade Inicial
            </label>
            <p className="text-xs text-gray-500 mb-1">
              Valor base para o cálculo dos intervalos (padrão: 2.50 = 250%).
            </p>
            <input
              type="number"
              step="0.01"
              min="1.3"
              id="starting_ease_factor"
              name="starting_ease_factor"
              value={settings.starting_ease_factor}
              onChange={handleNumericInputChange}
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="text-sm text-gray-500 hover:underline"
            >
              Reverter para o Padrão
            </button>
            <div className="flex items-center gap-4">
              {saveMessage && (
                <span className="text-sm text-green-500">{saveMessage}</span>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition disabled:bg-gray-400"
              >
                {isSaving ? "Salvando..." : "Salvar Configurações"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
