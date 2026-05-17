# Mini-Rollup: Off-Chain Payment Batch with On-Chain Settlement

## Техническое задание для курсового проекта

---

## 1\. Контекст: Layer 2 и Rollups

### Проблема масштабируемости

Ethereum L1 обрабатывает \~12–15 TPS при стоимости $0,50–$10 за транзакцию. Layer 2 решения масштабируют сеть, вынося исполнение транзакций off-chain, но сохраняя безопасность через on-chain settlement.

### Как работает Rollup

Rollup — основное L2-решение. Принцип работы:

1. Пользователи отправляют транзакции **секвенсору** (off-chain сервер)  
2. Секвенсор собирает транзакции в **батч** (batch)  
3. Батч публикуется на L1 с **доказательством корректности**  
4. Смарт-контракт на L1 верифицирует и фиксирует итоговое состояние

Два типа rollups:

- **Optimistic** — транзакции считаются верными, пока не оспорены (fraud proof, challenge period \~7 дней)  
- **ZK** — каждый батч сопровождается криптографическим доказательством (validity proof, финализация за минуты)

Ключевая идея: **off-chain execution \+ on-chain settlement \= масштабирование без потери безопасности**.

### Что мы строим

**Mini-Rollup** — упрощённая модель rollup-системы на блокчейне TON, демонстрирующая основные принципы L2:

- **Off-chain транзакции** — пользователи совершают платежи друг другу через TMA (Telegram Mini App), без on-chain транзакций  
- **Батчинг** — оператор (секвенсор) собирает множество off-chain платежей в один батч  
- **On-chain settlement** — оператор публикует батч в смарт-контракт на TON, фиксируя итоговые балансы  
- **Верификация** — любой пользователь может проверить, что on-chain settlement соответствует его off-chain истории (аналог data availability)  
- **Dispute** — если оператор опубликовал некорректное состояние, пользователь может оспорить (упрощённый fraud proof)

Проект **не повторяет** темы из каталога курса (Habit Staking, Split Bill, Auction и т.д.), но использует тот же стек (TMA \+ TON Connect \+ смарт-контракт) и схожую архитектуру escrow-контрактов.

---

## 2\. Архитектура системы

### Компоненты

┌─────────────────────────────────────────────────┐

│                 Telegram Mini App               │

│  ┌───────────┐  ┌───────────┐  ┌─────────────┐ │

│  │  Deposit   │  │  Send     │  │  Withdraw   │ │

│  │  (on-chain)│  │  (off-ch) │  │  (on-chain) │ │

│  └─────┬─────┘  └─────┬─────┘  └──────┬──────┘ │

│        │              │               │         │

│  ┌─────▼──────────────▼───────────────▼──────┐  │

│  │           TON Connect Wallet              │  │

│  └───────────────────┬───────────────────────┘  │

└──────────────────────┼──────────────────────────┘

                       │

        ┌──────────────┼──────────────┐

        │              │              │

   ┌────▼────┐   ┌─────▼─────┐  ┌────▼─────┐

   │ Backend │   │ TON Smart │  │ Off-chain│

   │ (API)   │◄──│ Contract  │  │ State DB │

   │         │──►│ (Rollup)  │  │ (SQLite) │

   └─────────┘   └───────────┘  └──────────┘

### Три слоя

**1\. Frontend — Telegram Mini App (React)**

- Подключение кошелька через TON Connect  
- Депозит TON в контракт (on-chain)  
- Отправка off-chain платежей другим пользователям  
- Просмотр off-chain баланса и истории  
- Вывод средств (on-chain)  
- Просмотр батчей и верификация

**2\. Backend — API сервер (Python / FastAPI)**

- Роль секвенсора: принимает off-chain транзакции  
- Хранит off-chain состояние (балансы, история)  
- Формирует батчи и отправляет settlement на контракт  
- Предоставляет данные для верификации (data availability)

**3\. Smart Contract — TON (FunC / Tact)**

- Принимает депозиты пользователей  
- Принимает settlement батчи от оператора  
- Хранит on-chain state root (хеш состояния)  
- Обрабатывает withdraw запросы  
- Обрабатывает dispute (упрощённый fraud proof)

---

## 3\. Смарт-контракт: спецификация

