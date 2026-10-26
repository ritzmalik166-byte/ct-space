"use client";

import Image from "next/image";
import { useState } from "react";
import type { Partner } from "./data";

export function PartnerMark({ partner }: { partner: Partner }) {
  const [missing, setMissing] = useState(false);
  if (partner.logo && !missing) {
    return (
      <span className="grid size-11 place-items-center rounded-full bg-white shadow-[0_8px_24px_-8px_rgb(0_0_0/0.6)] ring-1 ring-white/20 lg:size-14">
        <Image
          src={partner.logo.src}
          width={partner.logo.width}
          height={partner.logo.height}
          alt={partner.name}
          sizes="56px"
          onError={() => setMissing(true)}
          className="size-6 object-contain lg:size-8"
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
