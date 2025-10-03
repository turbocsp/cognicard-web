import React, { useState, useEffect } from "react";

type Unit = "minutes" | "hours" | "days";

interface TimeInputProps {
  valueInMinutes: number;
  onChange: (valueInMinutes: number) => void;
  min?: number; // Valor mínimo em minutos
}

const TimeInput = ({ valueInMinutes, onChange, min = 1 }: TimeInputProps) => {
  const [value, setValue] = useState(1);
  const [unit, setUnit] = useState<Unit>("minutes");

  useEffect(() => {
    // Converte o valor inicial em minutos para a melhor unidade possível
    if (valueInMinutes >= 1440 && valueInMinutes % 1440 === 0) {
      setValue(valueInMinutes / 1440);
      setUnit("days");
    } else if (valueInMinutes >= 60 && valueInMinutes % 60 === 0) {
      setValue(valueInMinutes / 60);
      setUnit("hours");
    } else {
      setValue(valueInMinutes);
      setUnit("minutes");
    }
  }, [valueInMinutes]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10) || 0;
    setValue(newValue);
    updateTotalMinutes(newValue, unit);
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value as Unit;
    setUnit(newUnit);
    updateTotalMinutes(value, newUnit);
  };

  const updateTotalMinutes = (currentValue: number, currentUnit: Unit) => {
    let totalMinutes = 0;
    if (currentUnit === "days") {
      totalMinutes = currentValue * 1440;
    } else if (currentUnit === "hours") {
      totalMinutes = currentValue * 60;
    } else {
      totalMinutes = currentValue;
    }
    onChange(Math.max(min, totalMinutes)); // Garante que o valor não seja menor que o mínimo
  };

  return (
    <div className="flex gap-2">
      <input
        type="number"
        min={1}
        value={value}
        onChange={handleValueChange}
        className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <select
        value={unit}
        onChange={handleUnitChange}
        className="px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="minutes">Minutos</option>
        <option value="hours">Horas</option>
        <option value="days">Dias</option>
      </select>
    </div>
  );
};

export default TimeInput;
