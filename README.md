# Chatbox Backend

Node.js + TypeScript chat backend using PostgreSQL for users/chats and Firebase Firestore for messages, read receipts, and last seen state.

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in `DATABASE_URL` and Firebase Admin SDK values.
3. Run `npm install`.
4. Start development mode with `npm run dev`.

The server creates the required PostgreSQL tables on startup.

## API

### Create or Get 1:1 Chat

`POST /chat/create`

```json
{
  "userAId": "user-1",
  "userBId": "user-2"
}
```

Returns:

```json
{
  "chatId": "..."
}
```

### Send Message

`POST /chat/:chatId/message/send`

```json
{
  "senderId": "user-1",
  "text": "Hello"
}
```

### Get Messages

`GET /chat/:chatId/messages?limit=50`

Returns messages ordered by `createdAt` ascending.

### Mark Message Read

`POST /chat/:chatId/message/:messageId/read`

```json
{
  "userId": "user-2"
}
```

### Update Last Seen Message

`POST /chat/:chatId/lastseen`

```json
{
  "userId": "user-2",
  "messageId": "message-id"
}
```

### List User Chats

`GET /user/:userId/chats`

Returns chats from PostgreSQL with all member IDs.