### Язык: Tact (рекомендуется) или FunC

### Хранимые данные (contract state)

operator: Address           // адрес оператора (секвенсора)

deposits: map\<Address, Int\> // депозиты пользователей

stateRoot: Int              // хеш текущего off-chain состояния

batchIndex: Int             // номер последнего батча

settlementTime: Int         // время последнего settlement

disputeWindow: Int          // окно для dispute (например, 3600 сек \= 1 час)

disputed: Bool              // флаг активного спора

### Сообщения (messages / ops)

**1\. Deposit**

message Deposit {}

// Пользователь отправляет TON на контракт

// Контракт увеличивает deposits\[sender\] \+= msg.value

**2\. SettleBatch**

message SettleBatch {

    batchIndex: Int

    newStateRoot: Int       // хеш нового состояния (sha256 от JSON балансов)

    totalDeposits: Int      // сумма всех балансов (инвариант)

    withdrawals: map\<Address, Int\>  // выводы в этом батче

}

// Только оператор может вызвать

// Проверяет: totalDeposits \<= balance контракта (нельзя вывести больше, чем есть)

// Обновляет stateRoot и batchIndex

// Отправляет TON по адресам из withdrawals

// Устанавливает settlementTime \= now()

**3\. Dispute**

message Dispute {

    claimedBalance: Int     // баланс, который пользователь считает правильным

    proof: Cell             // доказательство (подписанные off-chain транзакции)

}

// Любой пользователь может вызвать в течение disputeWindow

// Если proof валиден и claimedBalance \!= stateRoot balance — dispute принят

// disputed \= true, оператор должен предоставить корректный state

**4\. Withdraw**

message Withdraw {

    amount: Int

}

// Пользователь запрашивает вывод

// Если нет активного dispute и прошёл disputeWindow — средства отправляются

### Упрощения по сравнению с реальным rollup

| Реальный Rollup | Наш проект |
| :---- | :---- |
| Merkle Tree state root | SHA-256 хеш JSON-объекта балансов |
| ZK proof / fraud proof с бисекцией | Простая проверка подписей транзакций |
| Challenge period 7 дней | Dispute window 1 час (для демо) |
| Permissionless sequencer | Один фиксированный оператор |
| Тысячи транзакций в батче | 5–50 транзакций |

---

## 4\. Backend: спецификация

### Язык: Python 3.11+ / FastAPI

### Структура

backend/

├── main.py              \# FastAPI app

├── models.py            \# Pydantic модели

├── state.py             \# Off-chain state manager

├── batch.py             \# Batch formation и settlement

├── ton\_client.py        \# Взаимодействие с TON контрактом

├── database.py          \# SQLite storage

└── requirements.txt

### База данных (SQLite)

**Таблица `users`**

CREATE TABLE users (

    address TEXT PRIMARY KEY,

    telegram\_id INTEGER,

    username TEXT,

    avatar\_url TEXT,

    off\_chain\_balance INTEGER DEFAULT 0  \-- в нанотонах

);

**Таблица `transactions`**

CREATE TABLE transactions (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    sender TEXT NOT NULL,

    receiver TEXT NOT NULL,

    amount INTEGER NOT NULL,

    timestamp INTEGER NOT NULL,

    batch\_id INTEGER,              \-- NULL если ещё не в батче

    signature TEXT NOT NULL         \-- подпись отправителя

);

**Таблица `batches`**

CREATE TABLE batches (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    state\_root TEXT NOT NULL,       \-- SHA-256 хеш балансов

    tx\_count INTEGER NOT NULL,

    total\_volume INTEGER NOT NULL,

    settled\_at INTEGER,             \-- timestamp settlement на контракте

    tx\_hash TEXT                    \-- хеш on-chain транзакции

);

### API Endpoints

POST   /api/deposit/confirm    — подтвердить депозит (после on-chain tx)

POST   /api/transfer           — off-chain перевод между пользователями

GET    /api/balance/{address}  — текущий off-chain баланс

GET    /api/history/{address}  — история off-chain транзакций

POST   /api/withdraw/request   — запрос на вывод (включается в следующий батч)

GET    /api/batches            — список всех батчей

GET    /api/batch/{id}         — детали батча (все транзакции, state root)

