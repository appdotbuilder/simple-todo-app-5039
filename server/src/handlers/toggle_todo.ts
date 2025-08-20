import { db } from '../db';
import { todosTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type ToggleTodoInput, type Todo } from '../schema';

export const toggleTodo = async (input: ToggleTodoInput): Promise<Todo> => {
  try {
    // First, get the current todo to check if it exists and get its current completed status
    const existingTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, input.id))
      .execute();

    if (existingTodos.length === 0) {
      throw new Error(`Todo with id ${input.id} not found`);
    }

    const currentTodo = existingTodos[0];

    // Toggle the completed status and update the updated_at timestamp
    const result = await db.update(todosTable)
      .set({
        completed: !currentTodo.completed,
        updated_at: new Date()
      })
      .where(eq(todosTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Toggle todo failed:', error);
    throw error;
  }
};