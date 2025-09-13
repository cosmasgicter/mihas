# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - link "Back to Home" [ref=e6] [cursor=pointer]:
      - /url: /
      - img [ref=e7] [cursor=pointer]
      - text: Back to Home
    - img [ref=e10]
    - heading "Sign in to your account" [level=2] [ref=e13]
    - paragraph [ref=e14]:
      - text: Or
      - link "create a new account" [ref=e15] [cursor=pointer]:
        - /url: /auth/signup
  - generic [ref=e17]:
    - generic [ref=e18]:
      - generic [ref=e19]:
        - generic [ref=e20]:
          - text: Email address
          - generic [ref=e21]: "*"
        - textbox [ref=e22]: test@example.com
      - generic [ref=e23]:
        - generic [ref=e24]:
          - text: Password
          - generic [ref=e25]: "*"
        - textbox [ref=e26]: password123
      - generic [ref=e28]: Invalid login credentials
      - button "Sign in" [ref=e29] [cursor=pointer]:
        - generic [ref=e31] [cursor=pointer]: Sign in
    - generic [ref=e32]:
      - generic [ref=e37]: Need help?
      - link "Forgot your password?" [ref=e39] [cursor=pointer]:
        - /url: /auth/forgot-password
```