GET    /api/verify/{batch\_id}  — данные для самостоятельной верификации

POST   /api/settle             — (оператор) сформировать и отправить батч

GET    /api/stats              — статистика: кол-во tx, экономия gas и т.д.

### Логика off-chain перевода (POST /api/transfer)

async def transfer(sender: str, receiver: str, amount: int, signature: str):

    \# 1\. Проверить подпись (sender подписал {receiver, amount, nonce})

    \# 2\. Проверить off\_chain\_balance\[sender\] \>= amount

    \# 3\. off\_chain\_balance\[sender\] \-= amount

    \# 4\. off\_chain\_balance\[receiver\] \+= amount

    \# 5\. Записать транзакцию в БД (batch\_id \= NULL)

    \# 6\. Вернуть новые балансы

### Логика settlement (POST /api/settle)

async def settle\_batch():

    \# 1\. Собрать все транзакции с batch\_id \= NULL

    \# 2\. Вычислить новый state\_root \= sha256(json(all\_balances))

    \# 3\. Собрать pending withdrawals

    \# 4\. Сформировать SettleBatch message

    \# 5\. Отправить on-chain транзакцию в контракт

    \# 6\. Обновить batch\_id у всех транзакций

    \# 7\. Записать батч в таблицу batches

---

## 5\. Frontend: спецификация

### Фреймворк: React 18 \+ TypeScript \+ Vite

### Зависимости

{

  "@tonconnect/ui-react": "^2.0.0",

  "@ton/ton": "^13.0.0",

  "@ton/core": "^0.56.0",

  "@telegram-apps/sdk-react": "^2.0.0",

  "react": "^18.3.0",

  "react-router-dom": "^6.0.0",

  "axios": "^1.7.0"

}

### Структура

frontend/

├── src/

│   ├── App.tsx

│   ├── main.tsx

│   ├── pages/

│   │   ├── HomePage.tsx        \# Баланс, последние транзакции

│   │   ├── DepositPage.tsx     \# Депозит через TON Connect

│   │   ├── TransferPage.tsx    \# Off-chain перевод

│   │   ├── WithdrawPage.tsx    \# Вывод средств

│   │   ├── BatchesPage.tsx     \# Список батчей, верификация

│   │   └── StatsPage.tsx       \# Статистика экономии

│   ├── components/

│   │   ├── WalletButton.tsx    \# TON Connect кнопка

│   │   ├── BalanceCard.tsx     \# Отображение баланса

│   │   ├── TxList.tsx          \# Список транзакций

│   │   └── BatchCard.tsx       \# Карточка батча

│   ├── hooks/

│   │   ├── useContract.ts      \# Взаимодействие с контрактом

│   │   ├── useApi.ts           \# Запросы к backend

│   │   └── useTelegram.ts      \# Telegram WebApp SDK

│   └── utils/

│       ├── verify.ts           \# Верификация state root

│       └── format.ts           \# Форматирование TON

├── package.json

└── vite.config.ts

### Экраны

**HomePage** — on-chain баланс (депозит в контракте), off-chain баланс (в rollup), кнопки Deposit / Transfer / Withdraw, последние 5 off-chain транзакций, профиль из Telegram (username, аватар).

**DepositPage** — ввод суммы в TON, отправка Deposit message через TON Connect, после подтверждения — вызов `POST /api/deposit/confirm`.

**TransferPage** — выбор получателя (по Telegram username или TON адресу), ввод суммы, подпись данных через TON Connect (`signData`), отправка `POST /api/transfer` — мгновенно, без on-chain транзакции.

**WithdrawPage** — ввод суммы, запрос `POST /api/withdraw/request`, средства включаются в следующий settlement batch.

**BatchesPage** — список всех settlement батчей (номер, количество транзакций, state root, статус), кнопка «Verify» — клиент скачивает данные батча, пересчитывает state root локально и сравнивает с on-chain значением.

**StatsPage** — общая статистика: сколько off-chain транзакций, сколько on-chain settlement'ов, ratio (сколько off-chain tx на 1 on-chain tx \= степень «сжатия»), сколько газа сэкономлено.

---

## 6\. Пользовательский сценарий (User Flow)

