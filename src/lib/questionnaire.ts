export const inviteQuestionnaire = [
  { key: "itemsCarried", label: "Items carried (brief)", required: true, type: "text" as const },
  { key: "hasLaptop", label: "Carrying a laptop?", required: true, type: "select" as const, options: ["Yes","No"] },
  { key: "meetingType", label: "Meeting type", required: true, type: "select" as const, options: ["Admin","Professor","Staff","Student","Other"] },
  { key: "officeRoom", label: "Office / Room", required: true, type: "text" as const },
  { key: "notes", label: "Notes for security (optional)", required: false, type: "text" as const },
];