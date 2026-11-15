const { canonicalizeMenuDraft } = require("./weekly-menu-domain")

const BLUEPRINT = [["comida", 1], ["comida", 2], ["cena", 1]]

function key(slot) {
  return `${slot.day_of_week}:${slot.meal_type}:${slot.dish_order}`
}

function buildConceptualSlots(draft) {
  const occupied = new Map((Array.isArray(draft) ? draft : []).map((slot) => [key(slot), slot]))
  const result = []
  for (let day = 0; day < 7; day += 1) {
    for (const [mealType, dishOrder] of BLUEPRINT) {
      const identity = { day_of_week: day, meal_type: mealType, dish_order: dishOrder }
      result.push({ ...identity, slot: occupied.get(key(identity)) || null })
    }
  }
  return result
}

function copySlots(slots) {
  return canonicalizeMenuDraft(Array.isArray(slots) ? slots : [], new Date("2026-01-05T12:00:00Z"))
}

function reduceDraft(current, action, editable) {
  const original = copySlots(current)
  if (!editable || !action || typeof action !== "object") return original
  if (action.type === "copy" || action.type === "restore") return copySlots(action.slots)
  const identity = {
    day_of_week: action.day_of_week,
    meal_type: action.meal_type,
    dish_order: action.dish_order,
  }
  const identityKey = key(identity)
  if (action.type === "remove") return original.filter((slot) => key(slot) !== identityKey)
  if (action.type === "set") {
    const next = original.filter((slot) => key(slot) !== identityKey)
    next.push({ ...identity, recipe_id: action.recipe_id, sacado_del_congelador: false })
    return copySlots(next)
  }
  if (action.type === "toggle-freezer") {
    return original.map((slot) => key(slot) === identityKey
      ? { ...slot, sacado_del_congelador: !slot.sacado_del_congelador }
      : slot)
  }
  return original
}

function withTarget(payload, target) {
  return target ? { ...payload, target } : payload
}

function buildSaveRequest(week, target, slots) {
  return withTarget({ week, slots: copySlots(slots) }, target)
}

function buildCopyRequest(sourceWeek, destinationWeek, target) {
  return withTarget({ sourceWeek, destinationWeek }, target)
}

module.exports = { buildConceptualSlots, reduceDraft, buildSaveRequest, buildCopyRequest }
