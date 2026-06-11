// pricing-section-4.tsx – UI component for the pricing section
// This file follows the shadcn UI structure (placed under components/ui)

"use client";
import { Card, CardContent, CardHeader } from "./card";
import { Sparkles as SparklesComp } from "./sparkles";
import { TimelineContent } from "./timeline-animation";
import { VerticalCutReveal } from "./vertical-cut-reveal";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";

const t = (key: string) => {
  const translations = new Map<string, string>([
    ["pricing_section_title", "Pricing Section 4"]
  ]);
  return translations.get(key) || key;
};

export default function PricingSection4() {
  return (
    <Card className={cn("p-6")}>
      <CardHeader>{t("pricing_section_title")}</CardHeader>
      <CardContent>
        {/* Replace with actual UI */}
        <div className="flex items-center space-x-2">
          <SparklesComp />
          <NumberFlow value={99} />
        </div>
        <TimelineContent />
        <VerticalCutReveal />
      </CardContent>
    </Card>
  );
}
