import { motion } from "framer-motion";

const t = (key: string) => {
  const translations = new Map<string, string>([
    ["choose_level", "Choose Your Corporate Level"]
  ]);
  return translations.get(key) || key;
};

export function VerticalCutReveal() {
  return (
    <div className="overflow-hidden py-2">
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.8 }}
        className="text-lg font-medium bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent"
      >
        {t("choose_level")}
      </motion.div>
    </div>
  );
}
