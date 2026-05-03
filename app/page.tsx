"use client";

import Image from "next/image";
import { GlitchTitle } from "@/components/ui/GlitchTitle";
import { Plasma } from "@/components/ui/Plasma";
import { ReelPanel } from "@/components/ui/ReelPanel";

export default function Home(): React.ReactElement {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Plasma Background */}
      <div className="fixed inset-0 z-0">
        <Plasma
          color="#7c3aed"
          speed={0.6}
          direction="forward"
          scale={1.1}
          opacity={0.8}
          mouseInteractive={true}
        />
      </div>

      {/* Vitruvian man centered behind title */}
      <div className="absolute -top-10 z-10 pointer-events-none flex justify-center w-full">
        <div className="relative">
          {/* Hard purple radial glow behind */}
          <div
            className="absolute inset-0 rounded-full scale-75"
            style={{
              background: "radial-gradient(ellipse at center, rgba(139, 92, 246, 0.6) 0%, rgba(109, 40, 217, 0.3) 40%, transparent 70%)",
              filter: "blur(20px)",
              transform: "scale(1.2)",
            }}
          />
          {/* Glow layer — blurred duplicate */}
          <Image
            src="/pallette/vitruvian.png"
            alt=""
            width={400}
            height={400}
            aria-hidden={true}
            className="absolute inset-0 w-[320px] h-[320px] object-contain opacity-80 blur-lg scale-105"
            style={{ filter: "brightness(4) saturate(5) hue-rotate(270deg) sepia(1)" }}
          />
          {/* Main vitruvian */}
          <Image
            src="/pallette/vitruvian.png"
            alt="vitruvian man"
            width={400}
            height={400}
            priority={true}
            className="relative w-[320px] h-[320px] object-contain opacity-60"
            style={{ filter: "brightness(2.5) contrast(0.6) saturate(0.4) sepia(0.6) hue-rotate(270deg)" }}
          />
        </div>
      </div>

      {/* Large proportion image on the left, overlapping the reel */}
      <div className="absolute left-0 top-1/2 -translate-y-[37%] pointer-events-none" style={{ zIndex: 30 }}>
        <Image
          src="/pallette/large-proportion.png"
          alt="large proportion figure"
          width={700}
          height={1000}
          priority={true}
          className="w-[550px] h-auto object-contain opacity-60 -translate-x-[8%]"
          style={{
            filter: "brightness(2.2) contrast(0.7) saturate(0.2) sepia(0.5) hue-rotate(240deg) drop-shadow(0 0 24px rgba(139, 92, 246, 0.7)) drop-shadow(0 0 50px rgba(59, 130, 246, 0.4))",
          }}
        />
      </div>

      {/* Large proportion 2 image on the right, overlapping the reel - blue glow */}
      <div className="absolute right-0 top-1/2 -translate-y-[50%] pointer-events-none" style={{ zIndex: 30 }}>
        <Image
          src="/pallette/large-proportion2.png"
          alt="large proportion figure right"
          width={700}
          height={1000}
          priority={true}
          className="w-[750px] h-auto object-contain opacity-60 translate-x-[15%]"
          style={{
            filter: "brightness(2.2) contrast(0.7) saturate(0.2) sepia(0.5) hue-rotate(200deg) drop-shadow(0 0 24px rgba(59, 130, 246, 0.7)) drop-shadow(0 0 50px rgba(139, 92, 246, 0.4))",
          }}
        />
      </div>

      {/* Title with Glitch effect */}
      <div className="absolute top-10 z-20 w-full flex justify-center">
        <GlitchTitle
          text="NEW NEWS"
          initialGlitchInterval={5000}
          finalGlitchInterval={5000}
          transitionDuration={15}
        />
      </div>

      {/* Curved Panel beneath title */}
      <div className="relative z-20 flex items-center justify-center mt-24">
        <ReelPanel />
      </div>

      {/* Credit text */}
      <p
        className="relative z-20 mt-6 text-white text-lg"
        style={{
          fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
          fontWeight: 300,
          letterSpacing: "0.1em",
        }}
      >
        mohamed x torriani
      </p>
    </main>
  );
}
