# Page snapshot

```yaml
- generic [ref=e3]:
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
          - textbox [ref=e22]
        - generic [ref=e23]:
          - generic [ref=e24]:
            - text: Password
            - generic [ref=e25]: "*"
          - textbox [ref=e26]
        - button "Sign in" [ref=e27] [cursor=pointer]:
          - generic [ref=e29] [cursor=pointer]: Sign in
      - generic [ref=e30]:
        - generic [ref=e35]: Need help?
        - link "Forgot your password?" [ref=e37] [cursor=pointer]:
          - /url: /auth/forgot-password
  - button [ref=e39] [cursor=pointer]:
    - img [ref=e42] [cursor=pointer]
```