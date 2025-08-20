import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type UpdateTodoInput, type CreateTodoInput } from '../schema';
import { updateTodo } from '../handlers/update_todo';
import { eq } from 'drizzle-orm';

// Helper function to create a test todo
const createTestTodo = async (data: CreateTodoInput) => {
  const result = await db.insert(todosTable)
    .values({
      title: data.title,
      description: data.description || null,
      completed: false
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('updateTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update todo title', async () => {
    // Create a test todo
    const testTodo = await createTestTodo({
      title: 'Original Title',
      description: 'Original description'
    });

    const updateInput: UpdateTodoInput = {
      id: testTodo.id,
      title: 'Updated Title'
    };

    const result = await updateTodo(updateInput);

    // Verify the updated fields
    expect(result.id).toEqual(testTodo.id);
    expect(result.title).toEqual('Updated Title');
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.completed).toEqual(false); // Should remain unchanged
    expect(result.created_at).toEqual(testTodo.created_at); // Should remain unchanged
    expect(result.updated_at).not.toEqual(testTodo.updated_at); // Should be updated
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update todo description', async () => {
    const testTodo = await createTestTodo({
      title: 'Test Title',
      description: 'Original description'
    });

    const updateInput: UpdateTodoInput = {
      id: testTodo.id,
      description: 'Updated description'
    };

    const result = await updateTodo(updateInput);

    expect(result.title).toEqual('Test Title'); // Should remain unchanged
    expect(result.description).toEqual('Updated description');
    expect(result.updated_at).not.toEqual(testTodo.updated_at);
  });

  it('should update todo completion status', async () => {
    const testTodo = await createTestTodo({
      title: 'Test Title',
      description: 'Test description'
    });

    const updateInput: UpdateTodoInput = {
      id: testTodo.id,
      completed: true
    };

    const result = await updateTodo(updateInput);

    expect(result.title).toEqual('Test Title'); // Should remain unchanged
    expect(result.description).toEqual('Test description'); // Should remain unchanged
    expect(result.completed).toEqual(true);
    expect(result.updated_at).not.toEqual(testTodo.updated_at);
  });

  it('should update multiple fields at once', async () => {
    const testTodo = await createTestTodo({
      title: 'Original Title',
      description: 'Original description'
    });

    const updateInput: UpdateTodoInput = {
      id: testTodo.id,
      title: 'Updated Title',
      description: 'Updated description',
      completed: true
    };

    const result = await updateTodo(updateInput);

    expect(result.title).toEqual('Updated Title');
    expect(result.description).toEqual('Updated description');
    expect(result.completed).toEqual(true);
    expect(result.created_at).toEqual(testTodo.created_at); // Should remain unchanged
    expect(result.updated_at).not.toEqual(testTodo.updated_at); // Should be updated
  });

  it('should set description to null when explicitly provided', async () => {
    const testTodo = await createTestTodo({
      title: 'Test Title',
      description: 'Original description'
    });

    const updateInput: UpdateTodoInput = {
      id: testTodo.id,
      description: null
    };

    const result = await updateTodo(updateInput);

    expect(result.description).toBeNull();
    expect(result.title).toEqual('Test Title'); // Should remain unchanged
  });

  it('should update the todo in the database', async () => {
    const testTodo = await createTestTodo({
      title: 'Original Title',
      description: 'Original description'
    });

    const updateInput: UpdateTodoInput = {
      id: testTodo.id,
      title: 'Updated Title',
      completed: true
    };

    await updateTodo(updateInput);

    // Verify the changes were persisted to database
    const updatedTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, testTodo.id))
      .execute();

    expect(updatedTodos).toHaveLength(1);
    expect(updatedTodos[0].title).toEqual('Updated Title');
    expect(updatedTodos[0].completed).toEqual(true);
    expect(updatedTodos[0].description).toEqual('Original description');
    expect(updatedTodos[0].updated_at).not.toEqual(testTodo.updated_at);
  });

  it('should throw error when todo does not exist', async () => {
    const updateInput: UpdateTodoInput = {
      id: 999999, // Non-existent ID
      title: 'Updated Title'
    };

    expect(updateTodo(updateInput)).rejects.toThrow(/todo with id 999999 not found/i);
  });

  it('should always update the updated_at timestamp even with no other changes', async () => {
    const testTodo = await createTestTodo({
      title: 'Test Title',
      description: 'Test description'
    });

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateTodoInput = {
      id: testTodo.id
      // No other fields provided
    };

    const result = await updateTodo(updateInput);

    expect(result.title).toEqual('Test Title'); // Should remain unchanged
    expect(result.description).toEqual('Test description'); // Should remain unchanged
    expect(result.completed).toEqual(false); // Should remain unchanged
    expect(result.updated_at).not.toEqual(testTodo.updated_at); // Should be updated
    expect(result.updated_at > testTodo.updated_at).toBe(true);
  });

  it('should handle updating todo with null description', async () => {
    // Create todo with null description
    const testTodo = await createTestTodo({
      title: 'Test Title'
      // description omitted, will be null
    });

    const updateInput: UpdateTodoInput = {
      id: testTodo.id,
      title: 'Updated Title'
    };

    const result = await updateTodo(updateInput);

    expect(result.title).toEqual('Updated Title');
    expect(result.description).toBeNull();
    expect(result.updated_at).not.toEqual(testTodo.updated_at);
  });
});