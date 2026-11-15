import { redirect } from "next/navigation"
import { mondayIsoFor } from "@/lib/weekly-menu/weekly-menu-domain"

export default function WeeklyMenuRedirectPage() {
  const currentWeekStart = mondayIsoFor(new Date())
  redirect(`/weekly-menu/${currentWeekStart}`)
}
