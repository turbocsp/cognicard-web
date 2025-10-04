import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { differenceInCalendarDays, startOfDay } from "date-fns";

const StreakCounter = () => {
  const { session } = useAuth();
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateStreak = (reviewDates: Date[]): number => {
      if (reviewDates.length === 0) return 0;
      let currentStreak = 0;
      const today = startOfDay(new Date());
      const sortedDates = reviewDates.sort((a, b) => b.getTime() - a.getTime());

      if (
        differenceInCalendarDays(today, sortedDates[0]) === 0 ||
        differenceInCalendarDays(today, sortedDates[0]) === 1
      ) {
        currentStreak = 1;
        for (let i = 0; i < sortedDates.length - 1; i++) {
          const diff = differenceInCalendarDays(
            sortedDates[i],
            sortedDates[i + 1]
          );
          if (diff === 1) {
            currentStreak++;
          } else if (diff > 1) {
            break;
          }
        }
      }
      return currentStreak;
    };

    const fetchStreaks = async () => {
      if (!session) {
        setLoading(false);
        return;
      }
      setLoading(true);

      const { data, error } = await supabase
        .from("review_log")
        .select("reviewed_at");

      if (error) {
        console.error("Error fetching review logs for streak:", error);
      } else {
        const uniqueDays = [
          ...new Set(
            data.map((log) =>
              startOfDay(new Date(log.reviewed_at)).toISOString()
            )
          ),
        ];
        const reviewDates = uniqueDays.map((day) => new Date(day));
        const calculatedStreak = calculateStreak(reviewDates);
        setStreak(calculatedStreak);

        if (calculatedStreak >= 7) {
          supabase
            .rpc("award_badge_if_not_present", { p_badge_id: "streak_7" })
            .then(({ error }) => {
              if (error) console.error("Error awarding streak badge:", error);
            });
        }
      }
      setLoading(false);
    };

    fetchStreaks();
  }, [session]);

  if (loading) {
    return <div className="text-sm">...</div>;
  }

  return (
    <div
      className="flex items-center gap-2 text-orange-500 font-bold"
      title={`${streak} dias de sequência de estudo`}
    >
      <span className="text-2xl">🔥</span>
      <span>
        {streak} {streak === 1 ? "Dia" : "Dias"}
      </span>
    </div>
  );
};

export default StreakCounter;
