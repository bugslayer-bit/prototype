import { MasterDataGroup } from "../masterData";

export const personGroups: MasterDataGroup[] = [
  {
    id: "salutation",
    title: "Salutation",
    description: "LoV 1.9",
    values: ["Dasho", "Mr.", "Mrs.", "Ms."]
  },
  {
    id: "gender",
    title: "Gender",
    description: "LoV 1.10",
    values: ["Male", "Female", "Others"]
  },
  {
    id: "nationality",
    title: "Nationality / Country",
    description: "LoV 1.11 — Country of origin (Bhutan = Bhutanese, Others = Non-Bhutanese)",
    values: ["Bhutan", "Afghanistan", "Australia", "Bangladesh", "Brazil", "Cambodia", "Canada", "China", "Denmark", "Egypt", "Finland", "France", "Germany", "India", "Indonesia", "Italy", "Japan", "Kenya", "Laos", "Malaysia", "Maldives", "Mexico", "Mongolia", "Myanmar", "Nepal", "Netherlands", "New Zealand", "Nigeria", "Norway", "Pakistan", "Philippines", "Russia", "Saudi Arabia", "Singapore", "South Korea", "Spain", "Sri Lanka", "Sweden", "Switzerland", "Taiwan", "Thailand", "Turkey", "United Arab Emirates", "United Kingdom", "United States", "Vietnam"]
  },
  {
    id: "nationality-status",
    title: "Nationality Status",
    description: "Bhutanese vs International — used across modules (social benefits, contractors, etc.)",
    values: ["Bhutanese", "International"]
  },
  {
    id: "sb-age-group",
    title: "Social Benefits — Age Group",
    description: "DD 25.7 + LoVs 12.5 — beneficiary age brackets",
    values: ["1-15", "16-25", "26-35", "36-45", "46-55", "56-64", "65-100"]
  },
  {
    id: "sb-student-category",
    title: "Stipend — Student Category",
    description: "DD 28.4 + LoVs 14.1 — student level",
    values: [
      "Pre-primary",
      "Secondary",
      "Post-Secondary",
      "Non-tertiary",
      "Tertiary",
      "Monastic Studies"
    ]
  }
];
