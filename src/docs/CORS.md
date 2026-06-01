# CORS — Cross-Origin Resource Sharing

## What is CORS?

Your browser has a built-in security rule called the **Same-Origin Policy**.
It says: _"You can only talk to servers that share the same origin as the page you are on."_

**Origin = protocol + domain + port**

```
http://localhost:3000   → protocol: http | domain: localhost | port: 3000
https://myapp.com       → protocol: https | domain: myapp.com | port: 443
```

Two URLs are the **same origin** only if all three parts match exactly.

| Request From            | Request To                  | Same Origin?             |
| ----------------------- | --------------------------- | ------------------------ |
| `http://localhost:3000` | `http://localhost:3000/api` | Yes                      |
| `http://localhost:3000` | `http://localhost:4000/api` | No (different port)      |
| `https://myapp.com`     | `https://api.myapp.com`     | No (different subdomain) |
| `http://myapp.com`      | `https://myapp.com`         | No (different protocol)  |

So when your React frontend on `http://localhost:3000` tries to call your Express API on `http://localhost:5000`, the browser **blocks it by default** — that's the Same-Origin Policy in action.

**CORS is the mechanism that lets your server say: "I trust this other origin, let it through."**

---

## How CORS Works (the browser handshake)

1. Browser makes a request from `http://localhost:3000` to your API
2. Browser automatically attaches an `Origin` header to the request:
   ```
   Origin: http://localhost:3000
   ```
3. Your server checks if that origin is allowed
4. If allowed, server responds with:
   ```
   Access-Control-Allow-Origin: http://localhost:3000
   ```
5. Browser sees the header and allows the response through
6. If the header is missing or mismatched, browser **blocks** the response — even if the server processed it

> The block happens in the **browser**, not the server. The server still received and processed the request.

---

## What is the `Origin` Header?

The `Origin` header is automatically added by the browser on every cross-origin request. It contains the origin of the page making the request — **not the full URL, just the origin**.

```
// Full page URL:  http://localhost:3000/dashboard?user=123
// Origin header:  http://localhost:3000
```

It is:

- A `string` when a browser makes a cross-origin request → `"http://localhost:3000"`
- `undefined` when there is no cross-origin context:
  - Direct API calls (Postman, curl)
  - Server-to-server requests
  - Same-origin requests

### Why Postman and curl have no Origin

The `Origin` header is not a property of HTTP itself — it is a **browser behaviour**.
Browsers attach it automatically to protect users from malicious websites silently making
requests on their behalf. That is the entire threat CORS is designed to stop.

Postman and curl are not browsers. They are tools operated directly by a developer.
There is no webpage, no user session, no risk of a malicious site hijacking anything.
So they simply send the raw HTTP request with whatever headers you explicitly add —
and since you never told them to add `Origin`, it is not there.

```
// curl request — no Origin header attached
curl http://localhost:5000/api/v1/rates

GET /api/v1/rates HTTP/1.1
Host: localhost:5000
User-Agent: curl/7.88.1
Accept: */*
// no Origin header → origin parameter in your callback = undefined
```

```
// Browser fetch request — Origin attached automatically
fetch("http://localhost:5000/api/v1/rates")

GET /api/v1/rates HTTP/1.1
Host: localhost:5000
Origin: http://localhost:3000   ← browser added this, you did not ask it to
Content-Type: application/json
```

This is why `if (!origin) return callback(null, true)` exists in the cors config.
It is saying: _"if there is no Origin header, this is not a browser request,
so there is no cross-origin risk — let it through."_

> This also means your API is fully accessible from Postman and curl in all environments,
> which is intentional for development and server-to-server use cases.

---

## Origin vs URL vs DNS — What is the Difference?

These three things are related but operate at completely different layers.

### The URL — the full address

A URL is the complete address you type or use in code:

```
https://myapp.com/dashboard?user=123#section2
│       │         │           │       │
│       │         │           │       └── fragment (never sent to server)
│       │         │           └────────── query string
│       │         └────────────────────── path
│       └──────────────────────────────── domain
└──────────────────────────────────────── protocol
```

### DNS — translating the domain to an IP address

When you type `https://myapp.com` in your browser, your computer does not know
where `myapp.com` lives. It asks a DNS (Domain Name System) server:
_"What IP address does myapp.com point to?"_

```
You type:  https://myapp.com
               │
               ▼
        DNS lookup:
        myapp.com → 203.0.113.42
               │
               ▼
        Browser opens a TCP connection to 203.0.113.42:443
        Sends the HTTP request with Host: myapp.com
```

