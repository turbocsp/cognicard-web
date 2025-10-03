import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { supabase } from "../supabaseClient";
import { startOfDay, addDays, format, eachDayOfInterval } from "date-fns";

const ForecastChart = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForecastData = async () => {
      setLoading(true);
      const today = startOfDay(new Date());
      const futureDate = addDays(today, 29); // 30 dias no total

      const { data: cards, error } = await supabase
        .from("smart_cards")
        .select("next_review_at")
        .gte("next_review_at", today.toISOString())
        .lte("next_review_at", futureDate.toISOString());

      if (error) {
        console.error("Error fetching forecast data:", error);
        setLoading(false);
        return;
      }

      const intervalDays = eachDayOfInterval({ start: today, end: futureDate });
      const dailyCounts: { [key: string]: number } = {};
      intervalDays.forEach((day) => {
        dailyCounts[format(day, "dd/MM")] = 0;
      });

      cards.forEach((card) => {
        const reviewDate = format(
          startOfDay(new Date(card.next_review_at)),
          "dd/MM"
        );
        if (dailyCounts[reviewDate] !== undefined) {
          dailyCounts[reviewDate]++;
        }
      });

      const chartData = Object.keys(dailyCounts).map((date) => ({
        name: date,
        revisões: dailyCounts[date],
      }));

      setData(chartData);
      setLoading(false);
    };

    fetchForecastData();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-gray-500">Carregando previsão...</p>
      </div>
    );
  }

  if (data.every((d) => d["revisões"] === 0)) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-gray-500">
          Nenhuma revisão agendada para os próximos 30 dias.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 20, right: 20, left: -20, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="rgba(128, 128, 128, 0.2)"
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10 }}
          interval={"preserveStartEnd"}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
        <Tooltip
          cursor={{ fill: "rgba(240, 244, 249, 0.5)" }}
          contentStyle={{
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(200, 200, 200, 0.5)",
            borderRadius: "0.5rem",
          }}
        />
        <Bar dataKey="revisões" fill="#3B82F6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ForecastChart;
