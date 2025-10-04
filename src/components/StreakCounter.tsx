import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

const StreakCounter = () => {
  const { session } = useAuth();
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStreak = async () => {
      if (!session) {
        setLoading(false);
        return;
      }
      setLoading(true);

      // Chama a nova função RPC no backend em vez de buscar todos os logs
      const { data, error } = await supabase.rpc("calculate_user_streak", {
        p_user_id: session.user.id,
      });

      if (error) {
        console.error("Error fetching streak:", error);
      } else {
        const calculatedStreak = data || 0;
        setStreak(calculatedStreak);

        if (calculatedStreak >= 7) {
          supabase
            .rpc("award_badge_if_not_present", { p_badge_id: "streak_7" })
            .then(({ error: badgeError }) => {
              if (badgeError)
                console.error("Error awarding streak badge:", badgeError);
            });
        }
      }
      setLoading(false);
    };

    fetchStreak();
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
