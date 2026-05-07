import { ref, triggerRef, type Ref } from 'vue'

/**
 * Subscribable – базовый класс для реализации паттерна наблюдателя.
 * Предоставляет методы для подписки, отписки и уведомления слушателей.
 * Пример:
 * ```ts
 *  { refObj: domain } = useSubscribableRef(BuildX.domain)
 *  // domain будет реактивной переменной, которая тригерится при каждом внутреннем обновлении.
 *  ```
 */
export class Subscribable {
  private subscribers: Set<() => void> = new Set()

  /**
   * Подписывается на обновления.
   * @param listener Функция, вызываемая при уведомлении.
   * @returns Функция для отписки.
   */
  public subscribe(listener: () => void): () => void {
    this.subscribers.add(listener)
    return () => {
      this.subscribers.delete(listener)
    }
  }

  /**
   * Уведомляет всех подписчиков.
   */
  public notify(): void {
    this.subscribers.forEach((listener) => listener())
  }
}

/**
 * Ref – обёртка для значения, поддерживающая подписку на изменения.
 */
export const useSubscribableRef = <T extends Subscribable>(
  obj: T,
): { refObj: Ref<T>; unsubscribe: () => void } => {
  const refObj = ref(obj) as Ref<T>
  const unsubscribe = obj.subscribe(() => {
    triggerRef(refObj)
  })
  return { refObj, unsubscribe }
}
