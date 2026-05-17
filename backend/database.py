import time
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite+aiosqlite:///./mini_rollup.db"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@asynccontextmanager
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                address     TEXT PRIMARY KEY,
                telegram_id INTEGER,
                username    TEXT,
                avatar_url  TEXT,
                public_key  TEXT,
                off_chain_balance INTEGER DEFAULT 0,
                nonce       INTEGER DEFAULT 0,
                created_at  INTEGER DEFAULT 0
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS transactions (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                sender    TEXT NOT NULL,
                receiver  TEXT NOT NULL,
                amount    INTEGER NOT NULL,
                timestamp INTEGER NOT NULL,
                batch_id  INTEGER,
                signature TEXT NOT NULL,
                nonce     INTEGER NOT NULL DEFAULT 0
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS batches (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                state_root    TEXT NOT NULL,
                tx_count      INTEGER NOT NULL,
                total_volume  INTEGER NOT NULL,
                settled_at    INTEGER,
                tx_hash       TEXT
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS withdrawals (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                address    TEXT NOT NULL,
                amount     INTEGER NOT NULL,
                batch_id   INTEGER,
                created_at INTEGER NOT NULL
            )
        """))

        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_transactions_sender
                ON transactions(sender)
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_transactions_receiver
                ON transactions(receiver)
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_transactions_batch_id
                ON transactions(batch_id)
        """))
