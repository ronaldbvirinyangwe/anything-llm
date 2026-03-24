import useCurriculum from "@/hooks/useCurriculum";

const CURRICULA = ["ZIMSEC", "Cambridge"];

export default function CurriculumSwitcher() {
  const { curriculum, setCurriculum } = useCurriculum();

  return (
    <div className="flex flex-col gap-y-2">
      <h1 className="text-theme-home-text uppercase text-sm font-semibold">
        Active Curriculum
      </h1>
      <div className="flex items-center gap-x-2">
        {CURRICULA.map((c) => (
          <button
            key={c}
            onClick={() => setCurriculum(c)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 border
              ${
                curriculum === c
                  ? "bg-theme-sidebar-item-selected text-white border-transparent"
                  : "bg-transparent text-theme-home-text border-theme-sidebar-border hover:bg-theme-home-button-secondary-hover hover:text-theme-home-button-secondary-hover-text"
              }`}
          >
            {c}
          </button>
        ))}
        {!curriculum && (
          <span className="text-xs text-theme-text-secondary ml-2">
            Select your curriculum to personalise your experience
          </span>
        )}
      </div>
    </div>
  );
}
