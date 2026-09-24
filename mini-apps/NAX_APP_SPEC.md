# Nax App Package

Small HTML/JS/CSS apps can be imported into Nax without rebuilding the whole React Native app.

## Package
A ZIP should contain:

- index.html
- local JS/CSS/assets
- optional nax-manifest.json

Example manifest:

```json
{
  "name": "My Game",
  "description": "A small multiplayer game",
  "category": "Games",
  "icon": "game-controller",
  "color": "#087EFF",
  "maxPlayers": 4,
  "permissions": ["network"],
  "apiDomains": ["api.example.com"]
}
```

## Nax runtime
Inside HTML/JS, the Nax WebView exposes:

```js
Nax.getUser()
Nax.getTheme()

Nax.room.create(4)
Nax.room.join(roomId)
Nax.room.getSession()
Nax.room.onState(state => {})
Nax.room.setState(state)

Nax.api.request("https://api.example.com/data", {
  method: "GET",
  headers: {}
})
```

Apps using `Nax.api.request` must declare allowed API domains in `apiDomains`.

## Multiplayer flow
1. Open an app in Nax.
2. Use the people button to create a room and choose a friend.
3. The friend receives an app invite in Nax Chat.
4. The friend taps Join & Open.
5. Both clients open the same app session and receive realtime room state.

The same runtime works for games, collaborative tools, quizzes, utilities and other small HTML mini-apps.
