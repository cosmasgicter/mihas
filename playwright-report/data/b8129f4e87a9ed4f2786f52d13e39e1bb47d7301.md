# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - link "Back to Home" [ref=e6] [cursor=pointer]:
      - /url: /
      - img [ref=e7] [cursor=pointer]
      - text: Back to Home
    - img [ref=e11]
    - heading "Sign in to your account" [level=2] [ref=e15]
    - paragraph [ref=e16]:
      - text: Or
      - link "create a new account" [ref=e17] [cursor=pointer]:
        - /url: /auth/signup
  - generic [ref=e19]:
    - generic [ref=e20]:
      - generic [ref=e21]:
        - generic [ref=e22]:
          - text: Email address
          - generic [ref=e23]: "*"
        - textbox [ref=e24]: test@example.com
      - generic [ref=e25]:
        - generic [ref=e26]:
          - text: Password
          - generic [ref=e27]: "*"
        - textbox [ref=e28]: password123
      - generic [ref=e30]: Invalid login credentials
      - button "Sign in" [ref=e31] [cursor=pointer]:
        - generic [ref=e33] [cursor=pointer]: Sign in
    - generic [ref=e34]:
      - generic [ref=e39]: Need help?
      - link "Forgot your password?" [ref=e41] [cursor=pointer]:
        - /url: /auth/forgot-password
```