"use client";

import { motion } from "framer-motion";
import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { easeOut } from "@/lib/motion";

interface HeroAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface HeroCardProps {
  kicker: string;
  kickerIcon?: LucideIcon;
  title: string;
  lede: string;
  primary?: HeroAction;
  secondary?: HeroAction;
}

export function HeroCard({
  kicker,
  kickerIcon: KickerIcon,
  title,
  lede,
  primary,
  secondary,
}: HeroCardProps) {
  return (
    <motion.section
      className="panel hero-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOut }}
    >
      <p className="badge-pill">
        {KickerIcon ? <KickerIcon size={13} /> : null}
        {kicker}
      </p>
      <h2 className="hero-title">{title}</h2>
      <p className="lede hero-lede">{lede}</p>
      {primary || secondary ? (
        <div className="hero-actions">
          {primary ? (
            primary.href ? (
              <Link href={primary.href} className="cta">
                {primary.label}
                <ArrowRight size={16} />
              </Link>
            ) : (
              <button type="button" className="cta" onClick={primary.onClick}>
                {primary.label}
                <ArrowRight size={16} />
              </button>
            )
          ) : null}
          {secondary ? (
            secondary.href ? (
              <Link href={secondary.href} className="ghost">
                {secondary.label}
              </Link>
            ) : (
              <button type="button" className="ghost" onClick={secondary.onClick}>
                {secondary.label}
              </button>
            )
          ) : null}
        </div>
      ) : null}
    </motion.section>
  );
}
