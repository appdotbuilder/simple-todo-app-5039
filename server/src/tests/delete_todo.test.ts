import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type DeleteTodoInput, type CreateTodoInput } from '../schema';
import { deleteTodo } from '../handlers/delete_todo';
import { eq } from 'drizzle-orm';

// Helper function to create a test todo
const createTestTodo = async (data: Partial<CreateTodoInput> = {}) => {
  const todoData = {
    title: 'Test Todo',
    description: 'A todo for testing',
    ...data
  };

  const result = await db.insert(todosTable)
    .values(todoData)
    .returning()
    .execute();

  return result[0];
};

describe('deleteTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing todo', async () => {
    // Create a test todo first
    const testTodo = await createTestTodo();
    
    const input: DeleteTodoInput = {
      id: testTodo.id
    };

    const result = await deleteTodo(input);

    // Verify the response
    expect(result.success).toBe(true);

    // Verify the todo was actually deleted from the database
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, testTodo.id))
      .execute();

    expect(todos).toHaveLength(0);
  });

  it('should throw error when todo does not exist', async () => {
    const input: DeleteTodoInput = {
      id: 999 // Non-existent ID
    };

    await expect(deleteTodo(input)).rejects.toThrow(/Todo with ID 999 not found/i);
  });

  it('should not affect other todos when deleting one', async () => {
    // Create multiple test todos
    const todo1 = await createTestTodo({ title: 'First Todo' });
    const todo2 = await createTestTodo({ title: 'Second Todo' });
    const todo3 = await createTestTodo({ title: 'Third Todo' });

    const input: DeleteTodoInput = {
      id: todo2.id
    };

    // Delete the middle todo
    const result = await deleteTodo(input);
    expect(result.success).toBe(true);

    // Verify other todos still exist
    const remainingTodos = await db.select()
      .from(todosTable)
      .execute();

    expect(remainingTodos).toHaveLength(2);
    
    // Verify the correct todos remain
    const remainingIds = remainingTodos.map(todo => todo.id);
    expect(remainingIds).toContain(todo1.id);
    expect(remainingIds).toContain(todo3.id);
    expect(remainingIds).not.toContain(todo2.id);
  });

  it('should delete todo with null description', async () => {
    // Create todo with null description
    const testTodo = await createTestTodo({ 
      title: 'Todo with null description',
      description: null 
    });

    const input: DeleteTodoInput = {
      id: testTodo.id
    };

    const result = await deleteTodo(input);

    expect(result.success).toBe(true);

    // Verify deletion
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, testTodo.id))
      .execute();

    expect(todos).toHaveLength(0);
  });

  it('should delete completed todo', async () => {
    // Create a completed todo
    const testTodo = await createTestTodo();
    
    // Mark it as completed first
    await db.update(todosTable)
      .set({ completed: true })
      .where(eq(todosTable.id, testTodo.id))
      .execute();

    const input: DeleteTodoInput = {
      id: testTodo.id
    };

    const result = await deleteTodo(input);

    expect(result.success).toBe(true);

    // Verify deletion
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, testTodo.id))
      .execute();

    expect(todos).toHaveLength(0);
  });
});