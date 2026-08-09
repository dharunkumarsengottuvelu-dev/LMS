# Production Security & Sandboxing Architecture

## Security Guarantees

1. **Isolation from LMS Core**:
   Student code is never executed directly inside the Node.js LMS main server process in production. Code execution flows through isolated Jobe VPS sandbox containers or sandboxed web `iframe` environments.

2. **Resource Limits**:
   - **CPU Time Limit**: Default 5 seconds per execution job.
   - **Memory Consumption Limit**: Default 256 MB per sandbox job via cgroups.
   - **Source Code Payload Size**: Capped at 64 KB per request.
   - **Stdin Input Size**: Capped at 32 KB per request.

3. **Web Sandbox Security**:
   - HTML, CSS, JavaScript, and React previews run inside an isolated `iframe` configured with `sandbox="allow-scripts"`.
   - Access to `window.parent`, LMS cookies, `localStorage`, or authentication tokens is strictly blocked by browser origin isolation.

4. **Error Normalization**:
   All exception objects are processed through `normalizeError()`, ensuring raw DOM `Event` objects or internal server paths never leak as `[object Event]` or expose internal paths.

5. **Rate Limiting**:
   API endpoints (`/api/code/run`, `/api/code/submit`, `/api/sql/run`) enforce IP-based rate limiting (120 requests/minute for general code execution).
