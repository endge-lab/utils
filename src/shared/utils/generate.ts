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
