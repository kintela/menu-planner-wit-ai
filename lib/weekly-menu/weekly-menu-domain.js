const MADRID_TIME_ZONE = "Europe/Madrid"
const DAY_MS = 86_400_000
const SLOT_FIELDS = ["day_of_week", "meal_type", "dish_order", "recipe_id", "sacado_del_congelador"]

const madridDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: MADRID_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const utcDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "UTC",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

class WeeklyMenuDomainError extends TypeError {
  constructor(code, message) {
    super(message)
    this.name = "WeeklyMenuDomainError"
    this.code = code
  }
}

function fail(code, message) {
  throw new WeeklyMenuDomainError(code, message)
}

function requireToday(hoy) {
  if (!(hoy instanceof Date) || Number.isNaN(hoy.getTime())) fail("INVALID_TODAY", "hoy must be a valid Date instant")
  return hoy
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysInMonth(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

function parseMadridDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fail("INVALID_CIVIL_DATE", "date must use YYYY-MM-DD")
  }
  const [year, month, day] = value.split("-").map(Number)
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return fail("INVALID_CIVIL_DATE", "date is not a valid civil date")
  }
  return { year, month, day, iso: value }
}

function partsToIso(parts) {
  const values = {}
  for (const part of parts) if (part.type !== "literal") values[part.type] = part.value
  return `${values.year}-${values.month}-${values.day}`
}

function madridIsoForInstant(hoy) {
  return partsToIso(madridDateFormatter.formatToParts(requireToday(hoy)))
}

function civilEpoch({ year, month, day }) {
  return Date.UTC(year, month - 1, day)
}

function isoFromEpoch(epoch) {
  return partsToIso(utcDateFormatter.formatToParts(epoch))
}

function mondayOffset(civil) {
  // 1970-01-01 was Thursday (Monday-based index 3).
  const epochDay = Math.floor(civilEpoch(civil) / DAY_MS)
  return ((epochDay + 3) % 7 + 7) % 7
}

function addCivilDays(civil, amount) {
  return isoFromEpoch(civilEpoch(civil) + amount * DAY_MS)
}

function normalizeWeekStart(value, hoy) {
  requireToday(hoy)
  const civil = parseMadridDate(value)
  return addCivilDays(civil, -mondayOffset(civil))
}

function mondayIsoFor(hoy) {
  const madridToday = madridIsoForInstant(hoy)
  return normalizeWeekStart(madridToday, hoy)
}

function requireMonday(value, hoy) {
  requireToday(hoy)
  const civil = parseMadridDate(value)
  if (mondayOffset(civil) !== 0) fail("NOT_MONDAY", "weekStart must be a Monday")
  return civil
}

function buildWeekRange(weekStart, hoy) {
  const mondayCivil = requireMonday(weekStart, hoy)
  const dates = Array.from({ length: 7 }, (_, index) => addCivilDays(mondayCivil, index))
  return {
    monday: dates[0],
    sunday: dates[6],
    dates,
    days: dates.map((iso, dayIndex) => ({ dayIndex, iso })),
  }
}

function classifyWeek(weekStart, hoy) {
  requireMonday(weekStart, hoy)
  const current = mondayIsoFor(hoy)
  if (weekStart < current) return "past"
  if (weekStart > current) return "future"
  return "current"
}

function parseMenuSlot(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("INVALID_MENU_SLOT", "slot must be an occupied slot object")
  }
  const keys = Object.keys(input).sort()
  const expected = [...SLOT_FIELDS].sort()
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    return fail("INVALID_MENU_SLOT", "slot fields are invalid")
  }
  const day = input.day_of_week
  const meal = input.meal_type
  const order = input.dish_order
  const recipe = input.recipe_id
  const freezer = input.sacado_del_congelador
  const validCombination = (meal === "comida" && (order === 1 || order === 2)) || (meal === "cena" && order === 1)
  if (!Number.isInteger(day) || day < 0 || day > 6 || !validCombination ||
      !Number.isSafeInteger(recipe) || recipe <= 0 || typeof freezer !== "boolean") {
    return fail("INVALID_MENU_SLOT", "slot values are invalid")
  }
  return {
    day_of_week: day,
    meal_type: meal,
    dish_order: order,
    recipe_id: recipe,
    sacado_del_congelador: freezer,
  }
}

function validateMenuDraft(input, hoy) {
  requireToday(hoy)
  if (!Array.isArray(input)) fail("INVALID_MENU_DRAFT", "draft must be an array")
  if (input.length > 21) fail("TOO_MANY_MENU_SLOTS", "draft cannot contain more than 21 occupied slots")
  const seen = new Set()
  return input.map(value => {
    const parsed = parseMenuSlot(value)
    const key = `${parsed.day_of_week}:${parsed.meal_type}:${parsed.dish_order}`
    if (seen.has(key)) fail("DUPLICATE_MENU_SLOT", "draft contains a duplicate slot")
    seen.add(key)
    return parsed
  })
}

function compareSlots(left, right) {
  if (left.day_of_week !== right.day_of_week) return left.day_of_week - right.day_of_week
  if (left.meal_type !== right.meal_type) return left.meal_type === "comida" ? -1 : 1
  return left.dish_order - right.dish_order
}

function canonicalizeMenuDraft(input, hoy) {
  return validateMenuDraft(input, hoy).sort(compareSlots)
}

function hasUnsavedChanges(saved, draft, hoy) {
  return JSON.stringify(canonicalizeMenuDraft(saved, hoy)) !== JSON.stringify(canonicalizeMenuDraft(draft, hoy))
}

function copyMenuDraft(source, destinationWeek, hoy) {
  requireToday(hoy)
  const slots = Array.isArray(source) ? source : source && source.slots
  const copiedSlots = canonicalizeMenuDraft(slots, hoy)
  return {
    weekStart: normalizeWeekStart(destinationWeek, hoy),
    slots: copiedSlots.map(value => ({ ...value })),
  }
}

function restoreMenuDraft(saved, hoy) {
  return canonicalizeMenuDraft(saved, hoy).map(value => ({ ...value }))
}

// Presentation helper only. Server authorization must use trusted session and persistence data.
function canEditWeek({ actorId, actorRole, ownerId, weekStart } = {}, hoy) {
  requireToday(hoy)
  if (!actorId || !ownerId || (actorRole !== "admin" && actorId !== ownerId)) return false
  try {
    return classifyWeek(weekStart, hoy) !== "past"
  } catch (error) {
    if (error instanceof WeeklyMenuDomainError) return false
    throw error
  }
}

module.exports = {
  WeeklyMenuDomainError,
  buildWeekRange,
  canEditWeek,
  canonicalizeMenuDraft,
  classifyWeek,
  copyMenuDraft,
  hasUnsavedChanges,
  mondayIsoFor,
  normalizeWeekStart,
  parseMadridDate,
  parseMenuSlot,
  restoreMenuDraft,
  validateMenuDraft,
}
