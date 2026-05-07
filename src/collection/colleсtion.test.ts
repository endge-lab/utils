import { describe, it, expect, vi } from 'vitest'
import type { CollectionEntity } from '@/collection/types'
import { Events } from '@/collection/types'
import { Collection } from '@/collection/collection'

interface User extends CollectionEntity {
  name: string
  email: string
}

describe('Collection', () => {
  it('должна корректно добавлять, обновлять, удалять элементы и вызывать события', () => {
    const users = new Collection<User>()

    const onAdd = vi.fn()
    const onUpdate = vi.fn()
    const onRemove = vi.fn()
    const onIndexCreated = vi.fn()

    users.on(Events.Add, onAdd)
    users.on(Events.Update, onUpdate)
    users.on(Events.Remove, onRemove)
    users.on(Events.IndexCreate, onIndexCreated)

    // Добавляем пользователей
    const newUsers = [
      { id: '1', name: 'Alice', email: 'alice@example.com' },
      { id: '2', name: 'Bob', email: 'bob@example.com' },
    ]
    users.add(newUsers)

    expect(users.get('1')).toEqual(newUsers[0])
    expect(users.get('2')).toEqual(newUsers[1])
    expect(onAdd).toHaveBeenCalledWith(newUsers)

    // Обновляем пользователя
    users.update({ id: '1', name: 'Alice Updated', email: 'alice@updated.com' })
    expect(users.get('1')?.name).toBe('Alice Updated')
    expect(onUpdate).toHaveBeenCalledWith([
      { id: '1', name: 'Alice Updated', email: 'alice@updated.com' },
    ])

    // Удаляем пользователя
    users.remove('2')
    expect(users.get('2')).toBeUndefined()
    expect(onRemove).toHaveBeenCalledWith({
      id: '2',
      name: 'Bob',
      email: 'bob@example.com',
    })

    // Доступ по произвольному полю
    const userByEmail = users.get({ email: 'alice@updated.com' })
    expect(userByEmail).toEqual({
      id: '1',
      name: 'Alice Updated',
      email: 'alice@updated.com',
    })
    expect(onIndexCreated).toHaveBeenCalledWith('email')
  })

  it('должна создавать индекс только при первом вызове get по произвольному полю', () => {
    const users = new Collection<User>([
      { id: '1', name: 'Alice', email: 'alice@example.com' },
      { id: '2', name: 'Bob', email: 'bob@example.com' },
    ])

    const onIndexCreated = vi.fn()
    users.on(Events.IndexCreate, onIndexCreated)

    // Первый вызов по email — создаёт индекс
    users.get({ email: 'alice@example.com' })
    expect(onIndexCreated).toHaveBeenCalledWith('email')

    // Второй вызов — индекс уже существует
    users.get({ email: 'bob@example.com' })
    expect(onIndexCreated).toHaveBeenCalledTimes(1)
  })
})
