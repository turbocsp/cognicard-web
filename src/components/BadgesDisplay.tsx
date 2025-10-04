import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const BadgesDisplay = () => {
  const { session } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserBadges = async () => {
      if (!session) return;
      setLoading(true);

      const { data, error } = await supabase.from("user_badges").select(`
          badges (
            id, name, description, icon
          )
        `);

      if (error) {
        console.error("Error fetching user badges:", error);
      } else {
        const userBadges = data
          .map((item) => item.badges)
          .filter((badge): badge is Badge => badge !== null);
        setBadges(userBadges);
      }
      setLoading(false);
    };

    fetchUserBadges();
  }, [session]);

  if (loading) {
    return <p className="text-sm text-gray-500">Carregando conquistas...</p>;
  }

  if (badges.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Continue estudando para ganhar emblemas!
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {badges.map((badge) => (
        <div
          key={badge.id}
          className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg"
          title={badge.description}
        >
          <span className="text-4xl">{badge.icon}</span>
          <div>
            <h4 className="font-bold">{badge.name}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {badge.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BadgesDisplay;
