import { AnimatePresence, motion } from "motion/react";

export default function FloatingBattleText({ event, target }) {
  const show = event && event.target === target && event.amount != null;
  const isHeal = event?.type === "heal";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={event.id}
          className={`float-text ${isHeal ? "float-heal" : "float-damage"}`}
          initial={{ opacity: 1, y: 0, x: "-50%", scale: 1.3 }}
          animate={{ opacity: 0, y: -44, x: "-50%", scale: 0.85 }}
          transition={{ duration: 0.72, ease: "easeOut" }}
        >
          {isHeal ? `+${event.amount}` : `-${event.amount}`}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
