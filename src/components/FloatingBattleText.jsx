export default function FloatingBattleText({ event, target }) {
  if (!event || event.target !== target || event.amount == null) return null;
  const isHeal = event.type === "heal";
  return (
    <div className={`float-text ${isHeal ? "float-heal" : "float-damage"}`}>
      {isHeal ? `+${event.amount}` : `-${event.amount}`}
    </div>
  );
}
