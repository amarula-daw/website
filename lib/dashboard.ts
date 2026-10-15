export const dashboardSections = [
  "overview",
  "subscription",
  "library",
  "seller",
  "profile",
] as const
export type DashboardSection = (typeof dashboardSections)[number]
export function dashboardSection(value: unknown): DashboardSection {
  return dashboardSections.find((section) => section === value) ?? "overview"
}
