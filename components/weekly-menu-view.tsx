import type React from "react"

interface WeeklyMenuViewProps {
  startDate: Date
  menuItems: {
    date: Date
    dish: string
  }[]
}

const WeeklyMenuView: React.FC<WeeklyMenuViewProps> = ({ startDate, menuItems }) => {
  const getDayName = (date: Date): string => {
    return date.toLocaleDateString("es-ES", { weekday: "long" })
  }

  return (
    <div>
      <h2>Menú del día {new Date(startDate).toLocaleDateString("es-ES")}</h2>
      {menuItems.map((item) => (
        <div key={item.date.toISOString()}>
          <h3>
            {getDayName(item.date)} - {new Date(item.date).toLocaleDateString("es-ES")}
          </h3>
          <p>{item.dish}</p>
        </div>
      ))}
    </div>
  )
}

export default WeeklyMenuView
