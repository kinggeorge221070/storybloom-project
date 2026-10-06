# StoryBloom prototype

The current site is a front-end demo and needs no Supabase project, anon key,
environment file, or payment credentials.

- Login and registration are simulated. Any valid email can enter the demo;
  registration also asks for a display name. No password is requested or stored.
- The demo sign-in state and book drafts are stored in this browser's local
  storage. Signing out clears the demo sign-in state.
- Photo selection only displays filenames; files are not uploaded or saved.
- Checkout and payment are not connected. A displayed draft is not an order,
  and no payment can be taken.

Do not use this prototype to protect real customer information or accept real
orders. A production version needs server-backed authentication, access controls,
secure photo storage, and a verified payment integration.
