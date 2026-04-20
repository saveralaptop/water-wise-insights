import { useEffect, useRef, useState } from "react";
import { Activity, Pause, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Simulator: posts realistic readings to the /data edge function every few seconds.
// Most readings are SAFE; ~1 in 5 is intentionally out of range.
function generateReading() {
  const unsafe = Math.random() < 0.2;
  if (unsafe) {
    const pick = Math.floor(Math.random() * 3);
    return {
      ph: pick === 0 ? +(5.5 + Math.random() * 0.5).toFixed(2) : +(7 + Math.random() * 1).toFixed(2),
      tds: pick === 1 ? Math.round(1100 + Math.random() * 400) : Math.round(300 + Math.random() * 400),
      turbidity: pick === 2 ? +(28 + Math.random() * 15).toFixed(1) : +(3 + Math.random() * 10).toFixed(1),
      temperature: +(22 + Math.random() * 6).toFixed(1),
    };
  }
  return {
    ph: +(6.8 + Math.random() * 1.4).toFixed(2),
    tds: Math.round(250 + Math.random() * 600),
    turbidity: +(2 + Math.random() * 18).toFixed(1),
    temperature: +(22 + Math.random() * 6).toFixed(1),
  };
}

export const Simulator = ({ onPosted }: { onPosted: () => void }) => {
  const [running, setRunning] = useState(true);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    const tick = async () => {
      try {
        const { error } = await supabase.functions.invoke("data", { body: generateReading() });
        if (error) throw error;
        onPosted();
      } catch (e) {
        console.error(e);
        toast.error("Simulator failed to post reading");
      }
    };
    tick();
    intervalRef.current = window.setInterval(tick, 4000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running, onPosted]);

  return (
    <button
      onClick={() => setRunning((r) => !r)}
      className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground shadow-card transition hover:border-primary/60"
    >
      <Activity className={`h-3.5 w-3.5 ${running ? "text-primary" : "text-muted-foreground"}`} />
      <span>Simulator</span>
      {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      <span className="text-muted-foreground">{running ? "running" : "paused"}</span>
    </button>
  );
};
