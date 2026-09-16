# benchmaxxing (wrapper)

Bare-name wrapper so `npx benchmaxxing` resolves. It carries no logic:
the `benchmaxxing` bin passes straight through to the real CLI in
`@benchmaxxing/charts`.

```sh
npx benchmaxxing --preset meridian-dawn --out launch.svg
```

Requires `@benchmaxxing/charts` (declared dependency, installed alongside
this package). Not yet published — see PUBLISH.md.
