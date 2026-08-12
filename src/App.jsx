import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import LivingBackground from "./components/shared/LivingBackground.jsx";
import Hero from "./components/landing/Hero.jsx";
import BuilderStudio from "./components/builder/BuilderStudio.jsx";
import Reveal from "./components/builder/Reveal.jsx";
import AlreadyClaimed from "./components/builder/AlreadyClaimed.jsx";
import { loadBuilderRecord, clearBuilderRecord } from "./utils/persistence.js";
import { shareBuilderCard, buildCaption } from "./utils/shareCard.js";

function dataUrlToBlob(dataUrl) {
  const [meta, base64] = dataUrl.split(",");
  const mime = meta.match(/:(.*?);/)[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// landing -> studio (upload + name + live preview, single CTA) -> reveal
// or straight to "claimed" if this browser already generated an ID.
export default function App() {
  const [screen, setScreen] = useState("checking");
  const [builder, setBuilder] = useState(null);
  const [claimed, setClaimed] = useState(null);

  useEffect(() => {
    const existing = loadBuilderRecord();
    if (existing) {
      setClaimed(existing);
      setScreen("claimed");
    } else {
      setScreen("landing");
    }
  }, []);

  const restart = () => {
    setScreen("landing");
    setBuilder(null);
  };

  const handleRegenerate = () => {
    clearBuilderRecord();
    setClaimed(null);
    restart();
  };

  const handleClaimedDownload = () => {
    if (!claimed) return;
    const blob = dataUrlToBlob(claimed.imageDataUrl);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hhgoa-2026-builder-id-${claimed.name.toLowerCase().replace(/\s+/g, "-")}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const handleClaimedShare = async () => {
    if (!claimed) return;
    const blob = dataUrlToBlob(claimed.imageDataUrl);
    const filename = `hhgoa-2026-builder-id-${claimed.name.toLowerCase().replace(/\s+/g, "-")}.png`;
    // Reuse the /s/{id} link saved at generation time, when it made it in —
    // otherwise buildCaption omits the link line entirely rather than
    // substituting a generic URL that wouldn't represent this card.
    const caption = buildCaption({
      builderNumber: claimed.builderNumber,
      title: claimed.title,
      rarity: claimed.rarity,
      ...(claimed.shareUrl ? { link: claimed.shareUrl } : {}),
    });
    return shareBuilderCard({ blob, filename, caption });
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden">
      <LivingBackground />

      <AnimatePresence mode="wait">
        {screen === "claimed" && claimed && (
          <AlreadyClaimed
            key="claimed"
            record={claimed}
            onDownload={handleClaimedDownload}
            onShare={handleClaimedShare}
            onRegenerate={handleRegenerate}
          />
        )}

        {screen === "landing" && <Hero key="landing" onStart={() => setScreen("studio")} />}

        {screen === "studio" && (
          <BuilderStudio
            key="studio"
            onBack={() => setScreen("landing")}
            onGenerate={(data) => {
              setBuilder(data);
              setScreen("reveal");
            }}
          />
        )}

        {screen === "reveal" && builder && <Reveal key="reveal" builder={builder} onRestart={restart} />}
      </AnimatePresence>
    </div>
  );
}
