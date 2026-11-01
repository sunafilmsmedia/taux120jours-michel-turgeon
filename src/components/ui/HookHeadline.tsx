"use client";

import { useEffect, useState } from "react";

const SWITCH_MS = 5000;
const RED = "#D2483C";
const GREEN = "#1F8A5C";

export default function HookHeadline() {
  // true = "fixe" est rouge et "variable" est vert ; false = l'inverse.
  const [fixeIsRed, setFixeIsRed] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setFixeIsRed((v) => !v), SWITCH_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <h1 className="mt-6 font-serif text-4xl font-bold leading-[1.1] text-ink sm:text-5xl">
      Taux{" "}
      <span className="italic transition-colors duration-700" style={{ color: fixeIsRed ? RED : GREEN }}>
        fixe
      </span>{" "}
      ou{" "}
      <span className="italic transition-colors duration-700" style={{ color: fixeIsRed ? GREEN : RED }}>
        variable
      </span>{" "}
      : lequel choisir?
    </h1>
  );
}
