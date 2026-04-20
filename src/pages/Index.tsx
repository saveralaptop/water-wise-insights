import { useCallback, useEffect, useState } from "react";
import { Droplets } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SensorCard } from "@/components/SensorCard";
import { StatusBanner } from "@/components/StatusBanner";
import { ChatPanel } from "@/components/ChatPanel";
import { Simulator } from "@/components/Simulator";

type Reading = {
  id: string;
  ph: number;
  tds: number;
  turbidity: number;
  temperature: number;
  status: "SAFE" | "NOT SAFE";
  created_at: string;
};

const Index = () => {
  const [reading, setReading] = useState<Reading | null>(null);

  const fetchLatest = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("latest");
    if (error) {
      console.error(error);
      return;
    }
    if (data?.reading) setReading(data.reading as Reading);
  }, []);

  useEffect(() => {
    fetchLatest();
    const id = window.setInterval(fetchLatest, 3000);
    return () => window.clearInterval(id);
  }, [fetchLatest]);

  const phOut = reading ? reading.ph < 6.5 || reading.ph > 8.5 : false;
  const tdsOut = reading ? reading.tds > 1000 : false;
  const turbOut = reading ? reading.turbidity > 25 : false;

  return (
    <main className="min-h-screen bg-gradient-hero text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Droplets className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">HydroSentinel</h1>
              <p className="text-sm text-muted-foreground">Real-time water quality monitoring</p>
            </div>
          </div>
          <Simulator onPosted={fetchLatest} />
        </header>

        {/* Status */}
        <StatusBanner status={reading?.status} updatedAt={reading?.created_at} />

        {/* Grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
            <SensorCard
              label="pH"
              value={reading?.ph}
              unit=""
              icon="ph"
              safeRange="6.5 – 8.5"
              alert={phOut}
            />
            <SensorCard
              label="TDS"
              value={reading?.tds}
              unit="ppm"
              icon="tds"
              safeRange="≤ 1000 ppm"
              alert={tdsOut}
            />
            <SensorCard
              label="Turbidity"
              value={reading?.turbidity}
              unit="NTU"
              icon="turbidity"
              safeRange="≤ 25 NTU"
              alert={turbOut}
            />
            <SensorCard
              label="Temperature"
              value={reading?.temperature}
              unit="°C"
              icon="temperature"
              safeRange="ambient"
            />
          </section>

          <aside className="h-[560px] lg:h-auto">
            <ChatPanel />
          </aside>
        </div>

        <footer className="mt-10 rounded-2xl border border-border bg-card/60 p-5 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">For your IoT device (ESP32)</p>
          <p className="mt-1">
            POST JSON <code className="rounded bg-secondary px-1.5 py-0.5">{`{ ph, tds, turbidity, temperature, status? }`}</code> to the{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5">data</code> edge function. The dashboard refreshes every 3s.
          </p>
        </footer>
      </div>
    </main>
  );
};

export default Index;
