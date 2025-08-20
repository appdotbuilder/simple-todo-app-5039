import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type ToggleTodoInput } from '../schema';
import { toggleTodo } from '../handlers/toggle_todo';
import { eq } from 'drizzle-orm';

describe('toggleTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should toggle todo from false to true', async () => {
    // Create a todo with completed = false
    const [createdTodo] = await db.insert(todosTable)
      .values({
        title: 'Test Todo',
        description: 'A test todo',
        completed: false
      })
      .returning()
      .execute();

    const input: ToggleTodoInput = {
      id: createdTodo.id
    };

    const result = await toggleTodo(input);

    // Verify the completed status was toggled to true
    expect(result.completed).toBe(true);
    expect(result.id).toBe(createdTodo.id);
    expect(result.title).toBe('Test Todo');
    expect(result.description).toBe('A test todo');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(createdTodo.updated_at.getTime());
  });

  it('should toggle todo from true to false', async () => {
    // Create a todo with completed = true
    const [createdTodo] = await db.insert(todosTable)
      .values({
        title: 'Completed Todo',
        description: null,
        completed: true
      })
      .returning()
      .execute();

    const input: ToggleTodoInput = {
      id: createdTodo.id
    };

    const result = await toggleTodo(input);

    // Verify the completed status was toggled to false
    expect(result.completed).toBe(false);
    expect(result.id).toBe(createdTodo.id);
    expect(result.title).toBe('Completed Todo');
    expect(result.description).toBe(null);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(createdTodo.updated_at.getTime());
  });

  it('should update todo in database', async () => {
    // Create a todo
    const [createdTodo] = await db.insert(todosTable)
      .values({
        title: 'Database Test Todo',
        description: 'Testing database update',
        completed: false
      })
      .returning()
      .execute();

    const input: ToggleTodoInput = {
      id: createdTodo.id
    };

    await toggleTodo(input);

    // Query database directly to verify the change was persisted
    const [updatedTodo] = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, createdTodo.id))
      .execute();

    expect(updatedTodo.completed).toBe(true);
    expect(updatedTodo.updated_at.getTime()).toBeGreaterThan(createdTodo.updated_at.getTime());
  });

  it('should throw error when todo does not exist', async () => {
    const input: ToggleTodoInput = {
      id: 999999 // Non-existent ID
    };

    await expect(toggleTodo(input)).rejects.toThrow(/Todo with id 999999 not found/);
  });

  it('should preserve original created_at timestamp', async () => {
    // Create a todo
    const [createdTodo] = await db.insert(todosTable)
      .values({
        title: 'Timestamp Test Todo',
        description: 'Testing timestamp preservation',
        completed: false
      })
      .returning()
      .execute();

    const input: ToggleTodoInput = {
      id: createdTodo.id
    };

    const result = await toggleTodo(input);

    // Verify created_at is preserved but updated_at is changed
    expect(result.created_at).toEqual(createdTodo.created_at);
    expect(result.updated_at.getTime()).toBeGreaterThan(createdTodo.updated_at.getTime());
  });

  it('should handle multiple toggles correctly', async () => {
    // Create a todo
    const [createdTodo] = await db.insert(todosTable)
      .values({
        title: 'Multiple Toggle Test',
        description: 'Testing multiple toggles',
        completed: false
      })
      .returning()
      .execute();

    const input: ToggleTodoInput = {
      id: createdTodo.id
    };

    // Toggle 1: false -> true
    const result1 = await toggleTodo(input);
    expect(result1.completed).toBe(true);

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));

    // Toggle 2: true -> false
    const result2 = await toggleTodo(input);
    expect(result2.completed).toBe(false);
    expect(result2.updated_at.getTime()).toBeGreaterThan(result1.updated_at.getTime());

    // Toggle 3: false -> true
    const result3 = await toggleTodo(input);
    expect(result3.completed).toBe(true);
    expect(result3.updated_at.getTime()).toBeGreaterThan(result2.updated_at.getTime());
  });
});