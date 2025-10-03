import React, { useState, useEffect, memo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { supabase } from "../supabaseClient";

const COLORS: { [key: string]: string } = {
  Novos: "#3B82F6",
  "Em Aprendizagem": "#F97316",
  Maduros: "#22C55E",
};

const MaturityChart = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaturityData = async () => {
      setLoading(true);
      const { data: maturityData, error } = await supabase.rpc(
        "get_card_maturity_stats"
      );

      if (error) {
        console.error("Error fetching maturity data:", error);
      } else {
        setData(maturityData || []);
      }
      setLoading(false);
    };

    fetchMaturityData();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-gray-500">Calculando maturidade...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-gray-500">Nenhum cartão para analisar.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="count"
          nameKey="status"
          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry) => (
            <Cell key={`cell-${entry.status}`} fill={COLORS[entry.status]} />
          ))}
        </Pie>
        <Tooltip formatter={(value, name) => [`${value} cartões`, name]} />
        <Legend iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default memo(MaturityChart);