DNS only resolves the **domain name to an IP**. Once that is done, DNS is out of the picture.
The browser now talks directly to that IP address over TCP.

### The Origin — a security label, not a network address

The `Origin` is not used for routing or finding the server. DNS already handled that.
The `Origin` is a **security label** that the browser stamps on the request to tell the
target server _where this request came from_.

```
URL:     https://myapp.com/dashboard?user=123
Origin:  https://myapp.com
```

It is just `protocol + domain + port` — stripped of path, query, and fragment.
The server uses it purely to decide: _"do I trust requests coming from this place?"_

### How they work together end to end

```
1. User is on https://myapp.com/dashboard (loaded in browser)

2. Page runs: fetch("https://api.myapp.com/rates")

3. Browser sees this is cross-origin (different subdomain)
   → DNS resolves api.myapp.com → 203.0.113.99
   → Browser opens TCP connection to 203.0.113.99:443
   → Browser attaches Origin: https://myapp.com to the request

4. Request arrives at your Express server
   → cors middleware reads Origin: https://myapp.com
   → checks originList → found → callback(null, true)
   → server responds with Access-Control-Allow-Origin: https://myapp.com

5. Browser reads the response header
   → origin matches → allows your JS code to read the response
```

### Key distinction

|               | DNS                   | URL                           | Origin                              |
| ------------- | --------------------- | ----------------------------- | ----------------------------------- |
| Purpose       | Find the server IP    | Full resource address         | Security label on the request       |
| Used by       | OS / network layer    | Browser / HTTP client         | Browser + server CORS check         |
| Contains      | domain → IP mapping   | protocol, domain, path, query | protocol + domain + port only       |
| When resolved | Before TCP connection | When making the request       | Attached by browser to HTTP request |

DNS gets you to the right server. The URL tells the server what resource you want.
The Origin tells the server where the request came from so it can decide whether to trust it.

---

## CORS in This Project

```ts
const originList = ALLOWED_ORIGINS?.split(",") ?? [];
// ALLOWED_ORIGINS env var = "http://localhost:3000,https://myapp.com"
// originList = ["http://localhost:3000", "https://myapp.com"]

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      // No Origin header = not a browser cross-origin request = allow

      if (originList.includes(origin)) {
        return callback(null, true);
        // Origin is in the allowlist = allow
      }

      return callback(new Error("Not allowed by CORS"));
      // Origin is NOT in the allowlist = block
    },
    credentials: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
```

### Why a callback instead of a static string?

A static `origin: "*"` allows every origin — fine for public APIs, but insecure when `credentials: true` is set (cookies, auth headers). The browser actually **refuses** `credentials: true` with `origin: "*"`.

The callback approach lets you dynamically check each request's origin against your allowlist.

### The `callback` signature: `(error, allow)`

| Call                       | Meaning                     |
| -------------------------- | --------------------------- |
| `callback(null, true)`     | No error, allow the request |
| `callback(new Error(...))` | Reject the request          |

---

## The `credentials: true` Option

By default, browsers strip cookies and `Authorization` headers from cross-origin requests.
Setting `credentials: true` tells the browser to include them.

Required when your API uses:

- Session cookies
- JWT tokens in `Authorization` header
- Any auth mechanism tied to the browser

> When `credentials: true`, you **must** use a specific origin (not `"*"`), which is exactly why the allowlist callback pattern is used here.

---

## The Full Request Flow

```
Browser on http://localhost:3000 calls GET http://localhost:5000/api/v1/rates

  1. Browser attaches → Origin: "http://localhost:3000"
  2. Server receives request
  3. cors middleware runs the origin callback:
       origin = "http://localhost:3000"  → truthy, skip !origin check
       originList.includes("http://localhost:3000") → true
       callback(null, true) → allowed
  4. Server responds with:
       Access-Control-Allow-Origin: http://localhost:3000
       Access-Control-Allow-Credentials: true
  5. Browser sees the headers → allows the response through to your frontend
```

```
Browser on http://evil.com calls GET http://localhost:5000/api/v1/rates

  1. Browser attaches → Origin: "http://evil.com"
  2. cors middleware runs:
       originList.includes("http://evil.com") → false
       callback(new Error("Not allowed by CORS")) → blocked
  3. Browser receives no Access-Control-Allow-Origin header → blocks the response
```

---

## Environment Variable Setup

In your `.env.development.local`:

```env
ALLOWED_ORIGINS=http://localhost:3000,https://myapp.com
```

Comma-separated, no spaces. The `split(',')` in the code turns this into an array at runtime.
