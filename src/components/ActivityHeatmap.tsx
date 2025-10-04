import HeatMap from "@uiw/react-heat-map";
import Tooltip from "@uiw/react-tooltip";
import { supabase } from "../supabaseClient";
import { subYears, subMonths, format, startOfDay, endOfDay } from "date-fns";
import { useAuth } from "../context/AuthContext";
import useMeasure from "react-use-measure";
import { useState, useEffect } from "react";

// Tipo para os dados renderizados no tooltip
type HeatmapData = {
  date: string;
  count: number;
};

const ActivityHeatmap = () => {
  const { session } = useAuth();
  const [data, setData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(subYears(new Date(), 1));
  const today = endOfDay(new Date());

  const [ref, { width }] = useMeasure();

  useEffect(() => {
    const fetchActivityData = async () => {
      if (!session) {
        setLoading(false);
        return;
      }
      setLoading(true);
      let newStartDate;
      const timeRange = width < 500 ? "month" : "year";

      switch (timeRange) {
        case "month":
          newStartDate = startOfDay(subMonths(today, 1));
          break;
        case "year":
        default:
          newStartDate = startOfDay(subYears(today, 1));
          break;
      }
      setStartDate(newStartDate);

      const { data: activityData, error } = await supabase.rpc(
        "get_review_activity",
        {
          query_user_id: session.user.id,
          start_date: newStartDate.toISOString(),
          end_date: today.toISOString(),
        }
      );

      if (error) {
        console.error("Error fetching activity data:", error);
      } else {
        const formattedData = (activityData || []).map((d: any) => ({
          ...d,
          date: format(new Date(d.date), "yyyy/MM/dd"),
        }));
        setData(formattedData);
      }
      setLoading(false);
    };
    if (width > 0) {
      fetchActivityData();
    }
  }, [session, width]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="w-full h-full flex items-center justify-center">
      {width > 0 && (
        <HeatMap
          value={data}
          width={width}
          style={{ color: "#888" }}
          startDate={startDate}
          endDate={today}
          rectSize={Math.min(width / 53, 12)}
          space={3}
          panelColors={{
            0: "#ebedf0",
            2: "#9be9a8",
            5: "#40c463",
            10: "#30a14e",
            20: "#216e39",
          }}
          rectRender={(
            props: React.SVGProps<SVGRectElement>,
            data: HeatmapData
          ) => {
            if (!data.date) return <rect {...props} />;
            const dateObj = new Date(data.date);
            const userOffset = dateObj.getTimezoneOffset() * 60000;
            const localDate = new Date(dateObj.getTime() + userOffset);
            const dateFormatted = format(localDate, "dd/MM/yyyy");
            return (
              <Tooltip
                placement="top"
                content={`${data.count || 0} revisões em ${dateFormatted}`}
              >
                <rect {...props} />
              </Tooltip>
            );
          }}
        />
      )}
    </div>
  );
};

export default ActivityHeatmap;
