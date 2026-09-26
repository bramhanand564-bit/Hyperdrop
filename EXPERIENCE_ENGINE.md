# Hyperdrop Experience Engine

The old Portal/store concept has been replaced on `feat/moments-working-ui` by a unified Experience model.

## Product model

An Experience is a stateful object that can be created, published, shared to Chat, acted on inline, and opened full-screen.

Examples:
- Daily duty
- Group task
- Reward challenge
- Quiz
- Game challenge
- Media experience
- P2P transfer
- Community activity
- Custom workflow

## Creator flow

Create → choose template → customize actions and fields → configure triggers/rewards → publish → share to a private or group chat → inspect activity in Creator Dashboard.

## Runtime model

`experiences/{experienceId}`
- public definition
- schema
- creator
- status

`experiences/{experienceId}/participants/{userId}`
- user state
- status
- points
- last action
- run count

`experiences/{experienceId}/events/{eventId}`
- immutable user action/open/join event
- action id and label
- optional values
- optional chat id
- timestamp

## Chat model

Experience shares are normal Chat messages with `type: "experience"`.

A shared message carries:
- experienceId
- name
- description
- icon
- schema

Chat renders a compact card. For supported fields/actions, the user can enter data and perform an action without leaving Chat. The same Experience can still be opened full-screen.

## Creator controls

The current builder supports:
- custom actions
- primary action
- custom data fields
- required fields
- triggers
- virtual points
- optional secure HTTPS full-screen URL

The dashboard supports:
- own Experiences
- activity metrics
- recent event history
- edit
- publish/disable
- share
- delete with activity cleanup

## Security

Firestore rules isolate:
- creator-owned Experience definitions
- user-owned participant state
- immutable user event creation
- creator analytics reads

Full web Experiences accept HTTPS URLs only through the existing URL validator.

Real money rewards, ad payouts, privileged device access, and server-authoritative business logic should be implemented behind trusted backend infrastructure; the current virtual points system is not a secure cash ledger.

## Files

- `api/ExperienceAPI.js`
- `screens/ExperienceHome.js`
- `screens/ExperienceBuilder.js`
- `screens/ExperienceRuntime.js`
- `screens/ExperienceSharePicker.js`
- `screens/ExperienceDashboard.js`
- `screens/ExperienceWebViewScreen.js`
- `components/chat/MessageBubble.js`
- `messaging/MessagingService.js`
- `firestore.rules`
