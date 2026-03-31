"use client";

import { useEffect, useState } from "react";

export default function LiveDuration({ start }: { start: Date }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(Math.floor((Date.now() - new Date(start).getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [start]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <span>
      {mins}m {secs}s
    </span>
  );
}
