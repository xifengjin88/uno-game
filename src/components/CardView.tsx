type Card = {
  color: "red" | "blue" | "green" | "yellow" | "wild";
  value: string;
};

type Props = {
  card: Card;
  onClick?: () => void;
  selected?: boolean;
  small?: boolean;
  faceDown?: boolean;
};

const BG: Record<string, string> = {
  red: "#E24B4A",
  blue: "#185FA5",
  green: "#3B6D11",
  yellow: "#BA7517",
  wild: "#26215C",
};

const LABEL: Record<string, string> = {
  skip: "⊘",
  reverse: "⇄",
  "+2": "+2",
  "+4": "+4",
  wild: "W",
};

export default function CardView({ card, onClick, selected, small, faceDown }: Props) {
  const size = small
    ? { width: 36, height: 52, fontSize: 13, radius: 5 }
    : { width: 52, height: 74, fontSize: 18, radius: 7 };

  if (faceDown) {
    return (
      <div style={{
        width: size.width, height: size.height,
        borderRadius: size.radius,
        background: "#D85A30",
        border: "2px solid rgba(255,255,255,0.3)",
        cursor: onClick ? "pointer" : "default",
        flexShrink: 0,
      }} onClick={onClick} />
    );
  }

  const label = LABEL[card.value] ?? card.value;

  return (
    <div
      onClick={onClick}
      style={{
        width: size.width,
        height: size.height,
        borderRadius: size.radius,
        background: BG[card.color] ?? "#26215C",
        border: selected
          ? "2px solid #FAC775"
          : "2px solid rgba(255,255,255,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: size.fontSize,
        fontWeight: 500,
        cursor: onClick ? "pointer" : "default",
        flexShrink: 0,
        transform: selected ? "translateY(-8px)" : "none",
        transition: "transform 0.15s ease",
        userSelect: "none",
      }}
    >
      {label}
    </div>
  );
}
