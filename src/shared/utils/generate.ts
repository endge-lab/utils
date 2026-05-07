import { v4 as uuidv4 } from 'uuid'

export const generateUUID = () => uuidv4()

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function randomString(length: number) {
  let result = ''
  for (let i = 0; i < length; ++i) {
    result += alphabet[Math.floor(alphabet.length * Math.random())]
  }
  return result
}

const allowedShiftPatternsIds = [2, 3, 4, 5, 9]

function getRandomShiftTypeId() {
  return allowedShiftPatternsIds[Math.floor(Math.random() * allowedShiftPatternsIds.length)]
}

function getRandomDate(start, end) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
  return new Date(randomTime)
}
