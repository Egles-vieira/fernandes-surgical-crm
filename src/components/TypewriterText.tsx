import { useState, useEffect } from "react";

interface TypewriterTextProps {
  texts: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  className?: string;
}

export function TypewriterText({
  texts,
  typingSpeed = 100,
  deletingSpeed = 50,
  pauseDuration = 2000,
  className = "",
}: TypewriterTextProps) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const targetText = texts[currentTextIndex];

    if (isPaused) {
      const pauseTimeout = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, pauseDuration);
      return () => clearTimeout(pauseTimeout);
    }

    if (!isDeleting && currentText === targetText) {
      setIsPaused(true);
      return;
    }

    if (isDeleting && currentText === "") {
      setIsDeleting(false);
      setCurrentTextIndex((prev) => (prev + 1) % texts.length);
      return;
    }

    const timeout = setTimeout(
      () => {
        setCurrentText((prev) =>
          isDeleting
            ? targetText.substring(0, prev.length - 1)
            : targetText.substring(0, prev.length + 1)
        );
      },
      isDeleting ? deletingSpeed : typingSpeed
    );

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, isPaused, currentTextIndex, texts, typingSpeed, deletingSpeed, pauseDuration]);

  return (
    <span className={className}>
      {currentText}
      <span className="animate-pulse">|</span>
    </span>
  );
}
