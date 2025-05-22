import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || './moderation.sqlite';
const db = new Database(DB_PATH);

// Создаёт таблицу users при первом запуске, если она ещё не существует
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    telegram_id INTEGER PRIMARY KEY,
    first_name TEXT,
    username TEXT,
    status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

interface UserRow {
    status: string;
}

/**
 * Возвращает статус пользователя по его Telegram ID.
 *
 * @param telegramId - ID пользователя из Telegram
 * @returns Статус ('pending', 'approved', 'rejected') или null, если пользователь не найден
 */
export const getUserStatus = (telegramId: number): string | null => {
    const row = db.prepare('SELECT status FROM users WHERE telegram_id = ?').get(telegramId) as UserRow | undefined;
    return row?.status ?? null;
};

/**
 * Добавляет нового пользователя в статусе 'pending'.
 *
 * @param user - Объект пользователя с ID, именем и (опционально) username
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
 * @param telegramId - ID пользователя, которого нужно одобрить
 */
export const approveUser = (telegramId: number) => {
    db.prepare('UPDATE users SET status = ? WHERE telegram_id = ?').run('approved', telegramId);
};

/**
 * Обновляет статус пользователя на 'rejected'.
 *
 * @param telegramId - ID пользователя, которому нужно отказать
 */
export const rejectUser = (telegramId: number) => {
    db.prepare('UPDATE users SET status = ? WHERE telegram_id = ?').run('rejected', telegramId);
};
