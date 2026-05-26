import bcrypt from 'bcryptjs'
import { customAlphabet } from 'nanoid'

const digits = customAlphabet('0123456789', 4)

/** Génère un PIN numérique aléatoire de 4 chiffres */
export function generatePin(): string {
  return digits()
}

/** Hash un PIN avec bcrypt */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12)
}

/** Vérifie un PIN contre son hash */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

/** Valide le format d'un PIN (4 chiffres exactement) */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}