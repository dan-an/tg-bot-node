import { Database } from 'bun:sqlite';

const DB_PATH = process.env.DB_PATH || './moderation.sqlite';
const db = new Database(DB_PATH);

/**
 * Инициализация таблицы пользователей.
 */
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    telegram_id INTEGER PRIMARY KEY,
    first_name TEXT,
    username TEXT,
    status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

/**
 * Получает статус пользователя по telegram_id.
 *
 * @param telegramId - Telegram ID пользователя
 * @returns Статус ('approved', 'pending', 'rejected') или null
 */
export const getUserStatus = (telegramId: number): string | null => {
    const row = db.prepare('SELECT status FROM users WHERE telegram_id = ?').get(telegramId) as
        | { status: string }
        | undefined;

    return row?.status ?? null;
};

/**
 * Добавляет пользователя в базу со статусом 'pending'.
 *
 * @param user - Объект Telegram пользователя
 */
export const addPendingUser = (user: { id: number; first_name: string; username?: string }) => {
    db.prepare(
        `
    INSERT OR IGNORE INTO users (telegram_id, first_name, username, status)
    VALUES (?, ?, ?, 'pending')
  `,
    ).run(user.id, user.first_name, user.username ?? null);
};

/**
 * Обновляет статус пользователя на 'approved'.
 *
 * @param telegramId - Telegram ID пользователя
 */
export const approveUser = (telegramId: number) => {
    db.prepare('UPDATE users SET status = ? WHERE telegram_id = ?').run('approved', telegramId);
};

/**
 * Обновляет статус пользователя на 'rejected'.
 *
 * @param telegramId - Telegram ID пользователя
 */
export const rejectUser = (telegramId: number) => {
    db.prepare('UPDATE users SET status = ? WHERE telegram_id = ?').run('rejected', telegramId);
};
