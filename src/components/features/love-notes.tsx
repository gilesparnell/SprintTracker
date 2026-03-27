"use client";

import { useState, useEffect } from "react";
import { HeartIcon } from "lucide-react";

const reasons = [
  "you make every morning feel like a gift worth unwrapping",
  "your laugh is the best sound in any room",
  "you believe in me even when I forget to believe in myself",
  "you turn ordinary days into adventures",
  "your hugs feel like coming home",
  "you know exactly when I need a cup of tea without me asking",
  "you make me want to be a better person every single day",
  "your smile could light up the darkest room",
  "you never give up on the people you love",
  "you see the beauty in things I walk straight past",
  "your kindness is effortless and endless",
  "you make even grocery shopping feel like a date",
  "you always know the right thing to say",
  "your courage inspires me more than you know",
  "you dance like nobody's watching, and it's magnificent",
  "you remember the little things that matter most",
  "your heart is the biggest I've ever known",
  "you make our house feel like a home",
  "you fight for what you believe in, always",
  "your eyes tell a story I never get tired of reading",
  "you love fiercely and without conditions",
  "you make me laugh until my stomach hurts",
  "you're the first person I want to tell good news to",
  "your patience with me is a miracle in itself",
  "you smell like sunshine and everything good",
  "you make the hard days bearable just by being there",
  "your voice is my favourite sound in the world",
  "you never let me take myself too seriously",
  "you hold my hand like you mean it, every time",
  "your passion for life is absolutely contagious",
  "you make me feel safe in a world that isn't always kind",
  "you choose us, every single day, and that's everything",
  "your strength takes my breath away",
  "you know how to make a bad day disappear",
  "your cooking fills the house with love, not just food",
  "you challenge me to grow without making me feel small",
  "your freckles are my favourite constellation",
  "you love our family with everything you have",
  "you're braver than you give yourself credit for",
  "your texts in the middle of the day make my heart skip",
  "you forgive with grace I don't always deserve",
  "your determination is honestly unstoppable",
  "you make silence comfortable, not awkward",
  "your taste in music has made my life so much richer",
  "you know my coffee order, my fears, and my dreams",
  "you still give me butterflies after all this time",
  "your compassion for others moves me deeply",
  "you make long drives feel like no time at all",
  "your creativity sees possibility everywhere",
  "you've taught me what real partnership looks like",
  "your morning hair is genuinely adorable",
  "you celebrate my wins like they're your own",
  "your honesty keeps me grounded",
  "you make even the waiting worthwhile",
  "your intelligence is incredibly attractive",
  "you never make me feel judged for who I am",
  "your energy fills every room you walk into",
  "you defend the people you love without hesitation",
  "your sense of humour is perfectly weird and I adore it",
  "you make Sundays feel sacred",
  "your ambition pushes us both forward",
  "you notice when I'm struggling before I say a word",
  "your warmth makes strangers feel like friends",
  "you've never stopped choosing to love me",
  "your stubbornness is secretly one of my favourite things",
  "you make the best playlists for road trips",
  "your faith in the future gives me hope",
  "you smell incredible even after a long day",
  "your tenderness with children melts my heart",
  "you turn a house into a haven",
  "your spontaneity keeps life exciting",
  "you taught me that vulnerability is strength",
  "your sense of justice makes the world better",
  "you share your chips even when you don't want to",
  "your footsteps in the hallway are my favourite sound at night",
  "you make me feel seen, truly seen",
  "your resilience after tough days amazes me",
  "you always pick the best movies",
  "your neck smells like belonging",
  "you write the sweetest messages in birthday cards",
  "your curiosity about the world is infectious",
  "you love our animals like they're our children",
  "your sleepy voice in the morning is perfection",
  "you make holidays feel magical",
  "your loyalty is unwavering and I treasure it",
  "you understand my silences as well as my words",
  "your gentle hands can fix anything",
  "you never let distance dim what we have",
  "your freckles multiply in the sun and I love watching it happen",
  "you sing in the car like it's a stadium concert",
  "your work ethic is honestly inspiring",
  "you make even airport delays fun somehow",
  "your eyes crinkle when you really laugh and it wrecks me",
  "you fight fair even when you're furious",
  "your shoulder is the safest place I know",
  "you taught me that love isn't a feeling, it's a choice you make daily",
  "you carry our worries so I don't have to carry them alone",
  "your lipstick marks on coffee cups make me smile",
  "you are the plot twist I never saw coming and the ending I always wanted",
  "you're my favourite person in any room, any city, any lifetime",
];

export function LoveNotes() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % reasons.length);
        setFade(true);
      }, 400);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-1.5 mb-2">
        <HeartIcon className="w-3 h-3 text-pink-500 fill-pink-500" />
        <span className="text-[10px] font-semibold text-pink-500/70 uppercase tracking-wider">
          For Vonnies
        </span>
      </div>
      <p
        className={`text-[11px] leading-relaxed text-pink-300/60 italic transition-opacity duration-400 ${
          fade ? "opacity-100" : "opacity-0"
        }`}
      >
        &ldquo;Vonnies, I love you because {reasons[index]}.&rdquo;
      </p>
    </div>
  );
}
