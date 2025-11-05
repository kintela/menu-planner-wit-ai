import { redirect } from "next/navigation"

function getCurrentWeekStartIso() {
  const today = new Date()
  const monday = new Date(today)
  const day = monday.getDay()
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split("T")[0]
}

export default function WeeklyMenuRedirectPage() {
  const currentWeekStart = getCurrentWeekStartIso()
  redirect(`/weekly-menu/${currentWeekStart}`)
}
