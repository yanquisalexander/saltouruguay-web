// Wheel segment values (inspired by classic Wheel of Fortune)
export const WHEEL_SEGMENTS = [
    { value: 100, label: "100", type: "coins" },
    { value: 200, label: "200", type: "coins" },
    { value: 300, label: "300", type: "coins" },
    { value: 500, label: "500", type: "coins" },
    { value: 750, label: "750", type: "coins" },
    { value: 1000, label: "1000", type: "coins" },
    { value: 0, label: "Pierde Turno", type: "lose_turn" },
    { value: 0, label: "Bancarrota", type: "bankrupt" },
] as const;

export type WheelSegment = typeof WHEEL_SEGMENTS[number];