import { useCallback, useEffect, useRef, useState } from "react";
import { Droplets } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SensorCard } from "@/components/SensorCard";
import { StatusBanner } from "@/components/StatusBanner";
import { ChatPanel } from "@/components/ChatPanel";
import { Simulator } from "@/components/Simulator";




const WATER_QUOTES = [
  "Water is life 💧",
  "Clean water, healthy future 🌍",
  "Every drop matters 💙",
  "Safe water = Safe life",
  "Protect water, protect tomorrow",
  "Pure water is priceless",
];


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
  const [history, setHistory] = useState<Reading[]>([]);

  const [quote, setQuote] = useState(WATER_QUOTES[0]);

  const getUsage = () => {
      if (!reading) return null;

      if (reading.status === "SAFE") {
        return "✅ Safe for drinking, washing, and farming";
      }

      if (reading.tds > 1000) {
        return "❌ Not safe for drinking. Use only for cleaning";
      }

      if (reading.turbidity > 25) {
        return "❌ Dirty water. Filter before use";
      }
      
      return "⚠️ Limited use. Treat before drinking";
    };

    

  useEffect(() => {
  if (!reading) return;

  if (reading.status === "NOT SAFE") {
    setQuote("⚠️ Water is unsafe. Avoid drinking!");
  } 
  else if (reading.turbidity > 25) {
    setQuote("💧 Water is too cloudy. Filtration needed.");
  } 
  else if (reading.tds > 1000) {
    setQuote("🧂 High TDS detected. Not ideal for drinking.");
  } 
  else if (reading.ph < 6.5 || reading.ph > 8.5) {
    setQuote("⚗️ pH imbalance detected. Check water source.");
  } 
  else {
    setQuote("✅ Water looks safe and healthy!");
  }
}, [reading]);




  const fetchLatest = useCallback(async () => {



    const { data, error } = await supabase.functions.invoke("latest");

    if (error) {
      console.error(error);
      return;
    }

    if (data?.reading) {
    setReading(data.reading as Reading);

    setHistory((prev) => {
      const updated = [...prev, data.reading];
      return updated.slice(-5);
    });
  }
}, []);

  const alertPlayedRef = useRef(false);


  useEffect(() => {


    const getPrediction = () => {
    if (history.length < 2) return null;

    const last = history[history.length - 1];
    const prev = history[history.length - 2];

    if (last.turbidity > prev.turbidity && last.turbidity > 20) {
      return "⚠️ Water may become unsafe soon (turbidity rising)";
    }

    if (last.tds > prev.tds && last.tds > 900) {
      return "⚠️ TDS increasing. Water may become unsafe";
    }
    return null;
  };

    const getUsage = () => {
      if (!reading) return null;

      if (reading.status === "SAFE") {
        return "✅ Safe for drinking, washing, and farming";
      }

      if (reading.tds > 1000) {
        return "❌ Not safe for drinking. Use only for cleaning";
      }

      if (reading.turbidity > 25) {
        return "❌ Dirty water. Filter before use";
      }
      
      return "⚠️ Limited use. Treat before drinking";
    };


    fetchLatest();
    const id = window.setInterval(fetchLatest, 3000);
    return () => window.clearInterval(id);
  }, [fetchLatest]);

  
  useEffect(() => {
    if (!reading) return;

    if (reading.status === "SAFE") {
      alertPlayedRef.current = false;
      return;
    }

    if (!alertPlayedRef.current) {
      const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
      audio.play().catch(console.error);
      alertPlayedRef.current = true;
    }
  }, [reading]);


  const phOut = reading ? reading.ph < 6.5 || reading.ph > 8.5 : false;
  const tdsOut = reading ? reading.tds > 1000 : false;
  const turbOut = reading ? reading.turbidity > 25 : false;

  const getPrediction = () => {
  if (history.length < 2) return null;

  const last = history[history.length - 1];
  const prev = history[history.length - 2];

  // turbidity increasing
  if (last.turbidity > prev.turbidity && last.turbidity > 20) {
    return "⚠️ Water may become unsafe soon (getting dirty)";
  }
  console.log("history:", history);

  // TDS increasing
  if (last.tds > prev.tds && last.tds > 900) {
    return "⚠️ TDS is increasing. Water may become unsafe";
  }

  return null;
};




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

        {/* {getPrediction() && (
  <div className="mt-4 rounded-xl bg-yellow-500/20 border border-yellow-500 p-3 text-yellow-300">
    🔮 {getPrediction()}
  </div>
)} */}

        {getUsage() && (
  <div className="mt-4 rounded-xl bg-yellow-500/20 border border-yellow-500 p-4 text-yellow-300 font-semibold">
    💡 {getUsage()}
  </div>
)}



        {getPrediction() && (
  <div className="mt-4 rounded-xl bg-yellow-500/20 border border-yellow-500 p-4 text-yellow-300 font-semibold">
    <p className="text-yellow-400 text-sm font-medium">
      🔮 Prediction: {getPrediction()}
    </p>
  </div>
)}

        
        {reading?.status === "NOT SAFE" && (
  <div className="mt-4 rounded-xl bg-red-500/20 border border-red-500 p-4 text-red-300 font-semibold animate-pulse">
    🚨 Warning: Water is NOT SAFE! Do not drink. Use filtration or boiling.
  </div>
)}



        {reading && (reading.ph < 6.5 || reading.ph > 8.5 || reading.tds > 1000 || reading.turbidity > 25) && (
  <div className="mt-2 text-sm text-red-400">
    Reason:
    {reading.ph < 6.5 || reading.ph > 8.5 ? " pH issue," : ""}
    {reading.tds > 1000 ? " high TDS," : ""}
    {reading.turbidity > 25 ? " dirty water," : ""}
  </div>
)}


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
          <div className="mt-1">
            <p className="text-xl font-semibold tracking-wide text-primary">💧 {quote}</p>
          </div>
        </footer>
      </div>
    </main>
  );
};

export default Index;