1\. Алиса открывает TMA → подключает кошелёк через TON Connect

2\. Алиса вносит 10 TON → on-chain Deposit транзакция в контракт

3\. Backend фиксирует: off\_chain\_balance\[Alice\] \= 10 TON

4\. Алиса отправляет 3 TON Бобу → off-chain (POST /api/transfer)

   \- Мгновенно, бесплатно

   \- off\_chain\_balance\[Alice\] \= 7, off\_chain\_balance\[Bob\] \= 3

5\. Боб отправляет 1 TON Кэрол → off-chain

6\. Кэрол отправляет 0.5 TON Алисе → off-chain

7\. ... ещё 20 off-chain транзакций между пользователями ...

8\. Оператор нажимает "Settle" → 23 off-chain транзакции

   сворачиваются в 1 on-chain транзакцию (SettleBatch)

9\. Контракт обновляет stateRoot

10\. Алиса нажимает "Verify" → TMA скачивает данные батча,

    пересчитывает хеш, сравнивает с on-chain stateRoot

    → "✅ Verified" или "❌ Mismatch — Dispute available"

11\. Алиса запрашивает вывод 5 TON → включается в следующий batch

12\. После settlement → 5 TON отправляются на кошелёк Алисы

**Аналогия с реальным L2:**

- Шаги 4–7 \= off-chain execution (как в Arbitrum/Optimism)  
- Шаг 8 \= batching \+ on-chain settlement  
- Шаг 10 \= data availability verification  
- Шаг 10 (Mismatch) \= simplified fraud proof / dispute

---

## 7\. Как собрать и запустить локально

### Требования

- Node.js 18+  
- Python 3.11+  
- TON CLI / Blueprint (для контракта)  
- Telegram Bot Token (через @BotFather)  
- TON testnet wallet (через Tonkeeper testnet mode)

### Шаг 1: Smart Contract

\# Установить Blueprint (фреймворк для TON контрактов)

npm create ton@latest mini-rollup-contract

cd mini-rollup-contract

\# Структура проекта

\# contracts/MiniRollup.tact  — код контракта

\# tests/MiniRollup.spec.ts   — тесты

\# scripts/deploy.ts           — деплой скрипт

\# Написать контракт (см. секцию 3\)

\# Запустить тесты

npx blueprint test

\# Деплой на testnet

npx blueprint run deploy \--testnet

\# Сохранить адрес контракта

### Шаг 2: Backend

cd backend

\# Создать виртуальное окружение

python \-m venv venv

source venv/bin/activate  \# Linux/Mac

\# или: venv\\Scripts\\activate  \# Windows

\# Установить зависимости

pip install fastapi uvicorn tonsdk python-dotenv pydantic sqlalchemy aiosqlite

\# Создать .env файл

cat \> .env \<\< EOF

CONTRACT\_ADDRESS=EQA...your\_contract\_address

OPERATOR\_MNEMONIC=word1 word2 ... word24

TONCENTER\_API\_KEY=your\_api\_key

EOF

\# Запустить

uvicorn main:app \--reload \--port 8000

### Шаг 3: Frontend

cd frontend

\# Создать проект

npm create vite@latest mini-rollup-tma \-- \--template react-ts

cd mini-rollup-tma

\# Установить зависимости

npm install @tonconnect/ui-react @ton/ton @ton/core

npm install @telegram-apps/sdk-react

npm install axios react-router-dom

\# Создать .env

cat \> .env \<\< EOF

VITE\_API\_URL=http://localhost:8000

VITE\_CONTRACT\_ADDRESS=EQA...your\_contract\_address

VITE\_MANIFEST\_URL=https://your-domain.com/tonconnect-manifest.json

EOF

\# Запустить dev-сервер

npm run dev

### Шаг 4: Telegram Bot \+ Mini App

\# 1\. Создать бота через @BotFather

\# 2\. Получить токен

\# 3\. Настроить Mini App:

\#    /newapp → выбрать бота → указать URL фронтенда

\# 4\. Для локальной разработки использовать ngrok:

ngrok http 5173

\# И указать ngrok URL в BotFather

### Шаг 5: Запуск всей системы

\# Терминал 1: Backend

cd backend && uvicorn main:app \--reload \--port 8000

