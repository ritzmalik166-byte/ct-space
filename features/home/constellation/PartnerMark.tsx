"use client";

import Image from "next/image";
import { useState } from "react";
import type { Partner } from "./data";

export function PartnerMark({ partner }: { partner: Partner }) {
  const [missing, setMissing] = useState(false);
  if (partner.logo && !missing) {
    return (
      <span className="grid h-10 place-items-center rounded-lg bg-white px-3 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.6)] lg:h-12 lg:px-4">
        <Image
          src={partner.logo.src}
          width={partner.logo.width}
          height={partner.logo.height}
          alt={partner.name}
          onError={() => setMissing(true)}
          className="h-6 w-auto lg:h-7"
        />
      </span>
    );
  }
  return (
    <span
      className="rounded-md bg-[#0d0a1a]/90 px-3 py-1.5 font-heading text-sm font-extrabold tracking-[0.12em] ring-1 ring-white/10"
      style={{ color: partner.tone }}
    >
      {partner.mark}
    </span>
  );
}
