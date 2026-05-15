/**
 * TypewriterCycle — cycles through words with a natural typing/erasing effect.
 */
import { useEffect, useState } from "react";

interface Props {
  words: string[];
  typingSpeed?: number;
  erasingSpeed?: number;
  holdDuration?: number;
  className?: string;
}

export default function TypewriterCycle({
  words,
  typingSpeed = 90,
  erasingSpeed = 50,
  holdDuration = 1600,
  className,
}: Props) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"typing" | "holding" | "erasing">("typing");

  useEffect(() => {
    const current = words[index % words.length];
    let timeout: ReturnType<typeof setTimeout>;

    if (phase === "typing") {
      if (text.length < current.length) {
        timeout = setTimeout(() => setText(current.slice(0, text.length + 1)), typingSpeed);
      } else {
        timeout = setTimeout(() => setPhase("erasing"), holdDuration);
      }
    } else if (phase === "erasing") {
      if (text.length > 0) {
        timeout = setTimeout(() => setText(current.slice(0, text.length - 1)), erasingSpeed);
      } else {
        setIndex((i) => (i + 1) % words.length);
        setPhase("typing");
      }
    }

    return () => clearTimeout(timeout);
  }, [text, phase, index, words, typingSpeed, erasingSpeed, holdDuration]);

  return (
    <span className={className}>
      {text}
      <span
        aria-hidden
        className="inline-block w-[0.08em] ml-[0.04em] align-baseline animate-pulse"
        style={{
          height: "0.9em",
          background: "currentColor",
          transform: "translateY(0.08em)",
        }}
      />
    </span>
  );
}
