import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { getTodos } from '../handlers/get_todos';

describe('getTodos', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no todos exist', async () => {
    const result = await getTodos();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all todos', async () => {
    // Create test todos
    await db.insert(todosTable).values([
      {
        title: 'First Todo',
        description: 'First todo description',
        completed: false
      },
      {
        title: 'Second Todo',
        description: null, // Test nullable description
        completed: true
      },
      {
        title: 'Third Todo',
        description: 'Third todo description',
        completed: false
      }
    ]).execute();

    const result = await getTodos();

    expect(result).toHaveLength(3);
    
    // Verify all todos are returned with correct fields
    result.forEach(todo => {
      expect(todo.id).toBeDefined();
      expect(typeof todo.title).toBe('string');
      expect(todo.description === null || typeof todo.description === 'string').toBe(true);
      expect(typeof todo.completed).toBe('boolean');
      expect(todo.created_at).toBeInstanceOf(Date);
      expect(todo.updated_at).toBeInstanceOf(Date);
    });

    // Verify specific todos exist
    const titles = result.map(todo => todo.title);
    expect(titles).toContain('First Todo');
    expect(titles).toContain('Second Todo');
    expect(titles).toContain('Third Todo');
  });

  it('should return todos ordered by creation date (newest first)', async () => {
    // Create todos with slight delays to ensure different timestamps
    await db.insert(todosTable).values({
      title: 'Oldest Todo',
      description: 'Created first',
      completed: false
    }).execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(todosTable).values({
      title: 'Middle Todo',
      description: 'Created second',
      completed: false
    }).execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(todosTable).values({
      title: 'Newest Todo',
      description: 'Created last',
      completed: false
    }).execute();

    const result = await getTodos();

    expect(result).toHaveLength(3);
    
    // Verify ordering (newest first)
    expect(result[0].title).toBe('Newest Todo');
    expect(result[1].title).toBe('Middle Todo');
    expect(result[2].title).toBe('Oldest Todo');

    // Verify timestamps are actually ordered correctly
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].created_at.getTime()).toBeGreaterThanOrEqual(
        result[i + 1].created_at.getTime()
      );
    }
  });

  it('should handle todos with various completion statuses', async () => {
    // Create todos with different completion statuses
    await db.insert(todosTable).values([
      {
        title: 'Completed Todo',
        description: 'This is done',
        completed: true
      },
      {
        title: 'Incomplete Todo',
        description: 'Still working on this',
        completed: false
      }
    ]).execute();

    const result = await getTodos();

    expect(result).toHaveLength(2);
    
    const completedTodo = result.find(todo => todo.completed === true);
    const incompleteTodo = result.find(todo => todo.completed === false);
    
    expect(completedTodo).toBeDefined();
    expect(incompleteTodo).toBeDefined();
    expect(completedTodo!.title).toBe('Completed Todo');
    expect(incompleteTodo!.title).toBe('Incomplete Todo');
  });

  it('should handle todos with null descriptions', async () => {
    await db.insert(todosTable).values([
      {
        title: 'Todo with description',
        description: 'Has a description',
        completed: false
      },
      {
        title: 'Todo without description',
        description: null, // Explicitly null
        completed: false
      }
    ]).execute();

    const result = await getTodos();

    expect(result).toHaveLength(2);
    
    const todoWithDesc = result.find(todo => todo.description !== null);
    const todoWithoutDesc = result.find(todo => todo.description === null);
    
    expect(todoWithDesc).toBeDefined();
    expect(todoWithoutDesc).toBeDefined();
    expect(todoWithDesc!.description).toBe('Has a description');
    expect(todoWithoutDesc!.description).toBeNull();
  });
});