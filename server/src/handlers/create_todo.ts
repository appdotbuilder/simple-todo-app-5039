import { db } from '../db';
import { todosTable } from '../db/schema';
import { type CreateTodoInput, type Todo } from '../schema';

export const createTodo = async (input: CreateTodoInput): Promise<Todo> => {
  try {
    // Insert todo record
    const result = await db.insert(todosTable)
      .values({
        title: input.title,
        description: input.description || null, // Handle nullable field
        completed: false // New todos start as incomplete
        // created_at and updated_at will be set automatically by database defaults
      })
      .returning()
      .execute();

    const todo = result[0];
    return todo;
  } catch (error) {
    console.error('Todo creation failed:', error);
    throw error;
  }
};