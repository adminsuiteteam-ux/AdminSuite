

const t = (key: string) => {
  const translations = new Map<string, string>([
    ["starter_plan_title", "Starter Plan Activated"],
    ["starter_plan_desc", "Access to core metrics and standard dashboards."],
    ["pro_plan_title", "Pro Plan Scale"],
    ["pro_plan_desc", "Unlock advanced biometrics and real-time team logs."]
  ]);
  return translations.get(key) || key;
};

export function TimelineContent() {
  return (
    <div className="relative border-l border-white/20 pl-6 ml-3 my-6 space-y-6">
      <div className="relative">
        <span className="absolute -left-[31px] top-1 flex h-4 w-4 rounded-full border border-blue-500 bg-black" />
        <h4 className="text-sm font-semibold text-white">{t("starter_plan_title")}</h4>
        <p className="text-xs text-neutral-400 mt-1">{t("starter_plan_desc")}</p>
      </div>
      <div className="relative">
        <span className="absolute -left-[31px] top-1 flex h-4 w-4 rounded-full border border-indigo-500 bg-black" />
        <h4 className="text-sm font-semibold text-white">{t("pro_plan_title")}</h4>
        <p className="text-xs text-neutral-400 mt-1">{t("pro_plan_desc")}</p>
      </div>
    </div>
  );
}
