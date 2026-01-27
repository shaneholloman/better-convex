---
"better-convex": patch
---

Add `ConvexAuthBridge` for `@convex-dev/auth` users (React Native):

```tsx
<ConvexProviderWithAuth client={convex} useAuth={useAuthFromConvexDev}>
  <ConvexAuthBridge>
    <App />
  </ConvexAuthBridge>
</ConvexProviderWithAuth>
```

Enables `skipUnauth` queries, `useAuth`, and conditional rendering components.