\# Терминал 2: Frontend

cd frontend && npm run dev

\# Терминал 3: ngrok (для Telegram)

ngrok http 5173

\# Открыть бота в Telegram → запустить Mini App

---

## 8\. Тестирование

### Unit-тесты смарт-контракта (Jest \+ Blueprint)

// tests/MiniRollup.spec.ts

describe('MiniRollup', () \=\> {

    it('should accept deposit', async () \=\> {

        // Отправить 5 TON на контракт

        // Проверить: deposits\[sender\] \== 5 TON

    });

    it('should reject settlement from non-operator', async () \=\> {

        // Попытка settle от произвольного адреса

        // Ожидание: транзакция отклонена

    });

    it('should settle batch correctly', async () \=\> {

        // Депозит 10 TON от Alice

        // Оператор отправляет SettleBatch с withdrawal 3 TON для Alice

        // Проверить: stateRoot обновлён

        // Проверить: Alice получила 3 TON

        // Проверить: batchIndex увеличился

    });

    it('should enforce totalDeposits invariant', async () \=\> {

        // Депозит 10 TON

        // Попытка settle с totalDeposits \> balance

        // Ожидание: транзакция отклонена

    });

    it('should allow dispute within window', async () \=\> {

        // Settle batch

        // Сразу отправить Dispute

        // Проверить: disputed \== true

    });

    it('should reject dispute after window', async () \=\> {

        // Settle batch

        // Подождать \> disputeWindow

        // Отправить Dispute

        // Ожидание: отклонено

    });

    it('should process withdraw after dispute window', async () \=\> {

        // Депозит \+ settle \+ подождать disputeWindow

        // Withdraw

        // Проверить: средства отправлены

    });

});

### Тесты Backend (pytest)

\# tests/test\_api.py

def test\_deposit\_confirm():

    """После on-chain депозита off-chain баланс обновляется"""

def test\_transfer\_success():

    """Off-chain перевод: баланс sender уменьшается, receiver увеличивается"""

def test\_transfer\_insufficient\_balance():

    """Перевод больше баланса — ошибка 400"""

def test\_transfer\_invalid\_signature():

    """Невалидная подпись — ошибка 401"""

def test\_settle\_batch():

    """Settlement: все pending tx получают batch\_id, state\_root вычислен"""

def test\_verify\_batch():

    """Верификация: пересчёт state\_root совпадает с сохранённым"""

def test\_withdraw\_request():

    """Запрос вывода: баланс уменьшается, withdrawal в pending"""

def test\_state\_root\_computation():

    """SHA-256 от отсортированного JSON балансов детерминирован"""

### Ручное тестирование (чеклист)

\[ \] Подключение TON Connect кошелька в TMA

\[ \] Депозит 1 TON через TON Connect → баланс отображается

\[ \] Off-chain перевод другому пользователю → мгновенно

\[ \] Получение off-chain перевода → баланс обновился

\[ \] Settlement батча → on-chain транзакция прошла

\[ \] Верификация батча → state root совпадает

\[ \] Вывод средств → TON пришли на кошелёк

\[ \] Профиль: username и аватар из Telegram отображаются

\[ \] Статистика: ratio off-chain/on-chain tx корректен

---

## 9\. Минимальные требования к сдаче

### Обязательные (по требованиям курса)

- [ ] TMA (Telegram Mini App) публично доступно  
- [ ] TON Connect интеграция (подключение кошелька)  
- [ ] Смарт-контракт написан и задеплоен (testnet допустим)  
- [ ] Профиль пользователя: username и аватар из Telegram бота  
- [ ] Код на GitHub с README  
- [ ] Ссылка на задеплоенный контракт

### Функциональные (по проекту)

- [ ] Deposit: пользователь вносит TON в контракт через TON Connect  
- [ ] Off-chain transfer: мгновенный перевод между пользователями без on-chain tx  
- [ ] Settlement: оператор публикует батч off-chain транзакций на контракт  
- [ ] Verify: пользователь может верифицировать state root батча  
- [ ] Withdraw: вывод средств из контракта на кошелёк  
- [ ] Stats: отображение ratio off-chain/on-chain (демонстрация scaling эффекта)

