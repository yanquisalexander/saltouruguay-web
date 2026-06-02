interface ProgressDotsProps {
  total: number;
  current: number;
  activeClass?: string;
  pastClass?: string;
  futureClass?: string;
}

export const ProgressDots = ({
  total,
  current,
  activeClass = "bg-lime-500",
  pastClass = "bg-neutral-600",
  futureClass = "bg-neutral-800",
}: ProgressDotsProps) => {
  if (total <= 1) return null;

  return (
    <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-1.5 z-10">
      {Array.from({ length: total }, (_, idx) => (
        <div
          key={idx}
          className={`h-0.5 rounded-full transition-all duration-500 ${
            idx === current
              ? `w-6 ${activeClass}`
              : idx < current
                ? `w-2 ${pastClass}`
                : `w-2 ${futureClass}`
          }`}
        />
      ))}
    </div>
  );
};
