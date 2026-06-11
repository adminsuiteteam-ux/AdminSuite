import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, children, id, style, onClick }: CardProps) {
  return (
    <div
      id={id}
      style={style}
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl text-white shadow-2xl transition-all duration-300 hover:border-white/20",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, id, style, onClick }: CardProps) {
  return (
    <div
      id={id}
      style={style}
      onClick={onClick}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
    >
      {children}
    </div>
  );
}

export function CardContent({ className, children, id, style, onClick }: CardProps) {
  return (
    <div
      id={id}
      style={style}
      onClick={onClick}
      className={cn("p-6 pt-0", className)}
    >
      {children}
    </div>
  );
}