### Опциональные (бонусы)

- [ ] Dispute механизм (упрощённый fraud proof)  
- [ ] Jetton вместо нативного TON  
- [ ] Автоматический settlement по таймеру или по количеству tx  
- [ ] TON Sites landing page  
- [ ] Визуализация: диаграмма батча (какие tx вошли, state root до/после)

---

## 10\. Технологический стек

| Компонент | Технология | Версия |
| :---- | :---- | :---- |
| Smart Contract | Tact (или FunC) | Tact 1.x |
| Contract Testing | Jest \+ @ton/sandbox | latest |
| Contract Deploy | Blueprint | latest |
| Backend | Python \+ FastAPI | 3.11+ / 0.110+ |
| Database | SQLite \+ aiosqlite | 3 |
| Frontend | React \+ TypeScript \+ Vite | 18 / 5.x / 5.x |
| Wallet Connect | @tonconnect/ui-react | 2.x |
| TON SDK | @ton/ton \+ @ton/core | 13.x / 0.56.x |
| Telegram SDK | @telegram-apps/sdk-react | 2.x |
| Hosting (frontend) | Vercel / Netlify / GitHub Pages | — |
| Hosting (backend) | Railway / Render / VPS | — |
| Network | TON Testnet | — |

---

## 11\. Структура репозитория

mini-rollup/

├── README.md                 \# Описание проекта, как запустить

├── contracts/

│   ├── mini\_rollup.tact      \# Смарт-контракт

│   ├── tests/

│   │   └── MiniRollup.spec.ts

│   └── scripts/

│       └── deploy.ts

├── backend/

│   ├── main.py

│   ├── models.py

│   ├── state.py

│   ├── batch.py

│   ├── ton\_client.py

│   ├── database.py

│   ├── tests/

│   │   └── test\_api.py

│   └── requirements.txt

├── frontend/

│   ├── src/

│   │   ├── App.tsx

│   │   ├── pages/

│   │   ├── components/

│   │   ├── hooks/

│   │   └── utils/

│   ├── public/

│   │   └── tonconnect-manifest.json

│   ├── package.json

│   └── vite.config.ts

└── docs/

    ├── architecture.md       \# Архитектура с диаграммами

    ├── l2\_context.md          \# Контекст L2 Ethereum для доклада

    └── demo\_script.md         \# Сценарий демонстрации

---

## 12\. Связь с темой доклада

Проект демонстрирует **ключевые концепции Layer 2**, разобранные в докладе:

| Концепция из доклада | Реализация в проекте |
| :---- | :---- |
| Off-chain execution | Off-chain transfers через backend API |
| Sequencer (секвенсор) | Backend сервер \= централизованный оператор |
| Batching | Множество off-chain tx → 1 on-chain settlement |
| On-chain settlement | SettleBatch message → smart contract на TON |
| State root | SHA-256 хеш балансов, хранится on-chain |
| Data availability | GET /api/batch/{id} — все данные доступны для верификации |
| Fraud proof (упрощ.) | Dispute message если state root не совпадает |
| Challenge window | disputeWindow в контракте (1 час для демо) |
| Экономия gas | Stats: 23 off-chain tx / 1 on-chain \= 23x scaling |
| Трилемма | Демо: L1 (TON) \= безопасность, L2 (backend) \= масштабируемость |

При защите проекта можно показать: «Вот 23 транзакции, которые пользователи совершили бесплатно и мгновенно. Они все зафиксированы в одной on-chain транзакции. Это и есть принцип работы rollup — off-chain execution с on-chain settlement.»  

---

## 13. Реализация: статус и чеклист задач

### Фаза 1 — Смарт-контракт

- [x] Написать `contracts/mini_rollup.tact` (Deposit, SettleBatch, Dispute, Withdraw, ResolveDispute)
- [x] Написать обёртку `wrappers/MiniRollup.ts` для TypeScript-интеграции
- [x] Написать тесты `tests/MiniRollup.spec.ts` — 7 сценариев покрытия
- [x] Написать скрипт деплоя `scripts/deploy.ts`
- [ ] Задеплоить контракт на TON Testnet → сохранить адрес в `.env`

### Фаза 2 — Backend

- [x] `database.py` — инициализация SQLite (users, transactions, batches, withdrawals)
- [x] `models.py` — Pydantic v2 схемы запросов/ответов
- [x] `auth.py` — верификация Ed25519-подписей через PyNaCl
- [x] `state.py` — менеджер off-chain состояния (балансы, nonce, state root)
- [x] `batch.py` — формирование батча и вызов on-chain settlement
- [x] `ton_client.py` — взаимодействие с TON через TonCenter API
- [x] `main.py` — FastAPI с 10 эндпоинтами + CORS
- [x] `tests/test_api.py` — pytest покрытие основных эндпоинтов
- [ ] Развернуть backend на Railway/Render → обновить `VITE_API_URL`

### Фаза 3 — Frontend

- [x] `hooks/useTelegram.ts` — инициализация Telegram WebApp SDK
- [x] `hooks/useApi.ts` — React Query обёртки над backend API
- [x] `hooks/useContract.ts` — взаимодействие с TON контрактом через TON Connect
- [x] `utils/format.ts` — форматирование TON сумм
- [x] `utils/verify.ts` — верификация state root на клиенте
- [x] `components/WalletButton.tsx` — кнопка TON Connect
- [x] `components/BalanceCard.tsx` — карточка баланса
- [x] `components/TxList.tsx` — список транзакций
- [x] `components/BatchCard.tsx` — карточка батча
- [x] `pages/HomePage.tsx` — главная: балансы, переводы
- [x] `pages/DepositPage.tsx` — депозит через TON Connect
- [x] `pages/TransferPage.tsx` — off-chain перевод с подписью
- [x] `pages/WithdrawPage.tsx` — запрос вывода
- [x] `pages/BatchesPage.tsx` — список батчей + verify
- [x] `pages/StatsPage.tsx` — статистика scaling
- [ ] Развернуть на Vercel/Netlify → настроить Mini App в BotFather

### Фаза 4 — Инфраструктура

- [x] `docker-compose.yml` — оркестрация backend + frontend для локальной разработки
- [x] `README.md` — полная документация: установка, запуск, деплой
- [x] `docs/architecture.md` — архитектура с диаграммами
- [x] `docs/demo_script.md` — сценарий демонстрации
- [x] `docs/l2_context.md` — контекст Layer 2 для доклада
- [ ] Настроить ngrok для локального Telegram Mini App тестирования
- [ ] Финальное end-to-end тестирование по чеклисту из раздела 8

---

## 14. Дополнительные технические замечания

### Криптография и безопасность

- **Подписи**: Каждый off-chain перевод подписывается Ed25519 ключом отправителя.  
  Frontend генерирует keypair при первом запуске и сохраняет в `localStorage`.  
  Публичный ключ регистрируется на backend при подключении кошелька.
- **Nonce**: Каждый пользователь имеет монотонно возрастающий nonce, предотвращающий replay-атаки.
- **State Root**: `SHA-256(JSON.stringify(sorted_balances))` — детерминированный хеш.  
  Верификация выполняется **на стороне клиента** без доверия к серверу.
- **Dispute Window**: 1 час для демо (vs 7 дней в реальном Optimistic Rollup).

### Упрощения и их причины

| Упрощение | Причина | Как улучшить в prod |
| :---- | :---- | :---- |
| Централизованный оператор | Простота демо | PoS-консенсус между операторами |
| SHA-256 state root | Не нужны Merkle proofs | Merkle Patricia Tree |
| Подпись не верифицируется on-chain | Сложность Tact | Верификация подписей в контракте |
| SQLite | Курсовой проект | PostgreSQL + Redis |
| Keypair в localStorage | Простота UX | HSM / secure enclave |

### Docker-запуск (альтернатива ручной установке)

```bash
# Клонировать репозиторий
git clone <repo_url> && cd mini-rollup

# Запустить всю систему
docker compose up --build

# Backend: http://localhost:8000
# Frontend: http://localhost:5173
```

### CI/CD (GitHub Actions)

Предлагаемый pipeline:
1. `test-contract` — `npx blueprint test`
2. `test-backend` — `pytest backend/tests/`
3. `deploy-backend` — push to Railway (on merge to main)
4. `deploy-frontend` — push to Vercel (on merge to main)

